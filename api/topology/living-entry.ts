import {randomUUID} from 'node:crypto';
import {DomainError,Scene,type Project} from '../model.js';
import {createTopologyVersion} from './calibration.js';
import {topologyDiagnosticsFor} from './inspection.js';
import {validateTopology} from './validate.js';

/** Accepting a planning basis does not certify geometry or manufacture a model. */
export function livingEntryPreview(p:Project){
 const raw=p.candidate||p.scene;
 if(!raw)throw new DomainError(422,'请先上传并识别户型，再进入生活设计');
 const scene=Scene.parse(raw);
 if(!scene.rooms.length)throw new DomainError(422,'当前户型没有可用房间，请先识别或补充房间');
 const diagnostics=topologyDiagnosticsFor(p);
 let geometryIssue:string|undefined;
 try{validateTopology(scene)}catch(error){geometryIssue=(error as Error).message.split("\n")[0]}
 const uncalibrated=!scene.calibration?.confirmed;
 const warnings=[...diagnostics.analysis.issues.map(i=>i.message),...(geometryIssue?[geometryIssue]:[]),...(uncalibrated?['尺寸尚未校准，将按当前估算尺寸继续。']:[])];
 return {scene,diagnostics,geometryIssue,uncalibrated,warnings};
}
export function acceptLivingEntry(p:Project){
 const preview=livingEntryPreview(p);
 if(p.candidate||!p.confirmedTopology){
  const topology=createTopologyVersion(p,preview.scene);
  if(preview.uncalibrated)topology.assumptions=['尺寸尚未校准，当前尺寸为估算，用户选择按当前户型继续。'];
  topology.assumptions.push(...preview.warnings.map(w=>'进入生活设计时保留的问题：'+w));
  p.topologyVersions=[...(p.topologyVersions||[]),topology];p.confirmedTopology=topology;
  p.scene=structuredClone(preview.scene);p.candidate=null;
  p.buildingCandidate=undefined;p.confirmedBuilding=undefined;
  p.buildingState={status:'idle',attempts:0,updatedAt:new Date().toISOString()};
  p.dirty=true;
  p.changes.push({id:randomUUID(),description:`采用当前户型 v${topology.version} 进入生活设计`,evidenceIds:[],context:preview.warnings.length?['用户明确选择保留问题继续；未声称检查通过。',...preview.warnings]:['用户确认按当前户型继续；3D直接由户型数据渲染。'],createdAt:new Date().toISOString()});
 }
}
