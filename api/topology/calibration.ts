import {createHash,randomUUID} from 'node:crypto';
import {distance,reject,type Project,type SceneData,type TopologyVersion} from '../model.js';

export const topologyAssumptions=[
 '门窗宽度、墙体平面坐标和墙厚按已知墙长同比例换算；墙高、门窗高度与窗台高度仍是候选估算，需现场核对。',
 '未标注的墙长和开口尺寸是比例推导值，不构成施工或拆改授权。',
];

export function validateOpenings(scene:SceneData):SceneData{
 for(const opening of scene.openings){
  const wall=scene.walls.find(w=>w.id===opening.wallId);if(!wall)reject(`门窗 ${opening.id} 未关联有效墙体 ${opening.wallId}`);
  const length=distance(wall!.a,wall!.b),start=opening.offset*length-opening.width/2,end=opening.offset*length+opening.width/2;
  if(start<-.01||end>length+.01)reject(`门窗 ${opening.id} 超出墙段 ${wall!.id}：位置 ${opening.offset.toFixed(3)}，宽度 ${opening.width.toFixed(2)}m，墙长 ${length.toFixed(2)}m`);
  if(opening.sill<0||opening.sill+opening.height>wall!.height+.01)reject(`门窗 ${opening.id} 超出墙高 ${wall!.height.toFixed(2)}m，请检查窗台高度和开口高度`);
 }
 for(let i=0;i<scene.openings.length;i++)for(let j=i+1;j<scene.openings.length;j++){
  const a=scene.openings[i],b=scene.openings[j];if(a.wallId!==b.wallId)continue;const wall=scene.walls.find(w=>w.id===a.wallId);if(!wall)continue;const length=distance(wall.a,wall.b),a0=a.offset*length-a.width/2,a1=a.offset*length+a.width/2,b0=b.offset*length-b.width/2,b1=b.offset*length+b.width/2;if(Math.min(a1,b1)-Math.max(a0,b0)>.01)reject(`门窗 ${a.id} 与 ${b.id} 在墙 ${a.wallId} 上重叠`);
 }
 return scene;
}

function sourceDigest(project:Project){const source=project.sourceImage;if(!source)return 'no-source';return createHash('sha256').update(JSON.stringify({mime:source.originalMime||source.mime,filename:source.filename,page:source.page,pages:source.pages,data:createHash('sha256').update(source.data).digest('hex')})).digest('hex')}
export function createTopologyVersion(project:Project,scene:SceneData):TopologyVersion{
 const version=(project.topologyVersions?.at(-1)?.version||0)+1,confirmedAt=new Date().toISOString();
 const sourceFingerprint=createHash('sha256').update(JSON.stringify({source:sourceDigest(project),scene,calibration:scene.calibration,version})).digest('hex');
 return {id:`topology-${randomUUID()}`,version,sourceFingerprint,scene:structuredClone(scene),calibration:structuredClone(scene.calibration),assumptions:[...topologyAssumptions],confirmedAt};
}
