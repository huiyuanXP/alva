import test from 'node:test';
import type {BusinessTool} from '../api/codex.js';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {translate,localeOf,outputLanguageInstruction} from '../packages/contracts/alva/i18n/locale.js';
import {withLanguage,currentLanguage,languagePacks} from '../api/i18n/context.js';
import {deliverySections} from '../api/delivery-content.js';
import {emptyProject} from '../api/model.js';
import {snapshotScene} from './fixtures/alva/snapshot.js';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';

test('ALVA-074 translation preserves interpolation and language contexts are isolated',async()=>{
 assert.equal(translate('户型导入','en'),'Floorplan import');assert.equal(translate('Floorplan import','zh'),'户型导入');
 assert.equal(translate('我的自定义房间甲','en'),'我的自定义房间甲');assert.equal(localeOf('en-US'),'en');
 assert.match(outputLanguageInstruction('en'),/English/);
 await Promise.all(['zh','en'].map(async locale=>withLanguage(locale as 'zh'|'en',async()=>{await new Promise(r=>setTimeout(r,10));assert.equal(currentLanguage(),locale)})));
 assert.equal(currentLanguage(),'zh');
 const project=emptyProject();project.name='我的原名';project.scene=snapshotScene();const parts=withLanguage('en',()=>deliverySections(project,'designer'));assert.match(parts[0][0],/Project/i);assert.ok(parts[0][1].includes('我的原名'));assert.doesNotMatch(parts.map(([title])=>title).join(' '),/[\u3400-\u9fff]/);
 const packs=languagePacks({floorplan:[] as BusinessTool[],living:[] as BusinessTool[]},'en');for(const stage of ['floorplan','living'] as const)assert.deepEqual(await packs[stage][0].run({}),{language:'en',outputLanguage:'English'});
});

test('ALVA-074 Chat uses selected language through stage MCP and keeps user evidence unchanged',async()=>{
 process.env.ALVA_ACCESS_CODE='alva074-synthetic-code';const store=new AlvaStore();await store.init();const {project}=await store.create('我的中文项目');await store.ensureAccessCode(project.id);
 const languages:string[]=[];const app=await buildAlva(store,{assets:false,automaticRecommendations:false,chatCodex:async input=>{
  const call=input.tools!.find(t=>t.name==='mcp_call_tool')!;const language:any=await call.run({name:'get_interface_language',arguments:{}});languages.push(language.language);
  assert.equal(input.language,language.language);assert.ok(input.text.includes(outputLanguageInstruction(language.language)));
  await call.run({name:'get_stage_guidance',arguments:{}});return language.language==='en'?'Please upload your floorplan.':'请上传户型图。';
 }});
 const auth=await app.inject({method:'POST',url:'/api/access',payload:{code:process.env.ALVA_ACCESS_CODE}});const headers={cookie:'alva_session='+auth.cookies[0].value,'x-alva-language':'en'};
 try{
  let p=await store.get(project.id);let response=await app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,text:'我想保留中文原话',roomId:null,model:'gemini-3.8-flash-high'}});assert.match(response.body,/event: done/);
  p=await store.get(p.id);assert.equal(p.evidence[0].quote,'我想保留中文原话');assert.equal(p.messages.at(-1)!.language,'en');assert.match(p.messages.at(-1)!.text,/Please upload/);
  const en=(await app.inject({url:'/api/chat/guidance?language=en',headers})).json();const zh=(await app.inject({url:'/api/chat/guidance?language=zh',headers})).json();assert.notEqual(en.key,zh.key);
  response=await app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,text:'继续',language:'zh',roomId:null,model:'gemini-3.8-flash-high'}});assert.match(response.body,/event: done/);assert.deepEqual(languages,['en','zh']);assert.equal((await store.get(p.id)).name,'我的中文项目');
 }finally{await app.close();await store.close();delete process.env.ALVA_ACCESS_CODE}
});

test('ALVA-074 English answer summaries keep the selected meaning and native values',async()=>{
 const {outcomeAnswer}=await import('../packages/contracts/alva/consultation-question.js');
 const option={id:'A',title:'A calmer room',outcome:'Keep the centre open',example:'Leave space to walk',tradeoff:'Less display storage',value:'Q01a.exploring'};
 assert.match(outcomeAnswer(option,'en'),/Example \(illustrative only, not adopted\)/);assert.doesNotMatch(outcomeAnswer(option,'en'),/[\u3400-\u9fff]/);assert.equal(option.value,'Q01a.exploring');
});
