import test from 'node:test';
import assert from 'node:assert/strict';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';

const wav=()=>{const b=Buffer.alloc(48);b.write('RIFF',0);b.writeUInt32LE(40,4);b.write('WAVEfmt ',8);b.writeUInt32LE(16,16);b.writeUInt16LE(1,20);b.writeUInt16LE(1,22);b.writeUInt32LE(16000,24);b.writeUInt32LE(32000,28);b.writeUInt16LE(2,32);b.writeUInt16LE(16,34);b.write('data',36);b.writeUInt32LE(4,40);return b.toString('base64')};
async function setup(transcriptionCall:(data:string,format:'wav',signal:AbortSignal)=>Promise<string>){
 const prior=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva019-test-code-123456';
 const store=new AlvaStore();await store.init();const created=await store.create('ALVA-019');await store.ensureAccessCode(created.project.id);const app=await buildAlva(store,{assets:false,origin:'http://localhost',transcriptionCall});
 const login=await app.inject({method:'POST',url:'/api/access',headers:{origin:'http://localhost'},payload:{code:'alva019-test-code-123456'}});assert.equal(login.statusCode,200);const headers={cookie:`alva_session=${login.cookies[0].value}`,origin:'http://localhost'};
 return {store,app,created,headers,close:async()=>{await app.close();await store.close();if(prior===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=prior}};
}

test('ALVA-019 successful WAV transcription returns editable text without persisting audio or sending chat',async()=>{
 let calls=0;const expected=wav();const ctx=await setup(async(data,format,signal)=>{calls++;assert.equal(data,expected);assert.equal(format,'wav');assert.equal(signal.aborted,false);return '原始转写文本'});
 try{const before=await ctx.store.get(ctx.created.project.id),response=await ctx.app.inject({method:'POST',url:'/api/transcribe',headers:ctx.headers,payload:{data:expected,format:'wav'}});assert.equal(response.statusCode,200);assert.deepEqual(response.json(),{text:'原始转写文本'});assert.equal(calls,1);const after=await ctx.store.get(ctx.created.project.id);assert.equal(after.revision,before.revision);assert.deepEqual(after.messages,before.messages);assert.deepEqual(after.evidence,before.evidence)}finally{await ctx.close()}
});

test('ALVA-019 cancellation aborts transcription and leaves project untouched',async()=>{
 let started!:()=>void;const ready=new Promise<void>(r=>started=r);const ctx=await setup(async(_data,_format,signal)=>new Promise<string>((_resolve,reject)=>{started();signal.addEventListener('abort',()=>reject(new Error('aborted')),{once:true})}));
 try{const before=await ctx.store.get(ctx.created.project.id),pending=ctx.app.inject({method:'POST',url:'/api/transcribe',headers:ctx.headers,payload:{data:wav(),format:'wav'}});await ready;const cancel=await ctx.app.inject({method:'POST',url:'/api/transcribe/cancel',headers:ctx.headers,payload:{}});assert.equal(cancel.statusCode,200);assert.deepEqual(cancel.json(),{cancelled:true});const response=await pending;assert.equal(response.statusCode,409);assert.match(response.json().error,/转写已取消/);const after=await ctx.store.get(ctx.created.project.id);assert.equal(after.revision,before.revision);assert.deepEqual(after.messages,before.messages);assert.deepEqual(after.evidence,before.evidence)}finally{await ctx.close()}
});

test('ALVA-019 provider failure and invalid WAV never create chat/evidence side effects',async()=>{
 let calls=0;const ctx=await setup(async()=>{calls++;throw new Error('provider unavailable')});
 try{const before=await ctx.store.get(ctx.created.project.id),failed=await ctx.app.inject({method:'POST',url:'/api/transcribe',headers:ctx.headers,payload:{data:wav(),format:'wav'}});assert.equal(failed.statusCode,503);assert.match(failed.json().error,/转写失败/);const invalid=await ctx.app.inject({method:'POST',url:'/api/transcribe',headers:ctx.headers,payload:{data:Buffer.from('not wav').toString('base64'),format:'wav'}});assert.equal(invalid.statusCode,422);assert.equal(calls,1);const after=await ctx.store.get(ctx.created.project.id);assert.equal(after.revision,before.revision);assert.deepEqual(after.messages,before.messages);assert.deepEqual(after.evidence,before.evidence)}finally{await ctx.close()}
});
