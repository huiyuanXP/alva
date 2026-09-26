import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import type {BusinessTool} from '../codex.js';
import type {AlvaStore} from '../store.js';
import {DomainError,type Project} from '../model.js';
import {readFloorplanAttachment} from '../import/attachments.js';
import {importFloorplan} from '../import/service.js';
import {applyCandidateTopology,calibrateCandidate,repairCandidateTopology,drawCandidateWall} from '../topology/service.js';
import {TopologyCommand} from '../topology/commands.js';
import {inspectProjectTopology} from '../topology/inspection.js';
import {professionalWallReadTools} from '../topology/professional-access.js';
import {wallRemodelTools} from '../topology/remodel.js';
import {generateBuildingCandidate} from '../building/service.js';
import type {BuildingCodexCall} from '../building/generate.js';
import type {LayoutCodexCall} from '../import.js';

export type FloorplanConfirmation='confirm_topology'|'reopen_topology'|'confirm_building';
export type FloorplanToolsContext={store:AlvaStore;projectId:string;signal:AbortSignal;attachmentIds:string[];snapshot:()=>Promise<unknown>;onProject:(project:Project)=>void;onStatus:(message:string)=>void;requestConfirmation:(kind:FloorplanConfirmation,project:Project)=>Promise<unknown>;visionModel?:LayoutCodexCall;buildingModel?:BuildingCodexCall};
const Revision=z.object({expectedRevision:z.number().int().min(0)});
export function floorplanTools(context:FloorplanToolsContext):BusinessTool[]{
 const {store,projectId,signal}=context;
 const tool=<T extends z.ZodType>(name:string,description:string,schema:T,run:(input:z.infer<T>)=>Promise<unknown>):BusinessTool=>({name,description,inputSchema:z.toJSONSchema(schema),run:args=>run(schema.parse(args))});
 const output=(project:Project)=>{context.onProject(project);return {revision:project.revision,importState:project.importState,candidate:project.candidate,confirmedTopology:project.confirmedTopology,buildingState:project.buildingState,buildingCandidate:project.buildingCandidate,confirmedBuilding:project.confirmedBuilding}};
 const current=async(expectedRevision:number)=>{const p=await store.get(projectId);if(p.revision!==expectedRevision)throw new DomainError(409,'项目已更新，请重新调用 get_snapshot');return p};
 return [
  tool('get_snapshot','读取最新项目、真实附件 ID、户型候选、校准和建筑确认状态。每次修改前重读。',z.object({}).strict(),async()=>({snapshot:await context.snapshot(),attachments:context.attachmentIds})),
  tool('recognize_floorplan','实际读取已上传到本项目的 PNG/JPEG/PDF 附件，再调用识图模型。只生成待校正候选，不确认拓扑。文件名不是附件 ID。',Revision.extend({attachmentId:z.string().uuid()}).strict(),async b=>{
   if(!context.attachmentIds.includes(b.attachmentId))throw new DomainError(422,'请先把该户型附件添加到本轮 Chat');
   await current(b.expectedRevision);const source=await readFloorplanAttachment(projectId,b.attachmentId);
   return output(await importFloorplan(store,projectId,{requestId:randomUUID(),expectedRevision:b.expectedRevision,mime:source.metadata.mime,filename:source.metadata.filename,data:source.data},signal,context.onStatus,context.visionModel));
  }),
  tool('edit_topology','调整待校正户型的墙线、房间标注或门窗；已确认户型必须先由用户明确确认返回修改。修改会使校准失效。',Revision.extend({operation:TopologyCommand}).strict(),async b=>{
   const p=await current(b.expectedRevision);if(p.confirmedTopology)throw new DomainError(422,'请先请求返回修改户型，由用户确认放弃后续设计');
   return output(await store.mutate(projectId,randomUUID(),b.expectedRevision,'candidate-topology',b,state=>applyCandidateTopology(state,b)));
  }),
  tool('repair_topology','按 inspect_topology 返回的最新 issueId 和用户选择的 optionId 修复候选。不得猜测用户选择；修复后校准失效。',Revision.extend({issueId:z.string().min(1),optionId:z.string().min(1)}).strict(),async b=>{
   await current(b.expectedRevision);return output(await store.mutate(projectId,randomUUID(),b.expectedRevision,'candidate-topology-repair',b,p=>repairCandidateTopology(p,b)));
  }),
  tool('draw_wall','按用户明确给出的起点和终点补画候选墙；共用二维按钮的吸附、分段与几何检查。修改使校准失效，不修改已确认拓扑。',Revision.extend({a:z.object({x:z.number().finite(),y:z.number().finite()}).strict(),b:z.object({x:z.number().finite(),y:z.number().finite()}).strict()}).strict(),async b=>{
   await current(b.expectedRevision);return output(await store.mutate(projectId,randomUUID(),b.expectedRevision,'candidate-draw-wall',b,p=>drawCandidateWall(p,b)));
  }),
  tool('calibrate_floorplan','按用户明确提供的墙长与来源校准候选。不得编造长度或把校准当成建筑确认。',Revision.extend({wallId:z.string().min(1),length:z.number().positive(),source:z.string().min(1)}).strict(),async b=>{
   const p=await current(b.expectedRevision);if(p.confirmedTopology)throw new DomainError(422,'请先明确确认返回修改户型');
   return output(await store.mutate(projectId,randomUUID(),b.expectedRevision,'calibrate',b,state=>calibrateCandidate(state,b)));
  }),
  tool('inspect_topology','读取与页面一致的完整户型诊断，涵盖候选或已确认工作稿；返回错误码、原因、墙/门窗/房间ID、位置、检查限制和修复选项。只读，不确认或修改。',z.object({}).strict(),async()=>inspectProjectTopology(await store.get(projectId))),
  ...professionalWallReadTools(store,projectId),
  ...wallRemodelTools(store,projectId),
  tool('request_topology_confirmation','向用户出示拓扑确认操作，用户点击后才确认。工具调用自身不会代替用户确认。',Revision.strict(),async b=>context.requestConfirmation('confirm_topology',await current(b.expectedRevision))),
  tool('request_topology_reopen','请求用户明确确认放弃依赖旧拓扑的后续设计，再返回修改。仅切换到户型聊天不需要此操作。',Revision.strict(),async b=>context.requestConfirmation('reopen_topology',await current(b.expectedRevision))),
  tool('generate_building','基于已确认拓扑实际调用辅助模型生成建筑 3D 待确认候选。辅助模型不继承本阶段 MCP。',Revision.strict(),async b=>{await current(b.expectedRevision);return output(await generateBuildingCandidate(store,projectId,{...b,requestId:randomUUID()},signal,context.buildingModel))}),
  tool('request_building_confirmation','请求用户确认已预览的建筑候选；用户确认后进入生活设计。不会自行确认。',Revision.strict(),async b=>context.requestConfirmation('confirm_building',await current(b.expectedRevision))),
 ];
}
