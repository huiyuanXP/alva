import assert from 'node:assert/strict';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {dirname,resolve} from 'node:path';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {chatModels} from '../api/chat.js';

const fixture=process.env.ALVA019_AUDIO_FIXTURE;if(!fixture)throw Error('ALVA019_AUDIO_FIXTURE is required');
const evidenceDir=resolve(process.env.ALVA019_EVIDENCE_DIR||'evidence/alva-019-round1');await mkdir(evidenceDir,{recursive:true});
const audio=await readFile(fixture);assert.equal(audio.subarray(0,4).toString(),'RIFF');assert.equal(audio.subarray(8,12).toString(),'WAVE');
const priorCode=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva019-acceptance-code-123456';
const store=new AlvaStore();await store.init();const created=await store.create('ALVA-019 round1');await store.ensureAccessCode(created.project.id);
const app=await buildAlva(store,{assets:false,origin:'http://127.0.0.1',chatCodex:async()=> '收到你修正后的文字。'});await app.listen({host:'127.0.0.1',port:0});const address=app.server.address();if(!address||typeof address==='string')throw Error('missing address');const base=`http://127.0.0.1:${address.port}`;
try{
 const login=await fetch(base+'/api/access',{method:'POST',headers:{origin:'http://127.0.0.1','content-type':'application/json'},body:JSON.stringify({code:'alva019-acceptance-code-123456'})});assert.equal(login.status,200);const cookie=login.headers.get('set-cookie')?.split(';')[0];assert.ok(cookie);const headers={origin:'http://127.0.0.1',cookie,'content-type':'application/json'};
 const before=await store.get(created.project.id);const tr=await fetch(base+'/api/transcribe',{method:'POST',headers,body:JSON.stringify({data:audio.toString('base64'),format:'wav'})});const transcription=await tr.json() as {text?:string;error?:string};assert.equal(tr.status,200,transcription.error);assert.ok(transcription.text?.trim());
 const untouched=await store.get(created.project.id);assert.equal(untouched.revision,before.revision);assert.equal(untouched.messages.length,before.messages.length);assert.equal(untouched.evidence.length,before.evidence.length);
 const corrected='ALVA019_CORRECTED_TEXT_用户已经修改转写内容';const chat=await fetch(base+'/api/chat',{method:'POST',headers,body:JSON.stringify({requestId:crypto.randomUUID(),expectedRevision:untouched.revision,text:corrected,roomId:null,model:chatModels[0]})});assert.equal(chat.status,200,await chat.text().catch(()=>''));await chat.text().catch(()=>{});
 const after=await store.get(created.project.id),lastUser=[...after.messages].reverse().find(m=>m.role==='user');assert.equal(lastUser?.text,corrected);assert.equal(after.evidence.at(-1)?.quote,corrected);assert.notEqual(lastUser?.text,transcription.text);
 const result={ticket:'ALVA-019',round:1,source:'file',provider:'real',fixtureBytes:audio.length,transcriptLength:transcription.text!.length,transcriptPreview:transcription.text!.slice(0,120),projectRevisionBefore:before.revision,projectRevisionAfterTranscription:untouched.revision,sentText:corrected,storedUserText:lastUser?.text,storedEvidenceQuote:after.evidence.at(-1)?.quote,audioPersisted:false,passed:true};
 await writeFile(resolve(evidenceDir,'result.json'),JSON.stringify(result,null,2));console.log(JSON.stringify(result,null,2));
}finally{await app.close();await store.close();if(priorCode===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=priorCode}
