import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import type {FastifyInstance} from 'fastify';
import type {BusinessTool} from '../codex.js';
import {DomainError,reject,type Project,type SceneData} from '../model.js';
import type {AlvaStore,Session} from '../store.js';
import {applyTopologyCommand} from '../topology/commands.js';
import {createTopologyVersion} from '../topology/calibration.js';

const Migration=z.object({openingId:z.string().min(1),targetWallId:z.string().min(1),offset:z.number().finite().min(0).max(1)}).strict();
export const RemodelPreviewInput=z.object({expectedRevision:z.number().int().min(0),wallId:z.string().min(1),migrations:z.array(Migration).max(100)}).strict();
export const RemodelConfirmInput=RemodelPreviewInput.extend({requestId:z.string().uuid(),baseTopologyId:z.string().min(1),previewFingerprint:z.string().regex(/^[a-f0-9]{64}$/),reason:z.string().trim().min(3).max(1000),confirmed:z.literal(true)}).strict();
export type RemodelMigration=z.infer<typeof Migration>;

function digest(value:unknown){return createHash('sha256').update(JSON.stringify(value)).digest('hex')}
function classificationAllowed(wall:SceneData['walls'][number]){return wall.structural==='nonloadbearing'&&wall.evidence.some(e=>e.startsWith('professional-classification:'))}
function owner(session:(req:object)=>Session,req:object){const s=session(req);if(s.role!=='owner')reject('仅业主可预览和确认墙体改造',403);return s}

export function buildWallRemodelPreview(project:Project,input:z.infer<typeof RemodelPreviewInput>){
 const topology=project.confirmedTopology,sourceScene=project.scene;if(!sourceScene||!topology)reject('请先完成并确认户型拓扑',422);
 const source=structuredClone(sourceScene!),wall=source!.walls.find(w=>w.id===input.wallId);if(!wall)reject('待改造墙体不存在',404);
 if(!classificationAllowed(wall!))reject('只有带可追溯专业依据的非承重墙才可预览改造',403);
 const wallOpenings=source!.openings.filter(o=>o.wallId===wall!.id),seen=new Set<string>();
 if(input.migrations.length!==wallOpenings.length)reject(`墙体仍有 ${wallOpenings.length-input.migrations.length} 个门窗未明确迁移；请逐个选择目标墙段和位置`);
 for(const migration of input.migrations){
  if(seen.has(migration.openingId))reject('同一门窗不能重复迁移');seen.add(migration.openingId);
  const opening=wallOpenings.find(o=>o.id===migration.openingId);if(!opening)reject(`门窗 ${migration.openingId} 未关联待改造墙体`);
  if(migration.targetWallId===wall!.id)reject(`门窗 ${migration.openingId} 的迁移目标不能仍是待移除墙体`);
  if(!source!.walls.some(w=>w.id===migration.targetWallId))reject(`门窗 ${migration.openingId} 的目标墙段不存在`);
 }
 for(const opening of wallOpenings){const migration=input.migrations.find(m=>m.openingId===opening.id)!;const result=applyTopologyCommand(source!,{kind:'update-opening',openingId:opening.id,wallId:migration.targetWallId,offset:migration.offset});Object.assign(source,result.scene)}
 const result=applyTopologyCommand(source!,{kind:'remove-wall',wallId:wall!.id});
 const previewFingerprint=digest({baseTopologyId:topology!.id,wallId:input.wallId,migrations:input.migrations,scene:result.scene});
 return {scene:result.scene,removedWallId:wall!.id,migrations:input.migrations,baseRevision:project.revision,baseTopologyId:topology!.id,baseTopologyVersion:topology!.version,previewFingerprint}
}

export function registerWallRemodel(app:FastifyInstance,store:AlvaStore,session:(req:object)=>Session){
 app.post('/api/professional/remodel/preview',async req=>{const s=owner(session,req),input=RemodelPreviewInput.parse(req.body),project=await store.get(s.projectId);if(project.revision!==input.expectedRevision)reject('项目已更新，请重新读取后预览',409);return buildWallRemodelPreview(project,input)});
 app.post('/api/professional/remodel/confirm',async req=>{const s=owner(session,req),input=RemodelConfirmInput.parse(req.body);return store.mutate(s.projectId,input.requestId,input.expectedRevision,'professional-wall-remodel',input,(p)=>{if(p.confirmedTopology?.id!==input.baseTopologyId)reject('确认拓扑已变化，请重新生成改造预览',409);const preview=buildWallRemodelPreview(p,input);if(preview.previewFingerprint!==input.previewFingerprint)reject('改造预览已变化，请重新核对后确认',409);const oldTopology=p.confirmedTopology!,next=createTopologyVersion(p,preview.scene);p.scene=structuredClone(preview.scene);p.candidate=null;p.topologyVersions=[...(p.topologyVersions||[]),next];p.confirmedTopology=next;p.buildingCandidate=undefined;p.buildingState={status:'expired',topologyVersion:next.version,topologyFingerprint:next.sourceFingerprint,attempts:p.buildingState.attempts,updatedAt:new Date().toISOString(),error:'墙体改造已确认，旧建筑结果已过期，请重新生成建筑3D'};p.proposals=[];p.layoutReview=undefined;p.layoutReviewAdoption=undefined;p.zones=[];p.findings=p.findings.filter(f=>f.stage!=='review');p.changes.push({id:randomUUID(),description:`确认非承重墙改造：移除 ${input.wallId} 并迁移 ${input.migrations.length} 个门窗`,evidenceIds:[],context:[`专业分类证据保留于墙体历史；原拓扑 v${oldTopology.version} → 新拓扑 v${next.version}`,...input.migrations.map(m=>`门窗 ${m.openingId} → 墙 ${m.targetWallId} @ ${m.offset}`),`旧建筑结果已标记过期；原因：${input.reason}`],createdAt:new Date().toISOString()})})});
}

export function wallRemodelTools(store:AlvaStore,projectId:string):BusinessTool[]{
 const schema=z.object({expectedRevision:z.number().int().min(0),wallId:z.string().min(1),migrations:z.array(Migration).max(100)}).strict();
 return [{name:'preview_wall_remodel',description:'预览有专业非承重墙证据的改造，并要求为该墙上的每个门窗明确目标墙段和位置。只读，不保存；预览后仍需业主确认。',inputSchema:z.toJSONSchema(schema),run:async args=>{const input=schema.parse(args),p=await store.get(projectId);if(p.revision!==input.expectedRevision)throw new DomainError(409,'项目已更新，请先重新调用 get_snapshot');return buildWallRemodelPreview(p,input)}},{name:'confirm_wall_remodel',description:'在业主明确确认改造预览后原子保存墙体移除与门窗迁移；不得代替业主确认，必须提供预览指纹、最新拓扑ID和原因。',inputSchema:z.toJSONSchema(RemodelConfirmInput),run:async args=>{const input=RemodelConfirmInput.parse(args),p=await store.get(projectId);if(p.revision!==input.expectedRevision)throw new DomainError(409,'项目已更新，请先重新调用 get_snapshot');return store.mutate(projectId,randomUUID(),input.expectedRevision,'professional-wall-remodel',{...input,requestId:'mcp-generated'},state=>{if(state.confirmedTopology?.id!==input.baseTopologyId)reject('确认拓扑已变化，请重新生成改造预览',409);const preview=buildWallRemodelPreview(state,input);if(preview.previewFingerprint!==input.previewFingerprint)reject('改造预览已变化，请重新核对后确认',409);const old=state.confirmedTopology!,next=createTopologyVersion(state,preview.scene);state.scene=structuredClone(preview.scene);state.candidate=null;state.topologyVersions=[...(state.topologyVersions||[]),next];state.confirmedTopology=next;state.buildingCandidate=undefined;state.buildingState={status:'expired',topologyVersion:next.version,topologyFingerprint:next.sourceFingerprint,attempts:state.buildingState.attempts,updatedAt:new Date().toISOString(),error:'墙体改造已确认，旧建筑结果已过期，请重新生成建筑3D'};state.proposals=[];state.layoutReview=undefined;state.layoutReviewAdoption=undefined;state.zones=[];state.findings=state.findings.filter(f=>f.stage!=='review');state.changes.push({id:randomUUID(),description:`确认非承重墙改造：移除 ${input.wallId} 并迁移 ${input.migrations.length} 个门窗`,evidenceIds:[],context:[`专业分类证据保留；原拓扑 v${old.version} → 新拓扑 v${next.version}`,...input.migrations.map(m=>`门窗 ${m.openingId} → 墙 ${m.targetWallId} @ ${m.offset}`),`旧建筑结果已标记过期；原因：${input.reason}`],createdAt:new Date().toISOString()})})}}];
}
