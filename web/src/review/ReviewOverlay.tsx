import React from 'react';
import type {SceneData} from '../../../api/model.js';
import type {LayoutReviewFinding} from '../../../packages/contracts/alva/layout-review.js';
/** Display the engine's affected entities and baseline route, never a suggested safe route. */
export function ReviewOverlay({scene,finding}:{scene:SceneData;finding?:LayoutReviewFinding}){
 if(!finding)return null;
 const ids=new Set([...finding.objectIds,...finding.path?.openingIds||[]]);
 return <g pointerEvents="none" data-testid="review-location" aria-label={finding.title} fill="none" stroke="#b54d20" strokeWidth=".07">
  {scene.rooms.filter(r=>finding.roomIds.includes(r.id)).map(r=><polygon key={r.id} points={r.polygon.map(p=>`${p.x},${p.y}`).join(' ')} strokeDasharray=".18 .12"/>)}
  {scene.items.filter(i=>ids.has(i.id)).map(i=><rect key={i.id} data-review-object={i.id} x={i.x-i.width/2} y={i.y-i.depth/2} width={i.width} height={i.depth} transform={`rotate(${i.rotation} ${i.x} ${i.y})`}/>)}
  {scene.walls.filter(w=>ids.has(w.id)).map(w=><line key={w.id} x1={w.a.x} y1={w.a.y} x2={w.b.x} y2={w.b.y}/>)}
  {scene.openings.filter(o=>ids.has(o.id)).map(o=>{const w=scene.walls.find(w=>w.id===o.wallId);return w?<circle key={o.id} data-review-opening={o.id} cx={w.a.x+(w.b.x-w.a.x)*o.offset} cy={w.a.y+(w.b.y-w.a.y)*o.offset} r=".2"/>:null})}
  {finding.path&&<g data-testid="review-path"><polyline points={finding.path.points.map(p=>`${p.x},${p.y}`).join(' ')} strokeDasharray=".12 .09"/>{[finding.path.points[0],finding.path.points.at(-1)].filter(Boolean).map((p,i)=><circle key={i} cx={p!.x} cy={p!.y} r=".1" fill="#f5f3ea"/>)}</g>}
 </g>;
}
