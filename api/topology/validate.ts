import {DomainError,Scene,validateScene,type SceneData,type XY,distance} from '../model.js';

export type TopologyIssue={path:string;message:string};

function orientation(a:XY,b:XY,c:XY){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)}
function between(a:number,b:number,c:number){return c>=Math.min(a,b)-1e-7&&c<=Math.max(a,b)+1e-7}
function onSegment(a:XY,b:XY,p:XY){return Math.abs(orientation(a,b,p))<1e-7&&between(a.x,b.x,p.x)&&between(a.y,b.y,p.y)}
function properCross(a:XY,b:XY,c:XY,d:XY){const ab=orientation(a,b,c),ab2=orientation(a,b,d),cd=orientation(c,d,a),cd2=orientation(c,d,b);return ab*ab2<0&&cd*cd2<0}
function samePoint(a:XY,b:XY){return distance(a,b)<.01}
function sameUndirected(a:XY,b:XY,c:XY,d:XY){return (samePoint(a,c)&&samePoint(b,d))||(samePoint(a,d)&&samePoint(b,c))}

export function validateTopology(raw:unknown):SceneData{
 let scene:SceneData;
 try{scene=Scene.parse(raw)}catch(error){throw new DomainError(422,`拓扑校验失败：${error instanceof Error?error.message:'坐标或字段格式无效'}`)}
 try{scene=validateScene(scene)}catch(error){throw new DomainError(422,`拓扑校验失败：${error instanceof Error?error.message:'候选几何无效'}`)}
 for(let i=0;i<scene.walls.length;i++){
  const a=scene.walls[i];
  for(let j=i+1;j<scene.walls.length;j++){
   const b=scene.walls[j];
   if(sameUndirected(a.a,a.b,b.a,b.b))throw new DomainError(422,`拓扑校验失败：墙 ${a.id} 与墙 ${b.id} 重复`)
   if(properCross(a.a,a.b,b.a,b.b))throw new DomainError(422,`拓扑校验失败：墙 ${a.id} 与墙 ${b.id} 自交，请调整端点或分段`)
   for(const [label,p] of [['a',b.a],['b',b.b]] as const)if(onSegment(a.a,a.b,p)&&!samePoint(p,a.a)&&!samePoint(p,a.b))throw new DomainError(422,`拓扑校验失败：墙 ${b.id} 的 ${label} 端点落在墙 ${a.id} 中段，请连接或分段`)
  }
 }
 for(const room of scene.rooms)for(let i=0;i<room.polygon.length;i++)if(!Number.isFinite(room.polygon[i].x)||!Number.isFinite(room.polygon[i].y))throw new DomainError(422,`拓扑校验失败：房间 ${room.id} 顶点 ${i} 不是有限坐标`)
 return scene
}
