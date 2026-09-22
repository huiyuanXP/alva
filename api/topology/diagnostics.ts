import clipping,{type Polygon,type MultiPolygon} from 'polygon-clipping';
import {createHash} from 'node:crypto';
import {DomainError,Scene,pointInPolygon,type SceneData,type XY} from '../model.js';
import type {TopologyDiagnostics,TopologyWarning,TopologyWarningCode} from '../../packages/contracts/alva/topology-diagnostics.js';
import {bounds,buildPlanarGraph,dist,length,polygonArea,projection,wallFootprint} from './planar-graph.js';

export const diagnosticThresholds={connectionM:.03,minVoidM2:.15,skewDegrees:8,minWallM:.35} as const;
const angle=(w:SceneData['walls'][number])=>(Math.atan2(w.b.y-w.a.y,w.b.x-w.a.x)*180/Math.PI+180)%180;
const axisDelta=(a:number,b:number)=>Math.abs(((a-b+135)%90+90)%90-45);
const mid=(a:XY,b:XY)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});

function interiorPoint(rings:XY[][]):XY{
 // Scan vertex bands. A polygon centroid can lie inside a hole; this point cannot.
 const ys=[...new Set(rings.flat().map(p=>p.y))].sort((a,b)=>a-b);let best=0,point=rings[0][0];
 for(let k=1;k<ys.length;k++){
  const y=(ys[k-1]+ys[k])/2,xs:number[]=[];
  for(const ring of rings)for(let i=0;i<ring.length;i++){
   const a=ring[i],b=ring[(i+1)%ring.length];if((a.y>y)!==(b.y>y))xs.push(a.x+(y-a.y)*(b.x-a.x)/(b.y-a.y));
  }
  xs.sort((a,b)=>a-b);
  for(let i=1;i<xs.length;i++){
   const p={x:(xs[i-1]+xs[i])/2,y},width=xs[i]-xs[i-1];
   if(width>best&&pointInPolygon(p,rings[0])&&!rings.slice(1).some(r=>pointInPolygon(p,r))){best=width;point=p}
  }
 }
 return point;
}

function dominantAxis(walls:SceneData['walls']){
 const candidates=walls.filter(w=>length(w)>=diagnosticThresholds.minWallM);if(!candidates.length)return {angle:null,support:0};
 const total=candidates.reduce((n,w)=>n+length(w),0);
 const ranked=candidates.map(w=>({angle:angle(w)%90,support:candidates.reduce((n,s)=>n+(axisDelta(angle(s),angle(w))<=5?length(s):0),0)})).sort((a,b)=>b.support-a.support||a.angle-b.angle);
 const center=ranked[0].angle,cluster=candidates.filter(w=>axisDelta(angle(w),center)<=5);
 const x=cluster.reduce((n,w)=>n+length(w)*Math.cos(4*angle(w)*Math.PI/180),0),y=cluster.reduce((n,w)=>n+length(w)*Math.sin(4*angle(w)*Math.PI/180),0);
 return {angle:((Math.atan2(y,x)*180/Math.PI/4)%90+90)%90,support:ranked[0].support/total};
}

function selfCrossing(ring:XY[]){
 const orient=(a:XY,b:XY,c:XY)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
 for(let i=0;i<ring.length;i++)for(let j=i+2;j<ring.length;j++){
  if(i===0&&j===ring.length-1)continue;
  const a=ring[i],b=ring[(i+1)%ring.length],c=ring[j],d=ring[(j+1)%ring.length];
  if(orient(a,b,c)*orient(a,b,d)<0&&orient(c,d,a)*orient(c,d,b)<0)return true;
 }
 return false;
}

/** Derive all findings without changing the scene, calibrating, confirming or saving. */
export function analyzeTopology(raw:unknown):TopologyDiagnostics{
 const result:TopologyDiagnostics={version:'alva-topology-quality-v1',status:'empty',issues:[],checks:{internalVoid:'unavailable',orientation:'unavailable',connectivity:'unavailable'},thresholds:{...diagnosticThresholds},measurements:{enclosedAreaM2:0,undefinedAreaM2:0,wallComponents:0,dominantAngleDegrees:null,orientationSupport:0},calibrated:false,notes:[]};
 if(raw===null||raw===undefined){result.notes=['尚无户型，未执行检查。'];return result}
 const parsed=Scene.safeParse(raw);if(!parsed.success)throw new DomainError(422,'拓扑诊断无法执行：场景字段或坐标无效');
 const scene=parsed.data,entities=[...scene.walls,...scene.rooms,...scene.openings];
 if(new Set(entities.map(x=>x.id)).size!==entities.length)throw new DomainError(422,'拓扑诊断无法执行：实体ID重复');
 result.calibrated=!!scene.calibration?.confirmed;
 result.notes.push('只读告警，不自动补墙、补房间或拉直，也不授予墙体拆改许可。','门窗以关联墙的完整中心线参与边界；没有有效墙引用的开口不能充当连接。','当前合同仅支持直线墙；连续折段可提示疑似曲面，不支持的曲线字段由输入校验拒绝。');
 if(!result.calibrated)result.notes.push('尚未校准，米与平方米均为候选估算，阈值需结合尺度核对。');
 const walls=[...scene.walls].filter(w=>length(w)>.00001).sort((a,b)=>a.id.localeCompare(b.id));
 const add=(code:TopologyWarningCode,message:string,wallIds:string[],openingIds:string[],roomIds:string[],points:XY[],extra:Partial<TopologyWarning>={})=>{
  const coordinates=(extra.rings||[points]).map(r=>r.map(p=>`${p.x.toFixed(6)},${p.y.toFixed(6)}`).sort()).sort();
  const identity=JSON.stringify([code,[...wallIds].sort(),[...openingIds].sort(),[...roomIds].sort(),coordinates]);
  const id=createHash('sha256').update(identity).digest('hex').slice(0,16);
  result.issues.push({id,code,severity:'warning',message,wallIds:[...wallIds].sort(),openingIds:[...openingIds].sort(),roomIds:[...roomIds].sort(),location:points[0]||null,bounds:points.length?bounds(points):null,...extra});
 };
 for(const w of scene.walls.filter(w=>length(w)<=.00001))add('invalid_geometry','零长度墙无法参与边界与连接检查。',[w.id],[],[],[w.a],{severity:'error'});
 for(const o of scene.openings){
  const w=walls.find(w=>w.id===o.wallId);let reason='';
  if(!w)reason='孤立门窗没有有效的关联墙，无法定位或连接主体。';
  else if(o.offset*length(w)-o.width/2<-.01||o.offset*length(w)+o.width/2>length(w)+.01)reason='门窗越出关联墙段，不能作为合法连接。';
  else if(o.sill+o.height>w.height+.01)reason='门窗高度越出关联墙。';
  if(reason){
   const p=w?{x:w.a.x+(w.b.x-w.a.x)*o.offset,y:w.a.y+(w.b.y-w.a.y)*o.offset}:null;
   add('invalid_opening',reason,w?[w.id]:[],[o.id],[],p?[p]:[],{severity:'error'});
  }
 }
 if(!walls.length){result.status=result.issues.length?'partial':'empty';result.notes.push('没有有效墙体，三类检查尚不能完成。');return result}
 const graph=buildPlanarGraph(walls,diagnosticThresholds.connectionM);
 result.status='complete';result.checks.connectivity='complete';result.measurements.wallComponents=graph.components.length;
 for(const component of graph.components.slice(1)){
  const ids=component.map(w=>w.id),openings=scene.openings.filter(o=>ids.includes(o.wallId)).map(o=>o.id),points=component.flatMap(w=>[w.a,w.b]);
  add('isolated_component',`发现与主体不连通的 ${component.length} 段墙${openings.length?`及 ${openings.length} 个门窗`:''}，请核对断口和关联。`,ids,openings,[],points,{location:mid(component[0].a,component[0].b)});
 }
 const axis=dominantAxis(walls);result.measurements.dominantAngleDegrees=axis.angle;result.measurements.orientationSupport=axis.support;
 if(axis.angle!==null){
  result.checks.orientation=axis.support>=.6?'complete':'partial';
  if(axis.support<.6){result.status='partial';result.notes.push('墙体主方向不明确，倾斜提示需对照原图，不能自动判定斜墙错误。')}
  for(const w of walls){
   const a=angle(w),deviation=axisDelta(a,axis.angle);if(length(w)<diagnosticThresholds.minWallM||deviation<=diagnosticThresholds.skewDegrees)continue;
   add('unreasonable_skew',`墙偏离整屋主正交方向 ${deviation.toFixed(1)}°（阈值 ${diagnosticThresholds.skewDegrees}°），疑似不合理倾斜，请核对。`,[w.id],scene.openings.filter(o=>o.wallId===w.id).map(o=>o.id),[],[w.a,w.b],{location:mid(w.a,w.b),angleDegrees:a,deviationDegrees:deviation});
  }
  const short=walls.filter(w=>length(w)<diagnosticThresholds.minWallM);
  for(const chain of buildPlanarGraph(short,diagnosticThresholds.connectionM).components){
   if(chain.length<3||chain.reduce((n,w)=>n+length(w),0)<diagnosticThresholds.minWallM)continue;
   const off=chain.filter(w=>axisDelta(angle(w),axis.angle!)>diagnosticThresholds.skewDegrees);if(off.length<2)continue;
   const ids=chain.map(w=>w.id);
   add('unreasonable_skew','连续短折段疑似曲线或倾斜墙，整体长度超过检查阈值，请对照原图核对。',ids,scene.openings.filter(o=>ids.includes(o.wallId)).map(o=>o.id),[],chain.flatMap(w=>[w.a,w.b]));
  }
 }else{result.status='partial';result.notes.push('没有足够长的墙，不能可靠估计整屋主方向。')}
 // No artificial bounding rectangle: unbounded outside faces never become internal voids.
 if(!graph.faces.length){result.status='partial';result.checks.internalVoid='unavailable';result.notes.push('墙边界未形成闭合面，内部空洞检查不能完成；先核对缺墙或断口。')}
 else try{
  const enclosed=clipping.union(graph.faces[0],...graph.faces.slice(1));
  result.measurements.enclosedAreaM2=enclosed.reduce((n,p)=>n+polygonArea(p),0);
  const validRooms:Polygon[]=[];let roomInvalid=false;
  for(const room of scene.rooms){
   if(selfCrossing(room.polygon)){roomInvalid=true;result.status='partial';add('invalid_geometry','房间轮廓自交，未将其计作已定义空间。',[],[],[room.id],room.polygon,{severity:'error'})}
   else validRooms.push([room.polygon.map(p=>[p.x,p.y])]);
  }
  const subtract:Polygon[]=[...validRooms,...walls.map(wallFootprint)];
  const voids:MultiPolygon=subtract.length?clipping.difference(enclosed,...subtract):enclosed;
  result.checks.internalVoid=roomInvalid?'partial':'complete';
  for(const poly of voids){
   const area=polygonArea(poly);if(area<diagnosticThresholds.minVoidM2)continue;
   const rings=poly.map(r=>r.map(([x,y])=>({x,y}))),points=rings.flat();
   const related=walls.filter(w=>points.some(p=>dist(p,projection(p,w))<=w.thickness+.05)).map(w=>w.id);
   add('internal_void',`围合内部有约 ${area.toFixed(2)} m² 未定义空间，可能漏了房间、走廊或管井，请核对。`,related,scene.openings.filter(o=>related.includes(o.wallId)).map(o=>o.id),[],points,{rings,areaM2:area,location:interiorPoint(rings)});
   result.measurements.undefinedAreaM2+=area;
  }
 }catch{result.status='partial';result.checks.internalVoid='unavailable';result.notes.push('多边形运算未完成，不能声称没有内部空洞；请检查重叠或退化轮廓。')}
 for(const end of graph.dangling){
  const connectedElsewhere=walls.some(w=>!end.wallIds.includes(w.id)&&dist(end.point,projection(end.point,w))<=diagnosticThresholds.connectionM);
  if(!connectedElsewhere)add('open_boundary','墙端点未连接，可能是缺墙或未定义的开口；该处不能视作闭合边界。',end.wallIds,[],[],[end.point]);
 }
 result.issues.sort((a,b)=>a.code.localeCompare(b.code)||a.id.localeCompare(b.id));
 return result;
}
