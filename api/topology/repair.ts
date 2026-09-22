import {createHash,randomUUID} from 'node:crypto';
import {DomainError,Scene,validateScene,distance,type SceneData,type XY} from '../model.js';
import {describeWall} from './validate.js';
import {validateOpenings} from './calibration.js';
import {syncRoomsToWalls} from './rooms-from-walls.js';

export type TopologyRepairOption={id:string;label:string;description:string;enabled:boolean;disabledReason?:string};
export type TopologyRepairIssue={id:string;kind:'t-junction'|'duplicate-wall'|'crossing-walls';title:string;reason:string;suggestions:string[];technical:string;wallIds:string[];location:XY;options:TopologyRepairOption[]};

const EPS=1e-7,NEAR=.01;
const orientation=(a:XY,b:XY,c:XY)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
const between=(a:number,b:number,c:number)=>c>=Math.min(a,b)-EPS&&c<=Math.max(a,b)+EPS;
const onSegment=(a:XY,b:XY,p:XY)=>Math.abs(orientation(a,b,p))<EPS&&between(a.x,b.x,p.x)&&between(a.y,b.y,p.y);
const properCross=(a:XY,b:XY,c:XY,d:XY)=>orientation(a,b,c)*orientation(a,b,d)<0&&orientation(c,d,a)*orientation(c,d,b)<0;
const same=(a:XY,b:XY)=>distance(a,b)<NEAR;
const sameWall=(a:XY,b:XY,c:XY,d:XY)=>(same(a,c)&&same(b,d))||(same(a,d)&&same(b,c));
const pointKey=(p:XY)=>`${p.x.toFixed(6)},${p.y.toFixed(6)}`;
const issueId=(kind:string,walls:string[],point:XY)=>createHash('sha256').update(JSON.stringify([kind,[...walls].sort(),pointKey(point)])).digest('hex').slice(0,20);
const midpoint=(a:XY,b:XY)=>({x:(a.x+b.x)/2,y:(a.y+b.y)/2});
function lineIntersection(a:XY,b:XY,c:XY,d:XY):XY{const x1=a.x,y1=a.y,x2=b.x,y2=b.y,x3=c.x,y3=c.y,x4=d.x,y4=d.y,den=(x1-x2)*(y3-y4)-(y1-y2)*(x3-x4);if(Math.abs(den)<EPS)return midpoint(a,b);return {x:((x1*y2-y1*x2)*(x3-x4)-(x1-x2)*(x3*y4-y3*x4))/den,y:((x1*y2-y1*x2)*(y3-y4)-(y1-y2)*(x3*y4-y3*x4))/den}}
function removable(scene:SceneData,wallId:string){const refs=scene.openings.filter(o=>o.wallId===wallId);return {enabled:refs.length===0,reason:refs.length?`该墙仍关联 ${refs.length} 个门窗，请先核对门窗后再删除。`:undefined}}

export function firstTopologyRepairIssue(raw:unknown):TopologyRepairIssue|null{
 const parsed=Scene.safeParse(raw);if(!parsed.success)return null;const scene=parsed.data;
 for(let i=0;i<scene.walls.length;i++)for(let j=i+1;j<scene.walls.length;j++){
  const a=scene.walls[i],b=scene.walls[j],aName=describeWall(scene,a),bName=describeWall(scene,b);
  if(sameWall(a.a,a.b,b.a,b.b)){const p=midpoint(a.a,a.b),ra=removable(scene,a.id),rb=removable(scene,b.id);return {id:issueId('duplicate-wall',[a.id,b.id],p),kind:'duplicate-wall',title:`${aName} 与 ${bName} 重复`,reason:'识图把同一段墙生成了两次。',suggestions:['对照原图保留正确的一段墙，删除另一段。'],technical:`${a.id} / ${b.id}`,wallIds:[a.id,b.id],location:p,options:[{id:'remove-a',label:`删除 ${aName}`,description:'保留另一段重复墙。',enabled:ra.enabled,disabledReason:ra.reason},{id:'remove-b',label:`删除 ${bName}`,description:'保留另一段重复墙。',enabled:rb.enabled,disabledReason:rb.reason}]}}
  if(properCross(a.a,a.b,b.a,b.b)){const p=lineIntersection(a.a,a.b,b.a,b.b),ra=removable(scene,a.id),rb=removable(scene,b.id);return {id:issueId('crossing-walls',[a.id,b.id],p),kind:'crossing-walls',title:`${aName} 与 ${bName} 在中部交叉`,reason:'两面墙几何上穿过彼此，但交点没有成为共享拓扑节点。',suggestions:['如果原图确实在此相接，需要把两面墙都在交点处分段。','如果其中一面墙是误识别，可删除误识别墙。'],technical:`${a.id} / ${b.id}`,wallIds:[a.id,b.id],location:p,options:[{id:'split-both',label:'按交叉节点处理：两面墙都在交点分段',description:'后台会把两面墙都切开并建立共同节点。',enabled:true},{id:'remove-a',label:`删除 ${aName}`,description:'仅当原图确认该墙是误识别时选择。',enabled:ra.enabled,disabledReason:ra.reason},{id:'remove-b',label:`删除 ${bName}`,description:'仅当原图确认该墙是误识别时选择。',enabled:rb.enabled,disabledReason:rb.reason}]}}
  for(const [host,guest] of [[a,b],[b,a]] as const)for(const [end,p] of [['a',guest.a],['b',guest.b]] as const)if(onSegment(host.a,host.b,p)&&!same(p,host.a)&&!same(p,host.b)){
   const hostName=describeWall(scene,host),guestName=describeWall(scene,guest),remove=removable(scene,guest.id);return {id:issueId('t-junction',[host.id,guest.id],p),kind:'t-junction',title:`${guestName} 接到了 ${hostName} 的中间`,reason:'几何上已经接触，但主墙仍是一整段，因此这个 T 型交接处没有共享拓扑节点。',suggestions:[`若原图确实为 T 型连接，把 ${hostName} 在交点处分段。`,`若这里其实是墙角，把 ${guestName} 的末端吸附到 ${hostName} 最近的端点。`,'若支墙属于误识别，删除该墙。'],technical:`${guest.id} / ${host.id}`,wallIds:[guest.id,host.id],location:{...p},options:[{id:`split-host:${host.id}:${guest.id}:${end}`,label:`按 T 型连接修复：分段 ${hostName}`,description:'推荐用于原图确实是 T 型墙交接的情况。后台会在当前交点精确分段，并迁移可安全迁移的门窗引用。',enabled:true},{id:`snap-guest:${host.id}:${guest.id}:${end}`,label:`按墙角修复：把 ${guestName} 吸附到最近墙端点`,description:'仅当原图显示这里应当是墙角，而不是 T 型交接时选择。',enabled:true},{id:`remove-guest:${guest.id}`,label:`删除 ${guestName}`,description:'仅当对照原图确认这面墙是误识别时选择。',enabled:remove.enabled,disabledReason:remove.reason}]}
  }
 }
 return null
}

function near(a:XY,b:XY){return distance(a,b)<NEAR}
function insertRoomPoint(scene:SceneData,a:XY,b:XY,p:XY){for(const room of scene.rooms)for(let i=0;i<room.polygon.length;i++){const x=room.polygon[i],y=room.polygon[(i+1)%room.polygon.length];if(((near(x,a)&&near(y,b))||(near(x,b)&&near(y,a)))&&!near(x,p)&&!near(y,p)){room.polygon.splice(i+1,0,{...p});break}}}
function moveConnected(scene:SceneData,from:XY,to:XY){for(const wall of scene.walls)for(const end of ['a','b'] as const)if(near(wall[end],from))wall[end]={...to};for(const room of scene.rooms)for(const p of room.polygon)if(near(p,from)){p.x=to.x;p.y=to.y}}
export function splitWallAt(scene:SceneData,wallId:string,p:XY){const wall=scene.walls.find(w=>w.id===wallId);if(!wall)throw new DomainError(409,'待修复墙已不存在，请重新检查拓扑');if(near(p,wall.a)||near(p,wall.b))return;
 const oldA={...wall.a},oldB={...wall.b},len=distance(oldA,oldB),splitDist=distance(oldA,p);if(splitDist<NEAR||len-splitDist<NEAR)throw new DomainError(422,'分段点距离墙端点过近，请改用“按墙角修复”。');
 const refs=scene.openings.filter(o=>o.wallId===wallId);for(const o of refs){const center=o.offset*len,start=center-o.width/2,end=center+o.width/2;if(start<splitDist-.01&&end>splitDist+.01)throw new DomainError(422,`无法自动分段：${describeWall(scene,wall)} 的交点处跨有门窗。请先调整或确认门窗，再执行分段。`)}
 const newId=`wall-${randomUUID()}`,second={...wall,id:newId,a:{...p},b:oldB,evidence:[...wall.evidence,`topology:auto-split:${wall.id}`]};wall.b={...p};wall.evidence=[...new Set([...wall.evidence,`topology:auto-split:${wall.id}`])];scene.walls.push(second);insertRoomPoint(scene,oldA,oldB,p);
 for(const o of refs){const center=o.offset*len;if(center<=splitDist){o.offset=center/splitDist}else{o.wallId=newId;o.offset=(center-splitDist)/(len-splitDist)}}
}
function removeWall(scene:SceneData,wallId:string){if(scene.openings.some(o=>o.wallId===wallId))throw new DomainError(422,'该墙仍有关联门窗，不能自动删除；请先核对门窗。');const i=scene.walls.findIndex(w=>w.id===wallId);if(i<0)throw new DomainError(409,'待删除墙已不存在，请重新检查拓扑');scene.walls.splice(i,1)}



function closestPointOnSegment(p:XY,a:XY,b:XY){const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;if(!l2)return {point:{...a},distance:distance(p,a),t:0};const t=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l2)),point={x:a.x+t*dx,y:a.y+t*dy};return {point,distance:distance(p,point),t}}
export function snapWallPoint(scene:SceneData,p:XY,maxDistance=.35){let endpointBest:{point:XY;distance:number;wallId?:string;kind:'endpoint'}|null=null;for(const wall of scene.walls)for(const endpoint of [wall.a,wall.b]){const d=distance(p,endpoint);if(d<=maxDistance&&(!endpointBest||d<endpointBest.distance))endpointBest={point:{...endpoint},distance:d,wallId:wall.id,kind:'endpoint'}}if(endpointBest&&endpointBest.distance<=Math.min(.22,maxDistance))return endpointBest;let best:{point:XY;distance:number;wallId?:string;kind:'endpoint'|'wall'|'free'}=endpointBest||{point:{...p},distance:maxDistance,kind:'free'};for(const wall of scene.walls){const hit=closestPointOnSegment(p,wall.a,wall.b);if(hit.distance<best.distance)best={point:hit.point,distance:hit.distance,wallId:wall.id,kind:hit.t<.001||hit.t>.999?'endpoint':'wall'}}return best}
export function addWallFromClicks(input:SceneData,aClick:XY,bClick:XY){const scene=structuredClone(input),aSnap=snapWallPoint(scene,aClick),bSnap=snapWallPoint(scene,bClick);if(distance(aSnap.point,bSnap.point)<.08)throw new DomainError(422,'新墙起点和终点太近，请在平面图上重新选择两个位置。');for(const snap of [aSnap,bSnap])if(snap.kind==='wall'){const host=scene.walls.find(w=>onSegment(w.a,w.b,snap.point)&&!same(snap.point,w.a)&&!same(snap.point,w.b));if(host)splitWallAt(scene,host.id,snap.point)}const wall={id:`wall-${randomUUID()}`,a:{...aSnap.point},b:{...bSnap.point},thickness:.15,height:2.8,structural:'unknown' as const,evidence:['topology:draw-on-canvas']};scene.walls.push(wall);syncRoomsToWalls(scene);const normalized=validateOpenings(validateScene(scene));normalized.calibration=null;const issue=firstTopologyRepairIssue(normalized);if(issue&&issue.wallIds.includes(wall.id))throw new DomainError(422,`新画的墙会产生新的拓扑问题：${issue.title}。请调整起点或终点后再试。`);return {scene:normalized,wallId:wall.id,aSnap,bSnap,description:`业主在平面图上补画墙线；起点${aSnap.kind==='free'?'按点击位置':'已自动吸附'}，终点${bSnap.kind==='free'?'按点击位置':'已自动吸附'}`}}

export function applyTopologyRepair(input:SceneData,issueIdValue:string,optionId:string){const current=firstTopologyRepairIssue(input);if(!current)throw new DomainError(409,'当前候选已经没有可自动处理的墙体拓扑错误。');if(current.id!==issueIdValue)throw new DomainError(409,'拓扑问题已经变化，请根据最新提示重新选择修复方案。');const scene=structuredClone(input);const parts=optionId.split(':');
 if(current.kind==='t-junction'){
  const [guestId,hostId]=current.wallIds,guest=scene.walls.find(w=>w.id===guestId),host=scene.walls.find(w=>w.id===hostId);if(!guest||!host)throw new DomainError(409,'相关墙体已经变化，请重新检查。');const p=current.location;
  if(parts[0]==='split-host'&&parts[1]===hostId){splitWallAt(scene,hostId,p)}
  else if(parts[0]==='snap-guest'&&parts[1]===hostId&&parts[2]===guestId){const end=parts[3] as 'a'|'b',target=distance(p,host.a)<=distance(p,host.b)?host.a:host.b;moveConnected(scene,guest[end],target)}
  else if(parts[0]==='remove-guest'&&parts[1]===guestId)removeWall(scene,guestId);else throw new DomainError(400,'未知或过期的修复方案。')
 }else if(current.kind==='duplicate-wall'){
  if(optionId==='remove-a')removeWall(scene,current.wallIds[0]);else if(optionId==='remove-b')removeWall(scene,current.wallIds[1]);else throw new DomainError(400,'未知或过期的修复方案。')
 }else{
  if(optionId==='split-both'){splitWallAt(scene,current.wallIds[0],current.location);splitWallAt(scene,current.wallIds[1],current.location)}else if(optionId==='remove-a')removeWall(scene,current.wallIds[0]);else if(optionId==='remove-b')removeWall(scene,current.wallIds[1]);else throw new DomainError(400,'未知或过期的修复方案。')
 }
 syncRoomsToWalls(scene);const normalized=validateOpenings(validateScene(scene));normalized.calibration=null;return {scene:normalized,next:firstTopologyRepairIssue(normalized),description:`按业主选择自动修复拓扑：${current.title} → ${current.options.find(o=>o.id===optionId)?.label||optionId}`}
}
