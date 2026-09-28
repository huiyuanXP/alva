import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {applyChanges} from '../api/business.js';
import {publishProposals} from '../api/furniture/proposal-decisions.js';
import {seedLivingStage} from './fixtures/alva/living-stage.js';
import type {Proposal} from '../api/model.js';
const proposal=():Proposal=>({id:randomUUID(),title:'Move table',rationale:'Absolute destination',evidenceIds:[],baseRevision:0,status:'proposed',changes:[{action:'update',targetId:'table',values:{x:3,y:2}}]});

test('latest-scene adoption preserves manual attributes and unrelated furniture; conflicts remain atomic',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('concurrency');await store.ensureAccessCode(project.id);
 let p=await store.mutate(project.id,randomUUID(),0,'seed',{},p=>{seedLivingStage(p);publishProposals(p,[proposal()],'turn')});
 const app=await buildAlva(store,{assets:false}),headers={cookie:'alva_session='+(await store.issueInternalSession(p.id)).token};
 const accept=(id:string)=>app.inject({method:'POST',url:'/api/proposals/accept',headers,payload:{requestId:randomUUID(),expectedRevision:0,id,selectedIds:['table'],confirmed:true}});
 try{
  p=await store.mutate(p.id,randomUUID(),null,'manual',{},p=>{p.scene=applyChanges(p.scene!,[{action:'update',targetId:'table',values:{x:1.5,color:'#123456'}},{action:'add',targetId:'room',values:{assetId:'alva-chair',roomId:'room',x:4,y:1,newId:randomUUID()}}])});
  const other=structuredClone(p.scene!.items[1]);let res=await accept(p.proposals[0].id);assert.equal(res.statusCode,200,res.body);p=res.json();assert.equal(p.scene!.items[0].x,3);assert.equal(p.scene!.items[0].color,'#123456');assert.deepEqual(p.scene!.items[1],other);
  for(const conflict of ['locked','missing','collision','architecture']){
   p=await store.mutate(p.id,randomUUID(),null,'candidate-'+conflict,{},p=>{seedLivingStage(p);p.scene!.items=p.scene!.items.filter(i=>i.id==='table');if(!p.scene!.items.length)p.scene!.items=[{...other,id:'table',x:2,y:2}];p.scene!.items[0].locked=false;publishProposals(p,[proposal()],'turn-'+conflict)});
   const id=p.proposals.at(-1)!.id;
   p=await store.mutate(p.id,randomUUID(),null,'conflict-'+conflict,{},p=>{if(conflict==='locked')p.scene!.items[0].locked=true;if(conflict==='missing')p.scene!.items=[];if(conflict==='collision')p.scene!.items.push({...other,id:randomUUID(),x:3,y:2});if(conflict==='architecture')p.scene!.walls[0].height+=.1});
   const before=structuredClone(p.scene);res=await accept(id);assert.notEqual(res.statusCode,200,conflict);const after=await store.get(p.id);assert.deepEqual(after.scene,before);assert.equal(after.proposals.at(-1)!.status,'proposed');
  }
 }finally{await app.close();await store.close()}
});

test('main Chat MCP candidate survives movement during generation and uses absolute destination',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('concurrent MCP');await store.ensureAccessCode(project.id);
 let p=await store.mutate(project.id,randomUUID(),0,'seed',{},p=>seedLivingStage(p));
 const app=await buildAlva(store,{assets:false,chatCodex:async input=>{
  await input.tools!.find(t=>t.name==='propose_changes')!.run({variants:[{title:'Move table',rationale:'User destination',changes:[{action:'update',targetId:'table',values:{x:3,y:2}}]}]});
  await store.mutate(p.id,randomUUID(),null,'manual-during-chat',{},p=>{p.scene=applyChanges(p.scene!,[{action:'update',targetId:'table',values:{x:1.5,color:'#abcdef'}}])});return 'Ready for confirmation';
 }}),headers={cookie:'alva_session='+(await store.issueInternalSession(p.id)).token};
 try{
  const res=await app.inject({method:'POST',url:'/api/chat',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,text:'将 table 移动到 x=3米 y=2米，只移动这一张桌子',roomId:'room',model:'gemini-3.8-flash-high'}});assert.match(res.body,/event: done/,res.body);p=await store.get(p.id);assert.equal(p.scene!.items[0].x,1.5);assert.ok(p.messages.at(-1)!.toolCalls!.some(t=>t.name==='propose_changes'&&!t.isError));
  const adopted=await app.inject({method:'POST',url:'/api/proposals/accept',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,id:p.proposals[0].id,selectedIds:['table'],confirmed:true}});assert.equal(adopted.statusCode,200,adopted.body);assert.equal(adopted.json().scene.items[0].x,3);assert.equal(adopted.json().scene.items[0].color,'#abcdef');
 }finally{await app.close();await store.close()}
});
