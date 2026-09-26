import type {SceneData} from '../../../api/model.js';
import type {RoomStyle,SurfaceStyle} from '../../../packages/contracts/alva/room-style.js';
export type RoomStyles=Record<string,RoomStyle>;
export const surfaceRoughness=(style:SurfaceStyle)=>({paint:.85,plaster:.95,wood:.65,tile:.25,stone:.45,concrete:.9})[style.material];
export function wallSideStyles(scene:SceneData,styles:RoomStyles,x:number,y:number,angle:number,thickness:number){
 const inside=(x:number,y:number,p:SceneData['rooms'][number]['polygon'])=>{let hit=false;for(let i=0,j=p.length-1;i<p.length;j=i++){const a=p[i],b=p[j];if((a.y>y)!==(b.y>y)&&x<(b.x-a.x)*(y-a.y)/(b.y-a.y)+a.x)hit=!hit}return hit};
 return [1,-1].map(sign=>{const offset=sign*(thickness/2+.025),px=x-Math.sin(angle)*offset,py=y+Math.cos(angle)*offset;const room=scene.rooms.find(r=>inside(px,py,r.polygon));return room?styles[room.id]?.wall:undefined});
}
