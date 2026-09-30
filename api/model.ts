import type {QuestionnaireSnapshot,QuestionnaireDelivery} from '../packages/contracts/alva/questionnaire-batch.js';
import {ReviewedFurnitureModel} from '../packages/contracts/alva/furniture-model.js';
import type {VisionQuestion} from '../packages/contracts/alva/home-vision/chat.js';
import type {UserContextEntry} from '../packages/contracts/alva/user-context.js';
import type {LayoutReviewResult,LayoutReviewAdoption} from '../packages/contracts/alva/layout-review.js';
import type {AnswerRecommendation} from '../packages/contracts/alva/answer-recommendation.js';
import type {RoomStyle,RoomStyleCandidate} from '../packages/contracts/alva/room-style.js';
import type {Vision} from '../packages/contracts/alva/home-vision/flow.js';
import type {IntakeProgress} from './intake/routes.js';
import {z} from 'zod';
import {randomUUID} from 'node:crypto';
import type {BuildingSceneData} from './building/types.js';
export const Id=z.string().min(1).max(100);
const Num=z.number().finite().min(-1000).max(1000);
export const Point=z.object({x:Num,y:Num}).strict();
export const Wall=z.object({id:Id,a:Point,b:Point,thickness:z.number().min(.05).max(1),height:z.number().min(1).max(6),structural:z.enum(['unknown','loadbearing','protected','nonloadbearing']),evidence:z.array(z.string()).default([])}).strict();
export const Room=z.object({id:Id,name:z.string().min(1).max(80),purpose:z.string().max(120),polygon:z.array(Point).min(3).max(60),locked:z.boolean()}).strict();
export const Opening=z.object({id:Id,wallId:Id,kind:z.enum(['door','window']),offset:z.number().min(0).max(1),width:z.number().min(.3).max(5),height:z.number().min(.3).max(4),sill:z.number().min(0).max(3)}).strict();
export const Item=z.object({visualModel:ReviewedFurnitureModel.optional(),id:Id,assetId:Id,roomId:Id,name:z.string().min(1).max(80),x:Num,y:Num,width:z.number().min(.05).max(10),depth:z.number().min(.05).max(10),height:z.number().min(.02).max(5),rotation:z.number().finite(),color:z.string().regex(/^#[a-fA-F0-9]{6}$/),material:z.enum(['wood','fabric','stone','metal','glass']),clearance:z.number().min(0).max(1),locked:z.boolean(),sourceId:z.string().optional(),referenceSource:z.object({batchId:Id,annotationIds:z.array(Id),assetId:Id,license:z.string().min(1),dimensionBasis:z.literal('licensed-asset-defaults'),measurementStatus:z.literal('not-measured'),referenceGeometryReliable:z.literal(false)}).strict().optional()}).strict();
export const Scene=z.object({walls:z.array(Wall).max(200),rooms:z.array(Room).max(30),openings:z.array(Opening).max(100),items:z.array(Item).max(300),calibration:z.object({wallId:Id,length:z.number().positive(),source:z.string().min(1),confirmed:z.boolean()}).nullable(),geography:z.object({latitude:z.number().min(-66).max(66),north:z.number().min(0).max(360),assumption:z.string()})}).strict();
export type SceneData=z.infer<typeof Scene>;export type ItemData=z.infer<typeof Item>;export type XY=z.infer<typeof Point>;
export type Evidence={id:string;quote:string;source:'chat'|'questionnaire'|'image'|'manual';roomId?:string;createdAt:string};
export type Answer={questionId:string;roomId:string|null;text:string;state:'answered'|'unknown'|'skipped'|'not_applicable';locked:boolean;confirmed:boolean;evidenceId:string};
export type Message={language?:'zh'|'en';guidanceKey?:string;toolCalls?:{stage:'floorplan'|'living';name:string;isError:boolean;errorCode?:string}[];stage?:'floorplan'|'living';id:string;role:'user'|'assistant';text:string;status:'running'|'completed'|'failed'|'cancelled';createdAt:string;error?:string};
export type Finding={id:string;kind:'navigation'|'geometry'|'behavior'|'requirement'|'furniture'|'professional';title:string;reason:string;suggestion:string;objectIds:string[];roomIds:string[];evidenceIds:string[];confidence:'high'|'medium'|'low';status:'pending'|'acknowledged';stage:'intake'|'review'};
export type Change={action:'add'|'update'|'remove'|'copy'|'transfer'|'purpose'|'wall';targetId:string;values:Record<string,unknown>};
export type Proposal={baseArchitectureKey?:string;baseDesignKey?:string;decisionSessionId?:string;id:string;title:string;rationale:string;evidenceIds:string[];baseRevision:number;changes:Change[];status:'proposed'|'accepted'|'rejected';scopeId?:string;scopeRequired?:boolean;referenceIds?:string[];groupId?:string};
export type PurposeConfirmation={id:string;roomId:string;purpose:string;evidenceId:string;confirmedAt:string};
export type LayoutConfirmation={id:string;proposalId:string;selectedIds:string[];evidenceIds:string[];confirmedAt:string};
export type ScopeRequest={id:string;status:'pending'|'confirmed'|'cancelled';reason:string;roomIds:string[];itemIds:string[];excludedRoomIds:string[];excludedItemIds:string[];sourceMessageId?:string;baseRevision:number;createdAt:string;confirmedAt?:string;generation?:{status:'pending'|'running'|'completed'|'failed';proposalIds?:string[];error?:string}};
export type SourceImage={mime:string;data:string;originalMime:string;originalData?:string;filename:string;page?:number;pages?:number};
export type ImportState={status:'processing'|'succeeded'|'failed'|'cancelled';message:string;requestId:string;sourceMime:string;filename:string;page?:number;pages?:number;provider?:'codex';model?:string;startedAt:string;finishedAt?:string};
export type TopologyVersion={id:string;version:number;sourceFingerprint:string;scene:SceneData;calibration:SceneData['calibration'];assumptions:string[];confirmedAt:string};
export type Zone={id:string;roomId:string;name:string;polygon:XY[];boundary:{kind:'virtual';a:XY;b:XY};source:'divider'|'three-wall';createdAt:string};
export type BuildingGenerationState={status:'idle'|'processing'|'succeeded'|'failed'|'cancelled'|'expired'|'confirmed';requestId?:string;topologyVersion?:number;topologyFingerprint?:string;error?:string;attempts:number;updatedAt:string};
export type ArchivedFurniture={id:string;item:ItemData;removedAt:string;reason:string};
export type RoomMergeRecord={id:string;mergedRoomId:string;sourceRoomIds:string[];sourceRoomNames:string[];name:string;purpose:string;createdAt:string};
export type RoomSplitRecord={id:string;sourceRoomId:string;sourceRoomName:string;childRoomIds:string[];childRoomNames:string[];splitLine:{a:XY;b:XY};itemAssignments:{itemId:string;childRoomId:string}[];openingAssignments:{openingId:string;childRoomId:string}[];requirementAssignments:{kind:string;id:string;childRoomId:string}[];createdAt:string};
export type Project={questionnaireSent?:QuestionnaireSnapshot;questionnaireDelivery?:QuestionnaireDelivery;visionQuestions?:VisionQuestion[];confirmationVersions?:{topology:number;building:number;design:number};homeVision?:Vision;userContextEntries?:UserContextEntry[];layoutReview?:LayoutReviewResult;layoutReviewAdoption?:LayoutReviewAdoption;contextProjectionWarning?:{code:string;message:string;retryable:boolean;repairActions:{action:string;message:string}[]};answerRecommendations?:AnswerRecommendation[];roomStyles?:Record<string,RoomStyle>;roomStyleCandidates?:RoomStyleCandidate[];roomMergeHistory?:RoomMergeRecord[];roomSplitHistory?:RoomSplitRecord[];intakeProgress?:IntakeProgress;roomLabelPositions?:Record<string,XY>;zones?:Zone[];scopeRequests?:ScopeRequest[];purposeConfirmations?:PurposeConfirmation[];layoutConfirmations?:LayoutConfirmation[];id:string;name:string;revision:number;savedVersion:number;dirty:boolean;scene:SceneData|null;candidate:SceneData|null;answers:Answer[];evidence:Evidence[];messages:Message[];findings:Finding[];proposals:Proposal[];changes:{id:string;description:string;evidenceIds:string[];context:string[];createdAt:string}[];assets:typeof assets;sourceImage?:SourceImage;importState?:ImportState;topologyVersions:TopologyVersion[];confirmedTopology?:TopologyVersion;buildingState:BuildingGenerationState;archivedFurniture?:ArchivedFurniture[];buildingCandidate?:BuildingSceneData;confirmedBuilding?:BuildingSceneData;lastAnalysisEvidence:number;createdAt:string};
export const assets=[
{id:'alva-sofa',name:'沙发',width:2.1,depth:.9,height:.8,material:'fabric',color:'#9da991',license:'CC0 · alva程序几何'},
{id:'alva-table',name:'操作台 / 书桌',width:1.4,depth:.65,height:.75,material:'wood',color:'#b49a75',license:'CC0 · alva程序几何'},
{id:'alva-bed',name:'床',width:1.8,depth:2,height:.55,material:'fabric',color:'#c8baa8',license:'CC0 · alva程序几何'},
{id:'alva-chair',name:'椅子',width:.5,depth:.5,height:.85,material:'wood',color:'#9a7957',license:'CC0 · alva程序几何'},
{id:'alva-cabinet',name:'收纳柜',width:1.2,depth:.45,height:1.8,material:'wood',color:'#bca68a',license:'CC0 · alva程序几何'},
{id:'alva-plant',name:'绿植',width:.45,depth:.45,height:1.2,material:'wood',color:'#648268',license:'CC0 · alva程序几何'},
{id:'alva-coffee',name:'咖啡机',width:.35,depth:.4,height:.4,material:'metal',color:'#535958',license:'CC0 · alva程序几何'},
{id:'alva-projector',name:'投影仪与矮柜',width:1.0,depth:0.4,height:0.8,material:'wood',color:'#DDD5C6',license:'CC0 · alva原创程序几何'},
{id:'alva-screen',name:'投影幕布',width:1.8,depth:0.18,height:1.8,material:'metal',color:'#F4F3EF',license:'CC0 · alva原创程序几何'},
{id:'alva-gaming-desk',name:'电竞桌与电脑',width:1.4,depth:0.7,height:1.25,material:'wood',color:'#DCE8E1',license:'CC0 · alva原创程序几何'},
{id:'alva-kitchen-unit',name:'厨房水槽灶台柜',width:1.6,depth:0.6,height:1.05,material:'wood',color:'#DFE6DB',license:'CC0 · alva原创程序几何'},
{id:'alva-vanity',name:'洗手台与镜柜',width:0.6,depth:0.45,height:1.7,material:'wood',color:'#DDE7E2',license:'CC0 · alva原创程序几何'},
{id:'alva-shower',name:'小型玻璃淋浴间',width:0.8,depth:0.8,height:2.1,material:'glass',color:'#D7E6E1',license:'CC0 · alva原创程序几何'},
{id:'alva-toilet',name:'坐便器',width:0.4,depth:0.65,height:0.8,material:'stone',color:'#F4F3EE',license:'CC0 · alva原创程序几何'},
] as {id:string;name:string;width:number;depth:number;height:number;material:string;color:string;license:string}[];
export function emptyProject(name='我们的家'):Project{return {roomLabelPositions:{},zones:[],scopeRequests:[],purposeConfirmations:[],layoutConfirmations:[],id:randomUUID(),name,revision:0,savedVersion:0,dirty:false,scene:null,candidate:null,answers:[],evidence:[],messages:[],findings:[],proposals:[],changes:[],archivedFurniture:[],assets:structuredClone(assets),topologyVersions:[],buildingState:{status:'idle',attempts:0,updatedAt:new Date().toISOString()},lastAnalysisEvidence:0,createdAt:new Date().toISOString()}}
export class DomainError extends Error{constructor(public statusCode:number,message:string){super(message)}}
export const reject=(message:string,status=422):never=>{throw new DomainError(status,message)};
export const distance=(a:XY,b:XY)=>Math.hypot(a.x-b.x,a.y-b.y);
const cross=(a:XY,b:XY,c:XY)=>(b.x-a.x)*(c.y-a.y)-(b.y-a.y)*(c.x-a.x);
export function pointInPolygon(p:XY,polygon:XY[]){let inside=false;for(let i=0,j=polygon.length-1;i<polygon.length;j=i++){const a=polygon[i],b=polygon[j];if(((a.y>p.y)!==(b.y>p.y))&&p.x<(b.x-a.x)*(p.y-a.y)/(b.y-a.y)+a.x)inside=!inside}return inside}
export function validateScene(raw:unknown):SceneData{
 const s=Scene.parse(raw);const ids=new Set<string>();for(const o of [...s.walls,...s.rooms,...s.openings,...s.items]){if(ids.has(o.id))reject('场景ID重复');ids.add(o.id)}
 for(const wall of s.walls)if(distance(wall.a,wall.b)<.05)reject('墙体长度不能为零');
 for(const room of s.rooms){
  const p=room.polygon;let area=0;for(let i=0;i<p.length;i++){const a=p[i],b=p[(i+1)%p.length];area+=a.x*b.y-b.x*a.y;if(distance(a,b)<.01)reject('房间轮廓有重复顶点');for(let j=i+2;j<p.length;j++){if(i===0&&j===p.length-1)continue;const c=p[j],d=p[(j+1)%p.length];if(cross(a,b,c)*cross(a,b,d)<0&&cross(c,d,a)*cross(c,d,b)<0)reject('房间轮廓自交，请修正')}}if(Math.abs(area)<.1)reject('房间面积无效');
 }
 for(const o of s.openings){const w=s.walls.find(w=>w.id===o.wallId);if(!w)reject(`门窗${o.id}未关联墙体`);const len=distance(w!.a,w!.b);if(o.width>len+.01||o.offset*len-o.width/2<-.01||o.offset*len+o.width/2>len+.01)reject(`门窗${o.id}超出墙体${w!.id}范围：墙长${len.toFixed(3)}，中心比例${o.offset}，开口宽${o.width}`);if(o.sill+o.height>w!.height+.01)reject(`门窗${o.id}超出墙高${w!.height.toFixed(2)}m：窗台${o.sill.toFixed(2)}m + 高${o.height.toFixed(2)}m`)}
 for(let i=0;i<s.openings.length;i++){const a=s.openings[i],wa=s.walls.find(w=>w.id===a.wallId);if(!wa)continue;const len=distance(wa.a,wa.b),a0=a.offset*len-a.width/2,a1=a.offset*len+a.width/2;for(let j=i+1;j<s.openings.length;j++){const b=s.openings[j];if(a.wallId!==b.wallId)continue;const b0=b.offset*len-b.width/2,b1=b.offset*len+b.width/2;if(Math.min(a1,b1)-Math.max(a0,b0)>.01)reject(`门窗${a.id}与${b.id}在墙${a.wallId}上重叠，请调整位置或宽度`)}}
 for(const i of s.items){if(!s.rooms.some(r=>r.id===i.roomId))reject('家具未关联有效房间');if(!assets.some(a=>a.id===i.assetId))reject('资产不在许可目录')}
 return s;
}
export function calibrate(scene:SceneData,wallId:string,length:number,source:string):SceneData{
 const s=structuredClone(scene),wall=s.walls.find(w=>w.id===wallId);if(!wall)reject('请选择标定墙');if(!(length>.1&&length<=100)||!source.trim())reject('请提供有效长度与来源');
 const ratio=length/distance(wall!.a,wall!.b);for(const w of s.walls){for(const p of [w.a,w.b]){p.x*=ratio;p.y*=ratio}w.thickness=Math.max(.05,Math.min(1,w.thickness*ratio))}
 for(const r of s.rooms)for(const p of r.polygon){p.x*=ratio;p.y*=ratio}
 for(const o of s.openings)o.width*=ratio;
 for(const i of s.items){i.x*=ratio;i.y*=ratio;i.width*=ratio;i.depth*=ratio}
 s.calibration={wallId,length,source,confirmed:true};return validateScene(s);
}
export function itemFromAsset(assetId:string,roomId:string,x:number,y:number):ItemData{
 const a=assets.find(a=>a.id===assetId);if(!a)reject('资产不存在');return Item.parse({id:randomUUID(),assetId,roomId,name:a!.name,x,y,width:a!.width,depth:a!.depth,height:a!.height,rotation:0,color:a!.color,material:a!.material,clearance:0,locked:false});
}
