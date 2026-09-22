import assert from 'node:assert/strict';
import {mkdir,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {chromium} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';

const fixture=process.env.ALVA019_AUDIO_FIXTURE;if(!fixture)throw Error('ALVA019_AUDIO_FIXTURE is required');
const audioPath=resolve(fixture),evidenceDir=resolve(process.env.ALVA019_EVIDENCE_DIR||'evidence/alva-019-round2');await mkdir(evidenceDir,{recursive:true});
const priorCode=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva019-browser-code-123456';
const store=new AlvaStore();await store.init();const created=await store.create('ALVA-019 round2');await store.ensureAccessCode(created.project.id);
const port=Number(process.env.ALVA019_PORT||43119),base=`http://127.0.0.1:${port}`;const app=await buildAlva(store,{assets:true,origin:base,chatCodex:async()=> '收到修正后的语音文字。'});await app.listen({host:'127.0.0.1',port});
const browser=await chromium.launch({headless:true,args:['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream',`--use-file-for-fake-audio-capture=${audioPath}`]});const context=await browser.newContext({permissions:['microphone'],baseURL:base});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error'&&!m.text().includes('401 (Unauthorized)'))errors.push(m.text())});
try{
 await page.goto('/');await page.getByPlaceholder('输入项目发起人提供的验证码').fill('alva019-browser-code-123456');await page.getByRole('button',{name:'验证并进入 →'}).click();const input=page.getByRole('textbox',{name:'咨询消息'});await input.fill('取消前保留文本');
 await page.getByRole('button',{name:'开始录音'}).click();await page.getByRole('button',{name:'取消录音'}).waitFor({state:'visible'});await page.getByRole('button',{name:'取消录音'}).click();await page.getByRole('button',{name:'开始录音'}).waitFor({state:'visible'});assert.equal(await input.inputValue(),'取消前保留文本');assert.equal((await store.get(created.project.id)).messages.length,0);
 await input.fill('');await page.getByRole('button',{name:'开始录音'}).click();await page.getByRole('button',{name:'停止录音'}).waitFor({state:'visible'});await page.waitForTimeout(3500);await page.getByRole('button',{name:'停止录音'}).click();await page.waitForFunction(()=>{const el=document.querySelector('textarea[aria-label="咨询消息"]') as HTMLTextAreaElement|null;return !!el?.value.trim()&&!document.body.textContent?.includes('正在转成可编辑文字')},{timeout:90000});
 const transcribed=await input.inputValue();assert.ok(transcribed.trim());assert.equal((await store.get(created.project.id)).messages.length,0);await page.screenshot({path:resolve(evidenceDir,'simulated-microphone-transcribed.png'),fullPage:true});
 const corrected='ALVA019_EDITED_FROM_SIMULATED_MIC';await input.fill(corrected);await page.getByRole('button',{name:'发送 ↑'}).click();await page.waitForFunction((text:string)=>document.body.textContent?.includes('收到修正后的语音文字。')&&document.body.textContent?.includes(text),corrected,{timeout:30000});
 const project=await store.get(created.project.id),lastUser=[...project.messages].reverse().find(m=>m.role==='user');assert.equal(lastUser?.text,corrected);assert.equal(project.evidence.at(-1)?.quote,corrected);assert.notEqual(lastUser?.text,transcribed);assert.equal(errors.length,0,errors.join('\n'));await page.getByRole('button',{name:'开始录音'}).waitFor({state:'visible'});await page.screenshot({path:resolve(evidenceDir,'simulated-microphone-sent.png'),fullPage:true});
 const result={ticket:'ALVA-019',round:2,source:'simulated-microphone',provider:'real-transcription',cancelRecordingPreservedText:true,cancelRecordingDidNotSend:true,transcriptLength:transcribed.length,transcriptPreview:transcribed.slice(0,120),editedText:corrected,storedUserText:lastUser?.text,audioPersisted:false,recordingButtonReset:true,consoleErrors:errors.length,physicalMicrophone:'pending-no-physical-device-in-cloud-runner',passed:true};await writeFile(resolve(evidenceDir,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await context.close();await browser.close();await app.close();await store.close();if(priorCode===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=priorCode}
