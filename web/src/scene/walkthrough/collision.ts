import type {SceneData} from '../../../../api/model.js';
export type WalkPoint={x:number;z:number};
const clamp=(v:number,a:number,b:number)=>Math.max(a,Math.min(b,v));
export function doorPassages(scene:SceneData,wallId:string,radius=.18){
 const wall=scene.walls.find(w=>w.id===wallId);if(!wall)return [];
 const len=Math.hypot(wall.b.x-wall.a.x,wall.b.y-wall.a.y);
 return scene.openings.filter(o=>o.wallId===wallId&&o.kind==='door'&&o.sill<=.08&&o.height>=1.7&&o.width>radius*2).map(o=>({start:Math.max(0,o.offset*len-o.width/2+radius),end:Math.min(len,o.offset*len+o.width/2-radius)})).filter(x=>x.end>x.start);
}
export function canWalkAt(scene:SceneData,p:WalkPoint,radius=.18){
 for(const wall of scene.walls){
  const dx=wall.b.x-wall.a.x,dz=wall.b.y-wall.a.y,len=Math.hypot(dx,dz);if(len<1e-6)continue;
  const ux=dx/len,uz=dz/len,rx=p.x-wall.a.x,rz=p.z-wall.a.y,t=clamp(rx*ux+rz*uz,0,len),cx=wall.a.x+ux*t,cz=wall.a.y+uz*t,dist=Math.hypot(p.x-cx,p.z-cz);
  if(dist<wall.thickness/2+radius&&!doorPassages(scene,wall.id,radius).some(g=>t>=g.start&&t<=g.end))return false;
 }
 for(const item of scene.items){if(item.height<=.15)continue;const a=item.rotation*Math.PI/180,dx=p.x-item.x,dz=p.z-item.y,lx=dx*Math.cos(a)+dz*Math.sin(a),lz=-dx*Math.sin(a)+dz*Math.cos(a);if(Math.abs(lx)<item.width/2+radius&&Math.abs(lz)<item.depth/2+radius)return false}
 return true;
}
const insidePolygon=(p:WalkPoint,polygon:{x:number;y:number}[])=>{let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j],hit=((a.y>p.z)!==(b.y>p.z))&&(p.x<(b.x-a.x)*(p.z-a.y)/(b.y-a.y||Number.EPSILON)+a.x);if(hit)inside=!inside}return inside};
export function roomWalkStart(scene:SceneData,roomId=''){const room=scene.rooms.find(r=>r.id===roomId)||scene.rooms[0];if(!room?.polygon.length)return {x:0,z:0};const centroid={x:room.polygon.reduce((s,p)=>s+p.x,0)/room.polygon.length,z:room.polygon.reduce((s,p)=>s+p.y,0)/room.polygon.length};if(insidePolygon(centroid,room.polygon)&&canWalkAt(scene,centroid))return centroid;const xs=room.polygon.map(p=>p.x),zs=room.polygon.map(p=>p.y),minX=Math.min(...xs),maxX=Math.max(...xs),minZ=Math.min(...zs),maxZ=Math.max(...zs),candidates:WalkPoint[]=[];for(let ring=1;ring<=5;ring++){for(let ix=-ring;ix<=ring;ix++){for(let iz=-ring;iz<=ring;iz++){if(Math.max(Math.abs(ix),Math.abs(iz))!==ring)continue;candidates.push({x:centroid.x+ix*(maxX-minX)/12,z:centroid.z+iz*(maxZ-minZ)/12})}}}const found=candidates.filter(p=>insidePolygon(p,room.polygon)&&canWalkAt(scene,p)).sort((a,b)=>Math.hypot(a.x-centroid.x,a.z-centroid.z)-Math.hypot(b.x-centroid.x,b.z-centroid.z))[0];return found||centroid}
export const movementVector=(keys:Set<string>,yaw:number,speed:number,dt:number)=>{const f=Number(keys.has('w')||keys.has('arrowup'))-Number(keys.has('s')||keys.has('arrowdown')),s=Number(keys.has('d')||keys.has('arrowright'))-Number(keys.has('a')||keys.has('arrowleft')),norm=Math.max(1,Math.hypot(f,s)),step=speed*dt/norm;return {dx:(-Math.sin(yaw)*f+Math.cos(yaw)*s)*step,dz:(-Math.cos(yaw)*f-Math.sin(yaw)*s)*step}}
