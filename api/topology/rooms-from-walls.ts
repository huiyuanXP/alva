import {randomUUID} from 'node:crypto';
import {pointInPolygon,type SceneData,type XY} from '../model.js';

const KEY_PRECISION=1000;
const key=(p:XY)=>`${Math.round(p.x*KEY_PRECISION)},${Math.round(p.y*KEY_PRECISION)}`;
const area=(poly:XY[])=>poly.reduce((sum,p,i)=>{const q=poly[(i+1)%poly.length];return sum+p.x*q.y-q.x*p.y},0)/2;
const centroid=(poly:XY[])=>{const a=area(poly);if(Math.abs(a)<1e-9)return poly.reduce((s,p)=>({x:s.x+p.x/poly.length,y:s.y+p.y/poly.length}),{x:0,y:0});let x=0,y=0;for(let i=0;i<poly.length;i++){const p=poly[i],q=poly[(i+1)%poly.length],f=p.x*q.y-q.x*p.y;x+=(p.x+q.x)*f;y+=(p.y+q.y)*f}return{x:x/(6*a),y:y/(6*a)}};
const roomArea=(room:SceneData['rooms'][number])=>Math.abs(area(room.polygon));

type Edge={id:string;from:string;to:string;a:XY;b:XY;angle:number;reverse?:Edge;next?:Edge;visited?:boolean};

/** Derive bounded planar faces from the wall graph. The largest outer face is discarded. */
export function wallFaces(scene:SceneData):XY[][]{
 const points=new Map<string,XY>(),outgoing=new Map<string,Edge[]>(),edges:Edge[]=[];
 const put=(k:string,p:XY)=>{if(!points.has(k))points.set(k,{...p})};
 for(const wall of scene.walls){const ak=key(wall.a),bk=key(wall.b);if(ak===bk)continue;put(ak,wall.a);put(bk,wall.b);const ab:Edge={id:`${wall.id}:ab`,from:ak,to:bk,a:wall.a,b:wall.b,angle:Math.atan2(wall.b.y-wall.a.y,wall.b.x-wall.a.x)},ba:Edge={id:`${wall.id}:ba`,from:bk,to:ak,a:wall.b,b:wall.a,angle:Math.atan2(wall.a.y-wall.b.y,wall.a.x-wall.b.x)};ab.reverse=ba;ba.reverse=ab;edges.push(ab,ba);for(const edge of [ab,ba]){const list=outgoing.get(edge.from)||[];list.push(edge);outgoing.set(edge.from,list)}}
 for(const list of outgoing.values())list.sort((a,b)=>a.angle-b.angle);
 for(const edge of edges){const list=outgoing.get(edge.to)||[],reverse=edge.reverse!;const idx=list.indexOf(reverse);if(idx<0||!list.length)continue;edge.next=list[(idx-1+list.length)%list.length]}
 const cycles:XY[][]=[];
 for(const start of edges){if(start.visited||!start.next)continue;const poly:XY[]=[],seen=new Set<string>();let edge:Edge|undefined=start;while(edge&&!seen.has(edge.id)){seen.add(edge.id);edge.visited=true;poly.push(points.get(edge.from)!);edge=edge.next;if(edge===start)break}if(edge===start&&poly.length>=3&&Math.abs(area(poly))>.05)cycles.push(poly)}
 if(cycles.length<=1)return [];
 const exterior=cycles.reduce((best,p)=>Math.abs(area(p))>Math.abs(area(best))?p:best,cycles[0]);return cycles.filter(p=>p!==exterior&&Math.abs(area(p))>.05);
}

function chooseOldRoom(face:XY[],oldRooms:SceneData['rooms']){
 const c=centroid(face),atCentroid=oldRooms.filter(room=>pointInPolygon(c,room.polygon)).sort((a,b)=>roomArea(a)-roomArea(b));if(atCentroid.length)return atCentroid[0];
 const oldCentroids=oldRooms.map(room=>({room,c:centroid(room.polygon)})).filter(x=>pointInPolygon(x.c,face));if(oldCentroids.length)return oldCentroids.sort((a,b)=>Math.hypot(a.c.x-c.x,a.c.y-c.y)-Math.hypot(b.c.x-c.x,b.c.y-c.y))[0].room;
 return null;
}

/** Walls are authoritative. Room polygons are derived from bounded wall faces; semantic labels are preserved when possible. */
export function syncRoomsToWalls(scene:SceneData){
 const faces=wallFaces(scene);if(!faces.length)return scene;
 const oldRooms=scene.rooms.map(room=>structuredClone(room)),used=new Set<string>();scene.rooms=faces.map((polygon,index)=>{const match=chooseOldRoom(polygon,oldRooms.filter(room=>!used.has(room.id)));if(match){used.add(match.id);return {...match,polygon}}return {id:`room-${randomUUID()}`,name:`未命名区域 ${index+1}`,purpose:'用途待确认',polygon,locked:false}});return scene;
}

export function snapOrthogonalPoint(anchor:XY,raw:XY,toleranceDegrees=10){const dx=raw.x-anchor.x,dy=raw.y-anchor.y;if(Math.hypot(dx,dy)<1e-9)return raw;const angle=Math.atan2(dy,dx)*180/Math.PI,normalized=((angle%180)+180)%180;const horizontal=Math.min(normalized,180-normalized),vertical=Math.abs(normalized-90);if(horizontal<=toleranceDegrees)return{x:raw.x,y:anchor.y};if(vertical<=toleranceDegrees)return{x:anchor.x,y:raw.y};return raw}
