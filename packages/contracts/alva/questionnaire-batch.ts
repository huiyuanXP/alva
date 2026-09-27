import {canonicalJson} from './canonical-json.js';
import {consultationVision,activeAnswers,type Vision} from './home-vision/flow.js';
export type QuestionnaireSnapshot={homeVision:ReturnType<typeof consultationVision>;answers:{questionId:string;roomId:string|null;text?:string;state:string;evidenceId:string}[]};
export type QuestionnaireDelivery={id:string;snapshot:QuestionnaireSnapshot;status:'running'|'completed'|'failed';error?:string};
type Source={homeVision?:Vision;answers:{questionId:string;roomId:string|null;text?:string;state:string;evidenceId:string;confirmed:boolean}[];questionnaireSent?:QuestionnaireSnapshot};
export function questionnaireSnapshot(p:Source):QuestionnaireSnapshot{
 const vision=consultationVision(p.homeVision);
 // Include unknown/skipped answers as explicit results, and omit attachment bytes.
 if(vision)for(const r of vision.responses){const raw=p.homeVision!.responses.find(x=>x.id===r.id)!;for(const [id,a] of Object.entries(activeAnswers(raw.answers)))if(a.state!=='answered')r.answers.push({id,prompt:id,field:undefined,value:{state:a.state}})}
 return {homeVision:vision,answers:p.answers.filter(a=>a.confirmed).map(({questionId,roomId,text,state,evidenceId})=>({questionId,roomId,text,state,evidenceId}))};
}
function entries(s:QuestionnaireSnapshot){
 const result:Record<string,string>={};
 for(const a of s.answers)result['legacy:'+a.questionId+':'+a.roomId]=canonicalJson(a);
 for(const r of s.homeVision?.responses||[]){
  for(const a of r.answers)result[r.id+':'+a.id]=canonicalJson({name:r.name,...a});
  for(const a of r.chatAnswers||[])result[r.id+':chat:'+a.questionId]=canonicalJson({name:r.name,...a});
 }
 return result;
}
export function questionnaireChanges(p:Source){
 const now=entries(questionnaireSnapshot(p)),sent=entries(p.questionnaireSent||{homeVision:undefined,answers:[]});
 return [...new Set([...Object.keys(now),...Object.keys(sent)])].filter(k=>now[k]!==sent[k]).length;
}
