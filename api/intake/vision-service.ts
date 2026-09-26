import type {Project} from '../model.js';
import {reject} from '../model.js';
import {cards,validation,activeAnswers,type Answers,type Response} from '../../packages/contracts/alva/home-vision/flow.js';
const cursors=new Set([...cards.map(card=>card.card),'S3_frame','complete',...Array.from({length:7},(_,i)=>`summary:S${i+1}`)]);
export function saveVisionResponse(p:Project,b:{id:string;name:string;expectedVersion:number;cursor:string;answers:Answers}):Response{
 if(Object.keys(b.answers).length>110||JSON.stringify(b.answers).length>7000000)reject('Response is too large');
 if(!cursors.has(b.cursor))reject('Unknown questionnaire screen');
 const errors=validation(b.answers);if(errors.length)reject(errors[0]);
 p.homeVision??={version:'home-vision-v4',responses:[]};const previous=p.homeVision.responses.find(r=>r.id===b.id);
 if((previous?.version||0)!==b.expectedVersion)reject('These answers changed in another window. Reopen the questionnaire to review the latest version.',409);
 if(!previous&&p.homeVision.responses.length>=10)reject('Up to 10 separate responses per project');
 const changed=(id:string)=>JSON.stringify(previous?.answers[id])!==JSON.stringify(b.answers[id]);
 const effective=activeAnswers(b.answers);
 const chatAnswers=previous?.chatAnswers?.map(a=>a.status==='active'&&(changed(a.questionId)||(a.synced&&!effective[a.questionId]))?{...a,status:'superseded' as const}:a);
 const invalid=new Set(chatAnswers?.filter(a=>a.status==='superseded').map(a=>a.evidenceId));
 for(const job of p.answerRecommendations||[])if(invalid.has(job.evidenceId))job.status='invalidated';
 const response:Response={id:b.id,name:b.name,answers:b.answers,cursor:b.cursor,updatedAt:new Date().toISOString(),version:b.expectedVersion+1,...(chatAnswers?{chatAnswers}:{})};
 p.homeVision.responses=previous?p.homeVision.responses.map(r=>r.id===b.id?response:r):[...p.homeVision.responses,response];p.dirty=true;return response;
}
