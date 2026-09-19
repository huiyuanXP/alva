import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {sampleProject} from '../apps/api/sample.js';
import {intakeContext,intakeTools} from '../apps/api/agent-intake-tools.js';
import {Store} from '../apps/api/store.js';

test('selected older attachments take precedence; long questionnaire/document content has bounded explicit excerpts',()=>{
 const p=sampleProject(randomUUID()),selected=randomUUID();p.attachments=Array.from({length:10},(_,i)=>({id:i===0?selected:randomUUID(),room_id:'living',message_id:randomUUID(),mime:'text/plain',status:'analyzed',extracted_text:'x'.repeat(40000)}));
 p.messages.push({id:randomUUID(),role:'user',room_id:'living',run_id:randomUUID(),content:'请参考第一份文档',status:'complete',created_at:new Date().toISOString(),attachment_ids:[selected]});
 p.intake_answers=[{id:randomUUID(),question_id:'Q01',room_id:null,answer_text:'长回答'.repeat(900),answer_state:'answered',confirmation_state:'confirmed',source:'owner',choice:'E',evidence_ids:[],version:1,updated_at:new Date().toISOString()}];
 const context=intakeContext(p,'living');assert.equal(context.attachments[0].id,selected);assert.equal(context.attachments.length,6);assert.ok(context.attachments.every(a=>a.truncated&&a.extracted_text!.length<=1000));assert.equal(context.questionnaire.find(q=>q.question_id==='Q01')?.answer?.answer_text.length,180);assert.equal(context.questionnaire.find(q=>q.question_id==='Q01')?.answer?.truncated,true);
});
test('attachment excerpt tool is read-only, owner/current-room scoped and refuses arbitrary URL fetches',async()=>{
 const store=new Store();await store.init();try{
  let p=await store.create('owner');const id=randomUUID(),other=randomUUID();p=await store.mutate(p.id,'owner',randomUUID(),0,'fixture',{},p=>{p.attachments=[{id,room_id:'living',message_id:randomUUID(),mime:'text/plain',status:'analyzed',extracted_text:'0123456789参考事实'},{id:other,room_id:'room2',message_id:randomUUID(),mime:'text/plain',status:'analyzed',extracted_text:'不能读取其他房间'}];});
  const tool=intakeTools(store,{id:p.id,owner:'owner',room:'living',runId:randomUUID(),messageId:randomUUID(),baseVersion:p.version,cancelled:()=>false}).find(t=>t.name==='read_attachment_excerpt')!;
  const result=await tool.execute('test',{attachment_id:id,offset:2,length:5}),block=result.content.find(c=>c.type==='text')!;assert.equal(block.type,'text');const data=JSON.parse(block.type==='text'?block.text:'');assert.equal(data.text,'23456');assert.equal(data.next_offset,7);assert.equal(data.untrusted_reference,true);assert.equal((await store.get(p.id,'owner')).version,p.version);
  await assert.rejects(tool.execute('test',{attachment_id:other,offset:0,length:100}),/当前房间/);await assert.rejects(tool.execute('test',{attachment_id:'https://private.example',offset:0,length:100}),/当前房间/);await assert.rejects(tool.execute('test',{attachment_id:id,offset:0,length:5000}));
 }finally{await store.close();}
});
