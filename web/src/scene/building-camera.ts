import type {SceneData} from '../../../api/model.js';
import type {BuildingComponentData,BuildingSceneData} from '../../../api/building/types.js';

export type Point3={x:number;y:number;z:number};
export type Bounds3={min:Point3;max:Point3};
export type CameraPose={position:Point3;target:Point3};

const add=(a:Point3,b:Point3):Point3=>({x:a.x+b.x,y:a.y+b.y,z:a.z+b.z});
const scale=(a:Point3,n:number):Point3=>({x:a.x*n,y:a.y*n,z:a.z*n});
const distance=(a:{x:number;y:number},b:{x:number;y:number})=>Math.hypot(a.x-b.x,a.y-b.y);

function rotatedCorners(component:BuildingComponentData){
 const angle=-component.rotation,c=Math.cos(angle),s=Math.sin(angle),points:Point3[]=[];
 for(const x of [-component.size.x/2,component.size.x/2])for(const y of [-component.size.y/2,component.size.y/2])for(const z of [-component.size.z/2,component.size.z/2])points.push({x:component.position.x+x*c-z*s,y:component.position.y+y,z:component.position.z+x*s+z*c});
 return points;
}

export function computeBuildingBounds(building:BuildingSceneData):Bounds3{
 const points=building.components.flatMap(rotatedCorners),min={x:Infinity,y:Infinity,z:Infinity},max={x:-Infinity,y:-Infinity,z:-Infinity};
 for(const point of points){min.x=Math.min(min.x,point.x);min.y=Math.min(min.y,point.y);min.z=Math.min(min.z,point.z);max.x=Math.max(max.x,point.x);max.y=Math.max(max.y,point.y);max.z=Math.max(max.z,point.z)}
 return {min,max};
}

export function overviewPose(building:BuildingSceneData,aspect=1):CameraPose{
 const bounds=computeBuildingBounds(building),size={x:Math.max(bounds.max.x-bounds.min.x,.1),y:Math.max(bounds.max.y-bounds.min.y,.1),z:Math.max(bounds.max.z-bounds.min.z,.1)},target={x:(bounds.min.x+bounds.max.x)/2,y:bounds.min.y+Math.min(1.5,size.y*.42),z:(bounds.min.z+bounds.max.z)/2};
 const halfFov=Math.PI/8,required=Math.max(size.x/Math.max(aspect,.2),size.z,size.y*.8)/(2*Math.tan(halfFov)),distanceFromTarget=Math.max(4,required*1.35),direction={x:.68,y:.58,z:.68},length=Math.hypot(direction.x,direction.y,direction.z),unit=scale(direction,1/length);
 return {target,position:add(target,scale(unit,distanceFromTarget))};
}

function pointInPolygon(point:{x:number;y:number},polygon:SceneData['rooms'][number]['polygon']){
 let inside=false;
 for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){
  const a=polygon[i],b=polygon[j],cross=(a.y>point.y)!==(b.y>point.y)&&point.x<(b.x-a.x)*(point.y-a.y)/((b.y-a.y)||Number.EPSILON)+a.x;
  if(cross)inside=!inside;
 }
 return inside;
}

function pointToSegment(point:{x:number;y:number},a:{x:number;y:number},b:{x:number;y:number}){
 const dx=b.x-a.x,dy=b.y-a.y,t=Math.max(0,Math.min(1,((point.x-a.x)*dx+(point.y-a.y)*dy)/(dx*dx+dy*dy||1))),x=a.x+dx*t,y=a.y+dy*t;
 return Math.hypot(point.x-x,point.y-y);
}

function polygonCenter(polygon:SceneData['rooms'][number]['polygon']){
 let area=0,x=0,y=0;
 for(let i=0;i<polygon.length;i++){const a=polygon[i],b=polygon[(i+1)%polygon.length],cross=a.x*b.y-b.x*a.y;area+=cross;x+=(a.x+b.x)*cross;y+=(a.y+b.y)*cross}
 if(Math.abs(area)<1e-6)return polygon.reduce((sum,p)=>({x:sum.x+p.x/polygon.length,y:sum.y+p.y/polygon.length}),{x:0,y:0});
 return {x:x/(3*area),y:y/(3*area)};
}

function safeRoomPoint(room:SceneData['rooms'][number],walls:SceneData['walls']){
 const polygon=room.polygon,center=polygonCenter(polygon),min={x:Math.min(...polygon.map(p=>p.x)),y:Math.min(...polygon.map(p=>p.y))},max={x:Math.max(...polygon.map(p=>p.x)),y:Math.max(...polygon.map(p=>p.y))},candidates=[center,{x:(min.x+max.x)/2,y:(min.y+max.y)/2},...polygon.map(p=>({x:center.x*.7+p.x*.3,y:center.y*.7+p.y*.3}))];
 for(let ix=0;ix<=8;ix++)for(let iy=0;iy<=8;iy++)candidates.push({x:min.x+(max.x-min.x)*ix/8,y:min.y+(max.y-min.y)*iy/8});
 let best=center,bestScore=-Infinity;
 for(const candidate of candidates){if(!pointInPolygon(candidate,polygon))continue;const clearance=Math.min(...walls.map(w=>pointToSegment(candidate,w.a,w.b)-w.thickness/2),Infinity);if(clearance>bestScore){bestScore=clearance;best=candidate}}
 return best;
}

export function roomPose(scene:SceneData,roomId:string,aspect=1):CameraPose|undefined{
 const room=scene.rooms.find(item=>item.id===roomId);if(!room||!room.polygon.length)return undefined;
 const xs=room.polygon.map(point=>point.x),zs=room.polygon.map(point=>point.y);
 const width=Math.max(...xs)-Math.min(...xs),depth=Math.max(...zs)-Math.min(...zs);
 const target={x:(Math.min(...xs)+Math.max(...xs))/2,y:1.2,z:(Math.min(...zs)+Math.max(...zs))/2};
 // Frame the whole selected room from above, including its walls. The old eye-height
 // interior pose placed the camera against a wall and made the daylight unreadable.
 const halfFov=Math.PI/8,required=Math.max(width/Math.max(aspect,.2),depth,3*.8)/(2*Math.tan(halfFov));
 const direction={x:.68,y:.8,z:.68},distance=Math.max(5,required*1.75);
 return {target,position:add(target,scale(direction,distance/Math.hypot(direction.x,direction.y,direction.z)))};
}
