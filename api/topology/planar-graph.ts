import type {SceneData,XY} from '../model.js';
import type {Polygon} from 'polygon-clipping';

type Segment={id:string;a:XY;b:XY};
const EPS=1e-7;
export const length=(s:Segment)=>Math.hypot(s.b.x-s.a.x,s.b.y-s.a.y);
export const dist=(a:XY,b:XY)=>Math.hypot(a.x-b.x,a.y-b.y);
const cross=(a:XY,b:XY)=>a.x*b.y-a.y*b.x;
const minus=(a:XY,b:XY)=>({x:a.x-b.x,y:a.y-b.y});
export function projection(p:XY,s:Segment){
 const dx=s.b.x-s.a.x,dy=s.b.y-s.a.y,den=dx*dx+dy*dy;
 const t=den?Math.max(0,Math.min(1,((p.x-s.a.x)*dx+(p.y-s.a.y)*dy)/den)):0;
 return {x:s.a.x+t*dx,y:s.a.y+t*dy};
}
export function intersection(a:Segment,b:Segment):XY|null{
 const r=minus(a.b,a.a),s=minus(b.b,b.a),den=cross(r,s);if(Math.abs(den)<EPS)return null;
 const q=minus(b.a,a.a),t=cross(q,s)/den,u=cross(q,r)/den;
 if(t<-EPS||t>1+EPS||u<-EPS||u>1+EPS)return null;
 return {x:a.a.x+t*r.x,y:a.a.y+t*r.y};
}
export function segmentDistance(a:Segment,b:Segment){
 if(intersection(a,b))return 0;
 return Math.min(dist(a.a,projection(a.a,b)),dist(a.b,projection(a.b,b)),dist(b.a,projection(b.a,a)),dist(b.b,projection(b.b,a)));
}
export function signedArea(points:XY[]){let n=0;for(let i=0;i<points.length;i++){const a=points[i],b=points[(i+1)%points.length];n+=a.x*b.y-b.x*a.y}return n/2}
export function bounds(points:XY[]){return {minX:Math.min(...points.map(p=>p.x)),minY:Math.min(...points.map(p=>p.y)),maxX:Math.max(...points.map(p=>p.x)),maxY:Math.max(...points.map(p=>p.y))}}
export function polygonArea(poly:Polygon){return poly.reduce((sum,r,i)=>sum+(i?-1:1)*Math.abs(signedArea(r.map(([x,y])=>({x,y})))),0)}

/** Full host walls, including door/window intervals, are boundary edges.
 * Node crossings, T junctions and collinear overlaps for analysis, never editing source geometry. */
export function buildPlanarGraph(walls:SceneData['walls'],connectionM:number){
 const sorted=[...walls].sort((a,b)=>a.id.localeCompare(b.id));
 const parent=sorted.map((_,i)=>i);const root=(i:number):number=>parent[i]===i?i:(parent[i]=root(parent[i]));
 const join=(a:number,b:number)=>{const x=root(a),y=root(b);parent[Math.max(x,y)]=Math.min(x,y)};
 const cuts=sorted.map(s=>[s.a,s.b]);
 for(let i=0;i<sorted.length;i++)for(let j=i+1;j<sorted.length;j++){
  const a=sorted[i],b=sorted[j];if(segmentDistance(a,b)<=connectionM)join(i,j);
  const hit=intersection(a,b);if(hit){cuts[i].push(hit);cuts[j].push(hit)}
  // Symmetric endpoint tests keep containment and T-junction results independent of order.
  for(const p of [a.a,a.b])if(dist(p,projection(p,b))<EPS)cuts[j].push(p);
  for(const p of [b.a,b.b])if(dist(p,projection(p,a))<EPS)cuts[i].push(p);
 }
 const groups=new Map<number,typeof sorted>();for(let i=0;i<sorted.length;i++){const r=root(i);groups.set(r,[...(groups.get(r)||[]),sorted[i]])}
 const components=[...groups.values()].sort((a,b)=>b.reduce((s,w)=>s+length(w),0)-a.reduce((s,w)=>s+length(w),0)||a[0].id.localeCompare(b[0].id));
 const points=new Map<string,XY>(),adj=new Map<string,Set<string>>(),edgeWalls=new Map<string,Set<string>>();
 const key=(p:XY)=>`${Math.round(p.x*1e6)},${Math.round(p.y*1e6)}`;
 const add=(p:XY)=>{const k=key(p);if(!points.has(k)){points.set(k,{...p});adj.set(k,new Set())}return k};
 for(let i=0;i<sorted.length;i++){
  const w=sorted[i],dx=w.b.x-w.a.x,dy=w.b.y-w.a.y;
  const ordered=cuts[i].sort((a,b)=>(a.x-b.x)*dx+(a.y-b.y)*dy);
  for(let j=1;j<ordered.length;j++){
   const a=add(ordered[j-1]),b=add(ordered[j]);if(a===b)continue;
   adj.get(a)!.add(b);adj.get(b)!.add(a);
   for(const e of [`${a}|${b}`,`${b}|${a}`]){if(!edgeWalls.has(e))edgeWalls.set(e,new Set());edgeWalls.get(e)!.add(w.id)}
  }
 }
 const neighbors=new Map<string,string[]>();for(const [k,set] of adj){const p=points.get(k)!;neighbors.set(k,[...set].sort((a,b)=>{const x=points.get(a)!,y=points.get(b)!;return Math.atan2(x.y-p.y,x.x-p.x)-Math.atan2(y.y-p.y,y.x-p.x)}))}
 const visited=new Set<string>(),faces:Polygon[]=[];
 const maxEdges=[...adj.values()].reduce((n,v)=>n+v.size,0);
 for(const [start,nexts] of neighbors)for(const next of nexts){
  const first=`${start}|${next}`;if(visited.has(first))continue;
  const ring:XY[]=[];let a=start,b=next,closed=false;
  for(let step=0;step<=maxEdges;step++){
   const edge=`${a}|${b}`;if(visited.has(edge)){closed=edge===first;break}
   visited.add(edge);ring.push(points.get(a)!);
   const around=neighbors.get(b)!;const reverse=around.indexOf(a);
   const c=around[(reverse-1+around.length)%around.length];a=b;b=c;
  }
  if(closed&&ring.length>=3&&signedArea(ring)>EPS)faces.push([ring.map(p=>[p.x,p.y])]);
 }
 const dangling=[...neighbors].filter(([,n])=>n.length===1).map(([k])=>({point:points.get(k)!,wallIds:[...edgeWalls.get(`${k}|${neighbors.get(k)![0]}`)!]}));
 return {components,faces,dangling};
}

/** Square-cap footprint excludes wall thickness from free-space area. */
export function wallFootprint(w:SceneData['walls'][number]):Polygon{
 const len=length(w),h=w.thickness/2,dx=(w.b.x-w.a.x)/len,dy=(w.b.y-w.a.y)/len;
 const a={x:w.a.x-dx*h,y:w.a.y-dy*h},b={x:w.b.x+dx*h,y:w.b.y+dy*h};
 return [[[a.x-dy*h,a.y+dx*h],[b.x-dy*h,b.y+dx*h],[b.x+dy*h,b.y-dx*h],[a.x+dy*h,a.y-dx*h]]];
}
