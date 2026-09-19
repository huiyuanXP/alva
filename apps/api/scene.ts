import type { ProjectData } from '../../packages/contracts/index.js';
import { HttpError } from './store.js';
/** Update sidecar geometry from the committed scene, never from target dimensions. */
export function syncRoomGeometry(project:ProjectData):void {
  for(const room of project.rooms){
    const floor=project.scene.floors.find(f=>f.id===room.floor_id);
    const walls=floor?.walls.filter(w=>room.wall_ids.includes(w.id));
    if(!walls||walls.length!==room.wall_ids.length)throw new HttpError(400,'Week 1 暂不支持删除或重建房间边界；请重新载入场景后再保存。');
    const points=walls.flatMap(w=>[w.start,w.end]);
    const x=Math.min(...points.map(p=>p.x)),y=Math.min(...points.map(p=>p.y));
    const width=Math.max(...points.map(p=>p.x))-x,depth=Math.max(...points.map(p=>p.y))-y;
    if(width<=0||depth<=0)throw new HttpError(400,'房间几何已退化，无法保存。');
    room.bounds={x,y,width,depth};room.geometry_cm={width,depth,height:Math.max(...walls.map(w=>w.height))};
  }
}
