import {randomUUID} from 'node:crypto';
import {distance,pointInPolygon,reject,type SceneData,type XY,type Zone} from './model.js';

type BoundaryHit={edge:number;t:number;point:XY;distance:number};
const EPS=.015;
const area=(poly:XY[])=>Math.abs(poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p.x*q.y-q.x*p.y},0)/2);
const same=(a:XY,b:XY)=>distance(a,b)<EPS;
function projectPoint(p:XY,a:XY,b:XY){const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;if(!l2)return {point:{...a},t:0,distance:distance(p,a)};const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l2)),point={x:a.x+t*dx,y:a.y+t*dy};return {point,t,distance:distance(p,point)}}
function snapBoundary(point:XY,polygon:XY[],max=.45):BoundaryHit|null{let best:BoundaryHit|null=null;for(let i=0;i<polygon.length;i++){const hit=projectPoint(point,polygon[i],polygon[(i+1)%polygon.length]);if(hit.distance<=max&&(!best||hit.distance<best.distance))best={edge:i,...hit}}return best}
function boundaryPath(poly:XY[],start:BoundaryHit,end:BoundaryHit){const n=poly.length,result:XY[]=[start.point];if(start.edge===end.edge&&start.t<=end.t){if(!same(start.point,end.point))result.push(end.point);return result}let edge=start.edge;for(let guard=0;guard<=n;guard++){const vertex=poly[(edge+1)%n];if(!same(result.at(-1)!,vertex))result.push(vertex);edge=(edge+1)%n;if(edge===end.edge){if(!same(result.at(-1)!,end.point))result.push(end.point);break}}return result}
function sampleInside(a:XY,b:XY,poly:XY[]){for(const t of [.15,.3,.5,.7,.85]){const p={x:a.x+(b.x-a.x)*t,y:a.y+(b.y-a.y)*t};if(!pointInPolygon(p,poly))return false}return true}
export function divideRoomByVirtualLine(scene:SceneData,a:XY,b:XY,index=1):Zone[]{
 if(distance(a,b)<.25)reject('分区线太短，请拉开两个端点');
 const candidates=scene.rooms.map(room=>({room,ha:snapBoundary(a,room.polygon),hb:snapBoundary(b,room.polygon)})).filter(x=>x.ha&&x.hb&&sampleInside(x.ha!.point,x.hb!.point,x.room.polygon));
 if(!candidates.length)reject('分区线两端需要落在同一个房间边界上，并穿过房间内部');
 const {room,ha,hb}=candidates.sort((x,y)=>(x.ha!.distance+x.hb!.distance)-(y.ha!.distance+y.hb!.distance))[0];
 if(same(ha!.point,hb!.point))reject('分区线两个端点不能重合');
 const first=boundaryPath(room.polygon,ha!,hb!),second=boundaryPath(room.polygon,hb!,ha!);
 if(first.length<3||second.length<3||area(first)<.15||area(second)<.15)reject('这条分区线没有形成两个有效区域，请调整端点');
 const now=new Date().toISOString(),boundary={kind:'virtual' as const,a:ha!.point,b:hb!.point};
 return [
  {id:randomUUID(),roomId:room.id,name:`${room.name} ${index}区`,polygon:first,boundary,source:'divider',createdAt:now},
  {id:randomUUID(),roomId:room.id,name:`${room.name} ${index+1}区`,polygon:second,boundary,source:'divider',createdAt:now},
 ];
}

type AxisWall={id:string;axis:'h'|'v';fixed:number;lo:number;hi:number};
function axisWalls(scene:SceneData):AxisWall[]{const tan=Math.tan(10*Math.PI/180);const result:AxisWall[]=[];for(const w of scene.walls){const dx=w.b.x-w.a.x,dy=w.b.y-w.a.y;if(Math.abs(dy)<=Math.abs(dx)*tan)result.push({id:w.id,axis:'h',fixed:(w.a.y+w.b.y)/2,lo:Math.min(w.a.x,w.b.x),hi:Math.max(w.a.x,w.b.x)});else if(Math.abs(dx)<=Math.abs(dy)*tan)result.push({id:w.id,axis:'v',fixed:(w.a.x+w.b.x)/2,lo:Math.min(w.a.y,w.b.y),hi:Math.max(w.a.y,w.b.y)})}return result}
function contains(v:number,lo:number,hi:number,t=.18){return v>=lo-t&&v<=hi+t}
function normalizedUCandidates(walls:AxisWall[],point:XY){const vs=walls.filter(w=>w.axis==='v'),hs=walls.filter(w=>w.axis==='h'),out:{polygon:XY[];boundary:{a:XY;b:XY};score:number}[]=[];for(let i=0;i<vs.length;i++)for(let j=i+1;j<vs.length;j++){const left=vs[i].fixed<vs[j].fixed?vs[i]:vs[j],right=left===vs[i]?vs[j]:vs[i];if(!(left.fixed<point.x&&point.x<right.fixed)||right.fixed-left.fixed<.4)continue;for(const base of hs){if(!contains(left.fixed,base.lo,base.hi,.22)||!contains(right.fixed,base.lo,base.hi,.22)||!contains(base.fixed,left.lo,left.hi,.22)||!contains(base.fixed,right.lo,right.hi,.22))continue;const topBase=base.fixed<point.y;if(topBase){const y1=left.hi,y2=right.hi;if(y1<=point.y||y2<=point.y||Math.abs(y1-y2)>.35)continue;const open=(y1+y2)/2,poly=[{x:left.fixed,y:base.fixed},{x:right.fixed,y:base.fixed},{x:right.fixed,y:open},{x:left.fixed,y:open}];out.push({polygon:poly,boundary:{a:poly[3],b:poly[2]},score:(right.fixed-left.fixed)*(open-base.fixed)})}else{const y1=left.lo,y2=right.lo;if(y1>=point.y||y2>=point.y||Math.abs(y1-y2)>.35)continue;const open=(y1+y2)/2,poly=[{x:left.fixed,y:open},{x:right.fixed,y:open},{x:right.fixed,y:base.fixed},{x:left.fixed,y:base.fixed}];out.push({polygon:poly,boundary:{a:poly[0],b:poly[1]},score:(right.fixed-left.fixed)*(base.fixed-open)})}}}return out}
function transposeWall(w:AxisWall):AxisWall{return {id:w.id,axis:w.axis==='h'?'v':'h',fixed:w.fixed,lo:w.lo,hi:w.hi}}
function transposePoint(p:XY):XY{return{x:p.y,y:p.x}}
function validRect(poly:XY[],room:SceneData['rooms'][number]){const c={x:poly.reduce((s,p)=>s+p.x,0)/poly.length,y:poly.reduce((s,p)=>s+p.y,0)/poly.length};if(!pointInPolygon(c,room.polygon))return false;return poly.every(p=>{const q={x:p.x*.98+c.x*.02,y:p.y*.98+c.y*.02};return pointInPolygon(q,room.polygon)})}
function boundaryCovered(scene:SceneData,boundary:{a:XY;b:XY}){return scene.walls.some(w=>projectPoint(boundary.a,w.a,w.b).distance<.12&&projectPoint(boundary.b,w.a,w.b).distance<.12)}
export function zoneFromThreeWalls(scene:SceneData,point:XY,index=1):Zone{
 const room=scene.rooms.filter(r=>pointInPolygon(point,r.polygon)).sort((a,b)=>area(a.polygon)-area(b.polygon))[0];if(!room)reject('请在一个房间内部双击创建区域');
 const walls=axisWalls(scene),direct=normalizedUCandidates(walls,point),swapped=normalizedUCandidates(walls.map(transposeWall),transposePoint(point)).map(c=>({polygon:c.polygon.map(transposePoint),boundary:{a:transposePoint(c.boundary.a),b:transposePoint(c.boundary.b)},score:c.score}));
 const candidate=[...direct,...swapped].filter(c=>validRect(c.polygon,room)&&!boundaryCovered(scene,c.boundary)).sort((a,b)=>a.score-b.score)[0];if(!candidate)reject('这里没有识别到由三面近似直角墙围成的矩形区域');
 return {id:randomUUID(),roomId:room.id,name:`${room.name} 子区域 ${index}`,polygon:candidate.polygon,boundary:{kind:'virtual',...candidate.boundary},source:'three-wall',createdAt:new Date().toISOString()};
}
