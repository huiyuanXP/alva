import {DomainError,Scene,validateScene,pointInPolygon,type SceneData,type XY,distance} from '../model.js';
import {validateOpenings} from './calibration.js';

export type TopologyIssue={path:string;message:string};

function orientation(a:XY,b:XY,c:XY){return (b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x)}
function between(a:number,b:number,c:number){return c>=Math.min(a,b)-1e-7&&c<=Math.max(a,b)+1e-7}
function onSegment(a:XY,b:XY,p:XY){return Math.abs(orientation(a,b,p))<1e-7&&between(a.x,b.x,p.x)&&between(a.y,b.y,p.y)}
function properCross(a:XY,b:XY,c:XY,d:XY){const ab=orientation(a,b,c),ab2=orientation(a,b,d),cd=orientation(c,d,a),cd2=orientation(c,d,b);return ab*ab2<0&&cd*cd2<0}
function samePoint(a:XY,b:XY){return distance(a,b)<.01}
function sameUndirected(a:XY,b:XY,c:XY,d:XY){return (samePoint(a,c)&&samePoint(b,d))||(samePoint(a,d)&&samePoint(b,c))}
function segmentDistance(p:XY,a:XY,b:XY){const dx=b.x-a.x,dy=b.y-a.y,l2=dx*dx+dy*dy;if(!l2)return distance(p,a);const u=Math.max(0,Math.min(1,((p.x-a.x)*dx+(p.y-a.y)*dy)/l2));return distance(p,{x:a.x+u*dx,y:a.y+u*dy})}
function roomSide(room:SceneData['rooms'][number],point:XY){const xs=room.polygon.map(p=>p.x),ys=room.polygon.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys);const ranked=[['左侧',Math.abs(point.x-minX)],['右侧',Math.abs(point.x-maxX)],['上侧',Math.abs(point.y-minY)],['下侧',Math.abs(point.y-maxY)]] as const;return [...ranked].sort((a,b)=>a[1]-b[1])[0][0]}
function roomTouchesWall(room:SceneData['rooms'][number],wall:SceneData['walls'][number]){const mid={x:(wall.a.x+wall.b.x)/2,y:(wall.a.y+wall.b.y)/2};let best=Infinity;for(let i=0;i<room.polygon.length;i++)best=Math.min(best,segmentDistance(mid,room.polygon[i],room.polygon[(i+1)%room.polygon.length]));return best<.08}
function wholeArea(scene:SceneData,point:XY){const pts=scene.walls.flatMap(w=>[w.a,w.b]);if(!pts.length)return '全屋';const xs=pts.map(p=>p.x),ys=pts.map(p=>p.y),cx=(Math.min(...xs)+Math.max(...xs))/2,cy=(Math.min(...ys)+Math.max(...ys))/2;return `${point.y<cy?'上':'下'}${point.x<cx?'左':'右'}区域`}
function roomRegion(room:SceneData['rooms'][number],point:XY){const xs=room.polygon.map(p=>p.x),ys=room.polygon.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minY=Math.min(...ys),maxY=Math.max(...ys),rx=(point.x-minX)/Math.max(.001,maxX-minX),ry=(point.y-minY)/Math.max(.001,maxY-minY);if(rx<.35)return '左部';if(rx>.65)return '右部';if(ry<.35)return '上部';if(ry>.65)return '下部';return '中部'}
export function describeWall(scene:SceneData,wall:SceneData['walls'][number]){const mid={x:(wall.a.x+wall.b.x)/2,y:(wall.a.y+wall.b.y)/2},rooms=scene.rooms.filter(room=>roomTouchesWall(room,wall)).slice(0,2),direction=Math.abs(wall.b.x-wall.a.x)>=Math.abs(wall.b.y-wall.a.y)?'横向':'竖向';if(rooms.length===1)return `${rooms[0].name}${roomSide(rooms[0],mid)}墙`;if(rooms.length>=2)return `${rooms[0].name}${roomSide(rooms[0],mid)} / ${rooms[1].name}${roomSide(rooms[1],mid)}分隔墙`;const inside=scene.rooms.filter(room=>pointInPolygon(mid,room.polygon)).slice(0,2);if(inside.length===1)return `${inside[0].name}${roomRegion(inside[0],mid)}${direction}内墙`;if(inside.length>=2)return `${inside.map(room=>room.name).join(' / ')}之间${direction}内墙`;return `全屋${wholeArea(scene,mid)}${direction}墙`}
function ids(...walls:SceneData['walls'][number][]){return `技术信息（供开发排查）：${walls.map(w=>w.id).join(' / ')}`}
function tJunctionMessage(scene:SceneData,host:SceneData['walls'][number],guest:SceneData['walls'][number]){const guestName=describeWall(scene,guest),hostName=describeWall(scene,host);return `拓扑校验失败：${guestName} 的末端接到了 ${hostName} 的中间，但这里还没有建立共同连接点。\n可能原因：当前数据把这里记录成“一面连续长墙 + 一面在中途结束的墙”。几何上看起来已经接触，但拓扑图里没有共享节点；这通常来自识图时把 T 型交接处的主墙识别成了一整段。\n建议修正：① 如果原图确实是 T 型连接，把 ${hostName} 在交点处分成两段，让三段墙共用同一个连接点；② 如果这里本应是墙角，把 ${guestName} 的末端移动到 ${hostName} 的真实端点；③ 如果其中一段是误识别墙，对照原图后删除误识别墙。\n${ids(guest,host)}`}

export function validateTopology(raw:unknown):SceneData{
 let scene:SceneData;
 try{scene=Scene.parse(raw)}catch(error){throw new DomainError(422,`拓扑校验失败：当前户型数据格式不完整。\n可能原因：识图结果缺少必要的坐标或字段。\n建议修正：重新识别图纸，或先核对墙、房间和门窗字段。\n技术信息：${error instanceof Error?error.message:'坐标或字段格式无效'}`)}
 try{scene=validateOpenings(validateScene(scene))}catch(error){throw new DomainError(422,`拓扑校验失败：当前候选中存在无效几何或门窗关联。\n可能原因：门窗越出墙段、房间轮廓自交，或某些实体没有有效关联。\n建议修正：先在平面图中定位对应门窗/房间并核对原图，再调整位置、尺寸或关联墙。\n技术信息：${error instanceof Error?error.message:'候选几何无效'}`)}
 for(let i=0;i<scene.walls.length;i++){
  const a=scene.walls[i];
  for(let j=i+1;j<scene.walls.length;j++){
   const b=scene.walls[j];
   if(sameUndirected(a.a,a.b,b.a,b.b))throw new DomainError(422,`拓扑校验失败：${describeWall(scene,a)} 与 ${describeWall(scene,b)} 是重复墙段。\n可能原因：识图把同一面墙生成了两次。\n建议修正：对照原图确认后删除其中一段重复墙。\n${ids(a,b)}`)
   if(properCross(a.a,a.b,b.a,b.b))throw new DomainError(422,`拓扑校验失败：${describeWall(scene,a)} 与 ${describeWall(scene,b)} 在墙体中部发生自交/交叉，但交点没有形成连接节点。\n可能原因：识图把应当在交点分段的墙画成了两条互相穿过的完整墙。\n建议修正：如果原图确实在这里相接，把两面墙都在交点处分段并共用连接点；如果原图并不相交，移动误识别的墙端点。\n${ids(a,b)}`)
   for(const [host,guest] of [[a,b],[b,a]])for(const p of [guest.a,guest.b])if(onSegment(host.a,host.b,p)&&!samePoint(p,host.a)&&!samePoint(p,host.b))throw new DomainError(422,tJunctionMessage(scene,host,guest))
  }
 }
 for(const room of scene.rooms)for(let i=0;i<room.polygon.length;i++)if(!Number.isFinite(room.polygon[i].x)||!Number.isFinite(room.polygon[i].y))throw new DomainError(422,`拓扑校验失败：${room.name} 的第 ${i+1} 个轮廓点坐标无效。\n可能原因：编辑或识图产生了空坐标/非法数值。\n建议修正：对照原图重新拖动该轮廓点，或重新识别该区域。\n技术信息：房间 ${room.id}`)
 return scene
}
