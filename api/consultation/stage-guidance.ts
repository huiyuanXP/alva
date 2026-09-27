import {createHash} from 'node:crypto';
import type {Project} from '../model.js';
import type {StageChatState} from '../mcp/sessions.js';
import type {BusinessTool} from '../codex.js';
import {activeAnswers,answered,prompt} from '../../packages/contracts/alva/home-vision/flow.js';
import {visibleVisionItems} from './vision-questions.js';
import {McpError} from '../mcp/contracts.js';

export function stageGuidance(p:Project,s:StageChatState,respondentId?:string){
 let step='upload',instruction='请在对话框点击＋上传户型图（图片或PDF），发送后我会分析。',questionId:string|undefined,chatSupported=false,pendingQuestion=false;
 const people=p.homeVision?.responses||[];
 const person=respondentId?people.find(r=>r.id===respondentId):people.length===1?people[0]:undefined;
 if(s.active==='floorplan'){
  if(p.confirmedBuilding){step='enter_living';instruction='建筑已经确认，可点击生活设计继续需求问卷；不要要求重做上传、校准或建筑确认。'}
  else if(p.buildingCandidate){step='confirm_building';instruction='请预览建筑3D；调用 request_building_confirmation 出示确认卡。用户确认后进入生活设计。'}
  else if(p.confirmedTopology){step='generate_building';instruction='拓扑已确认，下一步请点击生成建筑3D或发消息让我生成，完成预览和建筑确认后进入生活设计。'}
  else if(p.candidate?.calibration?.confirmed){step='inspect';instruction='必须实际调用 inspect_topology 自查。解释 analysis.issues 与 repair；issue=null不代表无告警。存在问题则定位并引导修复；只有实际检查通过才出示 request_topology_confirmation，随后生成并确认建筑3D。不能把几何自查当成原图准确或工程安全保证。'}
  else if(p.candidate){step='review_calibrate';instruction='户型已分析，不再要求上传。先引导对照原图核对、删除或修改墙体；门窗位置有误可告诉我具体位置让我修改。核对完成后请点击一条已知实际长度的墙，填写墙长和来源进行长度校准；不要猜测尺寸。校准后我会自行检查。'}
  else if(p.importState?.status==='failed'||p.importState?.status==='cancelled'){step='retry_import';instruction='上次户型识别未完成，不能当成已分析。引导用户重试原消息；附件仍在输入区时可直接重发，刷新后可重新添加同一附件。不要把模型输出失败说成图片损坏，也不必要求更换原图。'}
  else if(p.importState?.status==='processing'){step='wait_import';instruction='户型正在识别，请等待本轮完成。若服务曾中断而没有后续结果，可重试原请求；当前不能声称已经分析完成。'}
 }else if(people.length>1&&!person||respondentId&&!person){step='select_respondent';instruction='请在Chat“为谁填写”选择本人后继续，不能混用不同人的回答。实际调用 read_question_context，按返回的填写者错误解释。'}
 else{
  const response=person||{id:'draft',name:'我的回答',answers:{},cursor:'Q01',version:0,updatedAt:''};
  const answers=activeAnswers(response.answers);
  const next=visibleVisionItems(response).find(i=>!answers[i.id]||(answers[i.id].state==='answered'&&!answered(answers,i.id)));
  if(next){questionId=next.id;chatSupported=['single','multi','text','number','date'].includes(next.type);pendingQuestion=!!p.visionQuestions?.some(q=>q.status==='awaiting_owner_confirmation'&&q.topologyVersion===(p.confirmationVersions?.topology??0)&&q.questionId===next.id&&(!people.length||q.respondentId===person?.id&&q.responseVersion===person?.version));step='question';instruction=`先实际调用 read_question_context({questionId:"${next.id}"}) 查询当前填写者的问题与选项。下一题是 ${next.id}：${prompt(next,response.answers)}。${chatSupported?(pendingQuestion?'已有同题待确认卡，请引导用户回答该卡，不重复创建。':'调用 ask_question 只为这一题生成一张待确认卡，引导用户选择；信息不足时不推荐，不编造需求。'):'本题需要复杂表单或附件，引导用户打开 Your Home Vision 完成此题，不能假装已经读取附件。'}跳过已回答、明确不知道或跳过的题目。`}
  else{step='design';instruction='先实际调用 read_question_context 核实问卷进度；当前可见题目均已处理，引导选择房间讨论布局、家具或风格，不重问已完成事项。'}
 }
 const checkpoint=s.active==='floorplan'?{candidate:step==='inspect'?p.candidate:!!p.candidate,topology:p.confirmedTopology?.id,building:!!p.buildingCandidate,confirmed:!!p.confirmedBuilding}:{person:person?.id|| (people.length?'selection':'draft'),answers:person?activeAnswers(person.answers):{},questionId};
 const key=createHash('sha256').update(JSON.stringify({stage:s.active,generation:s.generation,step,checkpoint})).digest('hex');
 const previous=p.messages.filter(m=>m.role==='assistant'&&m.status==='completed'&&(!m.stage||m.stage===s.active));
 return {key,stage:s.active,step,first:previous.length===0,instruction,questionId,chatSupported,pendingQuestion,needed:previous.findLast(m=>m.guidanceKey)?.guidanceKey!==key};
}
export type StageGuidance=ReturnType<typeof stageGuidance>;
export function guidancePrompt(g:StageGuidance){return `这是系统发起的阶段引导轮，不是用户原话，不得作为用户需求证据。先通过 MCP get_stage_guidance 读取真实断点，再执行其中要求的只读检查或待确认题卡。${g.first?(g.stage==='floorplan'?'先简短自我介绍“我是你的户型规划专家”。':'先欢迎用户进入生活设计，说明可以梳理生活需求、规划布局、家具与风格。'):'这是恢复或进度接续，不重复欢迎、自我介绍和已完成步骤，直接从未完成操作接着引导。'}正文用2至4句简短引导，不复述题卡的全部选项，不展示工具名、内部字段或问卷题号；用用户看得懂的操作说明。每轮清楚告诉用户当前下一步怎么做；不要一次罗列整份问卷。不得修改设计、编造长度或替用户确认。${g.instruction}`}
const allowed=new Set(['get_stage_guidance','get_snapshot','inspect_topology','read_question_context','ask_question','request_topology_confirmation','request_building_confirmation']);
export function guidancePacks<T extends Record<'floorplan'|'living',BusinessTool[]>>(packs:T,automatic?:boolean):T{return automatic?Object.fromEntries(Object.entries(packs).map(([stage,tools])=>[stage,tools.filter(t=>allowed.has(t.name))])) as T:packs}
export function guidanceError(message:string):never{throw new McpError({code:'GUIDANCE_UNVERIFIED',message,retryable:true,repairActions:[{action:'retry_guidance',message:'点击重试引导，重新读取当前阶段、检查或问卷后继续。'}]})}
export function verifyGuidance(g:StageGuidance,calls:NonNullable<Project['messages'][number]['toolCalls']>){
 const done=(name:string)=>calls.some(c=>c.name===name&&!c.isError);
 if(!done('get_stage_guidance'))guidanceError('尚未读取当前阶段断点');
 if(g.step==='inspect'&&!done('inspect_topology'))guidanceError('尚未实际执行户型检查');
 if(g.stage==='living'&&!done('read_question_context')&&!(g.step==='select_respondent'&&calls.some(c=>c.name==='read_question_context'&&['VISION_RESPONDENT_REQUIRED','VISION_RESPONDENT_MISSING'].includes(c.errorCode||''))))guidanceError('尚未实际查询问卷');
 if(g.questionId&&g.chatSupported&&!g.pendingQuestion&&!done('ask_question'))guidanceError('尚未生成当前未完成问题的题卡');
}
