import type {ProjectData,GeometryDiagnostic} from '../../packages/contracts/index.js';
import {getCatalogItem} from '../../vendor/openplan3d/src/lib/utils/furnitureCatalog.js';
type P={x:number;y:number};
const EPS=1; // centimetres; touching and overlap <= 1 cm do not trigger a collision
const cross=(a:P,b:P,c:P)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const same=(a:P,b:P)=>Math.hypot(a.x-b.x,a.y-b.y)<.01;
const intersects=(a:P,b:P,c:P,d:P)=>cross(a,b,c)*cross(a,b,d)<-1e-8&&cross(c,d,a)*cross(c,d,b)<-1e-8;
function inside(p:P,poly:P[]){let hit=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++) {const a=poly[j],b=poly[i];const len=Math.hypot(b.x-a.x,b.y-a.y);if(len&&Math.abs(cross(a,b,p))/len<.01&&p.x>=Math.min(a.x,b.x)-.01&&p.x<=Math.max(a.x,b.x)+.01&&p.y>=Math.min(a.y,b.y)-.01&&p.y<=Math.max(a.y,b.y)+.01)return true;if((a.y>p.y)!==(b.y>p.y)&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)hit=!hit;}return hit;}
export function polygon(walls:any[]):P[]|null{
 const finite=(p:any)=>p&&Number.isFinite(p.x)&&Number.isFinite(p.y);
 if(walls.length<3||walls.some(w=>!w||w.curvePoint||!finite(w.start)||!finite(w.end)||same(w.start,w.end)))return null;
 const unused=[...walls],first=unused.shift(),poly=[first.start,first.end];
 while(unused.length){const candidates=unused.map((w,i)=>same(w.start,poly.at(-1)!)||same(w.end,poly.at(-1)!)?i:-1).filter(i=>i>=0);if(candidates.length!==1)return null;const w=unused.splice(candidates[0],1)[0];poly.push(same(w.start,poly.at(-1)!)?w.end:w.start);}
 if(!same(poly[0],poly.at(-1)!))return null;poly.pop();
 if(poly.some((p,i)=>poly.some((q,j)=>j>i&&same(p,q))))return null;
 const area=Math.abs(poly.reduce((n,p,i)=>n+p.x*poly[(i+1)%poly.length].y-p.y*poly[(i+1)%poly.length].x,0))/2;if(!Number.isFinite(area)||area<.01)return null;
 const on=(p:P,a:P,b:P)=>Math.abs(cross(a,b,p))<1e-8&&p.x>=Math.min(a.x,b.x)&&p.x<=Math.max(a.x,b.x)&&p.y>=Math.min(a.y,b.y)&&p.y<=Math.max(a.y,b.y);
 for(let i=0;i<poly.length;i++){const a=poly[i],b=poly[(i+1)%poly.length],prev=poly[(i+poly.length-1)%poly.length];if(Math.abs(cross(prev,a,b))<1e-8&&(a.x-prev.x)*(b.x-a.x)+(a.y-prev.y)*(b.y-a.y)<0)return null;
 for(let j=i+1;j<poly.length;j++){if(j===i+1||(i===0&&j===poly.length-1))continue;const c=poly[j],d=poly[(j+1)%poly.length];if(intersects(a,b,c,d)||on(a,c,d)||on(b,c,d)||on(c,a,b)||on(d,a,b))return null;}}
 return poly;
}
function corners(o:any,w:number,d:number){const a=o.rotation*Math.PI/180,c=Math.cos(a),s=Math.sin(a);return [[-1,-1],[1,-1],[1,1],[-1,1]].map(([x,y])=>({x:o.position.x+x*w/2*c-y*d/2*s,y:o.position.y+x*w/2*s+y*d/2*c}));}
function overlap(a:P[],b:P[]){for(const poly of [a,b])for(let i=0;i<2;i++){const dx=poly[i+1].x-poly[i].x,dy=poly[i+1].y-poly[i].y,len=Math.hypot(dx,dy),axis={x:-dy/len,y:dx/len};const aa=a.map(p=>p.x*axis.x+p.y*axis.y),bb=b.map(p=>p.x*axis.x+p.y*axis.y);if(Math.min(Math.max(...aa),Math.max(...bb))-Math.max(Math.min(...aa),Math.min(...bb))<=EPS)return false;}return true;}
export function recomputeGeometry(p:ProjectData){const found:GeometryDiagnostic[]=[];const add=(rule:GeometryDiagnostic['rule'],ids:string[],detail:string)=>{ids.sort();const id=`geometry:v1:${rule}:${ids.join(':')}`;const previous=p.geometry_diagnostics?.find(d=>d.id===id);found.push({id,rule,rule_version:1,object_ids:ids,status:'active',severity:rule==='unknown'?'uncertain':'warning',evidence:detail,advice:rule==='unknown'?'补全或核对房间边界、对象尺寸及原生形状后重新检查。':'移动、缩小或移除相关家具，再保存场景重新检查。',first_version:previous?.first_version??p.version,last_version:p.version});};
for(const floor of p.scene.floors){const rooms=p.rooms.filter(r=>r.floor_id===floor.id).map(r=>({id:r.id,poly:polygon(r.wall_ids.map(id=>floor.walls.find(w=>w.id===id)))}));const boxes:any[]=[];
for(const o of floor.furniture){const def=getCatalogItem(o.catalogId);const w=(o.width??def?.width??0)*o.scale.x,d=(o.depth??def?.depth??0)*o.scale.y,h=o.height??def?.height??0;
if(!def||def.symbol||![w,d,h,o.position.x,o.position.y,o.rotation,o.elevation??0,Number((floor as any).elevation??floor.level*300)].every(Number.isFinite)||[w,d,h].some(n=>n<=0||n>100000)||o.scale.z!==1){add('unknown',[o.id],'无法判断：未知模型、尺寸或未支持的垂直缩放。');continue;}
const rect=corners(o,w,d);const matches=rooms.filter(r=>r.poly&&inside(o.position,r.poly));const explicit=(o as any).room_id;const room=explicit?rooms.find(r=>r.id===explicit):matches.length===1?matches[0]:rooms.length===1?rooms[0]:null;
if(!room?.poly)add('unknown',[o.id],'无法判断：房间未唯一绑定，或边界未闭合、弯曲、自交。');else {const poly=room.poly;const crossing=rect.some((a,i)=>poly.some((b,j)=>intersects(a,rect[(i+1)%4],b,poly[(j+1)%poly.length])));if(crossing||rect.some(a=>!inside(a,poly)))add('boundary',[o.id],`占用矩形超出房间 ${room.id} 墙中心线多边形；边界数值容差 0.01 cm。`);}
const elevation=Number((floor as any).elevation??floor.level*300)+(o.elevation??0);boxes.push({o,rect,lo:elevation,hi:elevation+h,underlay:/^(rug|round_rug|runner_rug)$/.test(o.catalogId)});}
for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i],b=boxes[j];if(a.underlay||b.underlay)continue;if(Math.min(a.hi,b.hi)-Math.max(a.lo,b.lo)>EPS&&overlap(a.rect,b.rect))add('collision',[a.o.id,b.o.id],'旋转占用包围体在所有水平 SAT 轴及垂直方向重叠均超过 1 cm；不是精确网格物理检测。');}}
const active=new Set(found.map(d=>d.id));p.geometry_diagnostics=[...found,...(p.geometry_diagnostics??[]).filter(d=>!active.has(d.id)).map(d=>d.status==='resolved'?d:{...d,status:'resolved' as const,last_version:p.version})];}
