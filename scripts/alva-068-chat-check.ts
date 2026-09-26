/** Real main Chat/MCP and browser acceptance, with synthetic building and respondents. */
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {createServer} from 'node:net';
import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {seedLivingStage} from '../tests/fixtures/alva/living-stage.js';
import {saveVisionResponse} from '../api/intake/vision-service.js';
import {items,options} from '../packages/contracts/alva/home-vision/flow.js';
import {outcomeAnswer} from '../packages/contracts/alva/consultation-question.js';
const step=process.argv[2],root=resolve(process.argv[3]||'.runtime/alva068-joint');
assert.ok(root.startsWith(resolve('.runtime')+'/alva068-'));
const run=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA068-'+step,out=resolve('evidence',run);
await mkdir(root,{recursive:true});await mkdir(out,{recursive:true});
process.env.ALVA_AGENT_DIR=resolve(root,'agents');process.env.ALVA_DATA_DIR=resolve(root,'data');process.env.ALVA_UPLOAD_DIR=resolve(root,'uploads');process.env.ALVA_ACCESS_CODE_FILE=resolve(root,'access-code');process.env.OPENAI_API_KEY||=process.env.NEWAPI_KEY;
const store=new AlvaStore(resolve(root,'db'));await store.init();
let state:{projectId:string;respondentId:string;otherId:string;cardId?:string;selectedText?:string;firstThread?:string;originalScene?:unknown;otherAnswers?:unknown};
if(step==='seed'){
 const {project}=await store.create('ALVA-068 合成扩展问答验收');state={projectId:project.id,respondentId:randomUUID(),otherId:randomUUID()};
 await store.mutate(project.id,randomUUID(),0,'synthetic-prerequisite',{},p=>{seedLivingStage(p);for(const [id,name]of [[state.respondentId,'Alex（合成）'],[state.otherId,'Sam（合成）']])saveVisionResponse(p,{id,name,expectedVersion:0,cursor:'Q07',answers:{Q01a:{state:'answered',value:'Q01a.refresh'},Q05a:{state:'answered',value:['Q05a.entry','Q05a.living']}}});});
 const p=await store.get(project.id);state.originalScene=p.scene;state.otherAnswers=p.homeVision!.responses[1].answers;
}else state=JSON.parse(await readFile(resolve(root,'state.json'),'utf8'));
await store.ensureAccessCode(state.projectId);
const probe=createServer();await new Promise<void>(r=>probe.listen(0,'127.0.0.1',r));const port=(probe.address() as any).port;await new Promise<void>(r=>probe.close(()=>r()));const origin=`http://127.0.0.1:${port}`;
const app=await buildAlva(store,{origin,automaticRecommendations:false});await app.listen({host:'127.0.0.1',port});const session=await store.issueInternalSession(state.projectId);
const headers={cookie:`alva_session=${session.token}`,'Content-Type':'application/json',origin};
const get=()=>store.get(state.projectId),command=async()=>({requestId:randomUUID(),expectedRevision:(await get()).revision});
const http=async(path:string,body?:unknown)=>{const response=await fetch(origin+'/api'+path,{method:body?'POST':'GET',headers,...(body?{body:JSON.stringify(body)}:{})});return {status:response.status,data:await response.json() as any}};
let browser:Awaited<ReturnType<typeof chromium.launch>>|undefined;
const checks:Record<string,unknown>={syntheticBuilding:true,automaticFurnitureDrain:false},errors:string[]=[];
try{
 if(step==='model-style'||step==='model-cabinet'||step==='model-followup'){
  assert.ok(process.env.OPENAI_API_KEY);
  const before=await get(),person=before.homeVision!.responses.find(r=>r.id===state.respondentId)!;
  const text=step==='model-style'?'我喜欢浅木色，但还不确定整体怎么搭。请先猜我的需求，标明依据和不确定项，再用原生Q07a出一道扩展问题。每个选项给出墙面、地板、标准柜或家具搭配后的具体样子和取舍，至少提供一个能纠正你猜测的不同方向。只出题卡，不替我回答或采用。':step==='model-cabinet'?'我回家常把包和钥匙放在桌上，想看看标准柜能怎样帮忙。请先猜我的需求，用原生Q12a出一道扩展问题，以标准柜组合的具体使用结果、示例和取舍来询问。只提出题卡，不替我确认。':'我已在独立问卷将Q07a改成了冷白灰。请实际读取同一填写者最新的Q07a，不沿用旧的浅木色结论；基于这个修改先猜需求，再出一道Q07a扩展问题，只出题卡。';
  const response=await fetch(origin+'/api/chat',{method:'POST',headers,body:JSON.stringify({...await command(),respondentId:state.respondentId,text,roomId:'room',model:'gemini-3.8-flash-high'}),signal:AbortSignal.timeout(150000)});const body=await response.text();await writeFile(resolve(root,run+'-sse.txt'),body);
  assert.equal(response.status,200);assert.ok(body.includes('event: done'),body.slice(-2500));const p=await get(),message=p.messages.at(-1)!;
  for(const name of ['read_question_context','ask_question'])assert.ok(message.toolCalls?.some(c=>c.name===name&&!c.isError),JSON.stringify(message));
  const card=p.visionQuestions!.filter(c=>c.status==='awaiting_owner_confirmation').at(-1)!;assert.ok(card.hypothesis&&card.uncertainty&&card.options.every(o=>o.outcome&&o.example&&o.tradeoff));assert.equal(card.respondentId,state.respondentId);assert.equal(card.responseVersion,person.version);
  assert.deepEqual(p.homeVision,before.homeVision);assert.deepEqual(p.scene,before.scene);assert.equal(p.answerRecommendations?.length||0,before.answerRecommendations?.length||0);
  const thread=(await store.chatState(p.id)).threads.living.threadId!;assert.ok(thread);if(state.firstThread)assert.equal(thread,state.firstThread);else state.firstThread=thread;
  state.cardId=card.id;checks.card=card;checks.toolCalls=message.toolCalls;checks.reply=message.text;checks.originalThreadResumed=!!state.firstThread;checks.guessDidNotWriteAnswers=true;
 }else if(step==='browser-confirm'||step==='browser-followup'){
  const p=await get(),card=p.visionQuestions!.find(c=>c.id===state.cardId)!,jobs=p.answerRecommendations?.length||0;
  browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--renderer-process-limit=1']});
  const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));
  await page.context().addCookies([{name:'alva_session',value:session.token,url:origin,httpOnly:true,sameSite:'Strict'}]);await page.goto(origin);await page.getByLabel('咨询消息').waitFor();
  const panel=page.getByTestId('vision-chat-question').filter({hasText:card.question});await panel.waitFor();assert.ok(await panel.getByText('先猜你的需求 · 尚未确认').isVisible());
  for(const width of [1280,390]){await page.setViewportSize({width,height:900});await panel.locator('.choices button').first().click();assert.equal((await get()).homeVision!.responses.find(r=>r.id===state.respondentId)!.version,card.responseVersion);await page.screenshot({path:resolve(out,`${width}-question.png`),fullPage:true})}
  await panel.getByRole('button',{name:'确认这个回答',exact:true}).click();await panel.waitFor({state:'hidden'});
  const after=await get(),person=after.homeVision!.responses.find(r=>r.id===state.respondentId)!;assert.deepEqual(person.answers[card.questionId].value,card.options[0].value);assert.equal(person.chatAnswers!.at(-1)!.text,outcomeAnswer(card.options[0]));assert.equal(after.answerRecommendations?.length,jobs+1);assert.deepEqual(after.scene,state.originalScene);assert.deepEqual(after.homeVision!.responses.find(r=>r.id===state.otherId)!.answers,state.otherAnswers);
  state.selectedText=outcomeAnswer(card.options[0]);await page.reload();await page.getByRole('button',{name:'Your Home Vision',exact:true}).click();const dialog=page.getByRole('dialog');await dialog.getByTestId('vision-chat-answers').waitFor();assert.ok((await dialog.getByTestId('vision-chat-answers').innerText()).includes(card.options[0].example));
  if(card.questionId==='Q07a'){const selected=dialog.locator('[role=radio][aria-checked="true"]');assert.equal(await selected.count(),1);const label=options(items.find(i=>i.id==='Q07a')!,person.answers).find(o=>o.id===card.options[0].value)!.label;assert.ok((await selected.innerText()).includes(label));checks.nativeSelectedLabel=label}
  if(card.questionId==='Q12a'){
   await dialog.getByRole('button',{name:'Review',exact:true}).click();await dialog.getByRole('button',{name:/Room by room/}).click();
   const saved=page.waitForResponse(r=>r.url().endsWith('/api/intake/vision')&&r.request().method()==='POST'&&JSON.parse(r.request().postData()||'{}').cursor==='Q12');
   await dialog.getByRole('button',{name:/What does your entryway need/}).click();await saved;
   const labels=options(items.find(i=>i.id==='Q12a')!,person.answers).filter(o=>(card.options[0].value as string[]).includes(o.id)).map(o=>o.label);
   for(const label of labels)assert.equal(await dialog.getByRole('checkbox',{name:label,exact:false}).getAttribute('aria-checked'),'true');checks.nativeSelectedLabels=labels;
  }
  await page.screenshot({path:resolve(out,'independent-form.png'),fullPage:true});
  await dialog.getByRole('combobox',{name:'Respondent',exact:true}).selectOption(state.otherId);assert.equal(await dialog.getByTestId('vision-chat-answers').count(),0);checks.otherPersonUnchanged=true;
  checks.syncedNativeAndDetails=true;checks.pendingFurnitureJob=true;checks.pageErrors=errors;assert.deepEqual(errors,[]);
 }else if(step==='form-edit'){
  const p=await get(),r=p.homeVision!.responses.find(r=>r.id===state.respondentId)!;
  browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--renderer-process-limit=1']});
  const page=await browser.newPage({viewport:{width:1280,height:900}});page.setDefaultTimeout(20000);page.on('pageerror',e=>errors.push(e.message));await page.context().addCookies([{name:'alva_session',value:session.token,url:origin,httpOnly:true,sameSite:'Strict'}]);await page.goto(origin);await page.getByRole('button',{name:'Your Home Vision',exact:true}).click();
  const dialog=page.getByRole('dialog');await dialog.getByRole('radio',{name:'Cool whites, grays',exact:false}).waitFor();
  const saved=page.waitForResponse(r=>r.url().endsWith('/api/intake/vision')&&r.request().method()==='POST');await dialog.getByRole('radio',{name:'Cool whites, grays',exact:false}).click();const response=await saved;assert.equal(response.status(),200,await response.text());
  const changed=(await get()).homeVision!.responses.find(r=>r.id===state.respondentId)!;assert.equal(changed.answers.Q07a.value,'Q07a.cool_gray');assert.ok(changed.chatAnswers!.filter(a=>a.questionId==='Q07a').every(a=>a.status==='superseded'));assert.deepEqual(errors,[]);
  await page.screenshot({path:resolve(out,'independent-form-edited.png'),fullPage:true});
  checks.independentFormChanged=true;
 }else if(step!=='seed')throw Error('Unknown step');
 const after=await get();assert.deepEqual(after.scene,state.originalScene);assert.deepEqual(after.homeVision!.responses.find(r=>r.id===state.otherId)!.answers,state.otherAnswers);
 await writeFile(resolve(root,'state.json'),JSON.stringify(state,null,2));await writeFile(resolve(out,'result.json'),JSON.stringify({passed:true,step,checks},null,2));console.log(out);
}catch(e){await writeFile(resolve(out,'failure.json'),JSON.stringify({step,message:String(e),checks,pageErrors:errors},null,2));throw e}
finally{await browser?.close();await app.close();await store.close()}
