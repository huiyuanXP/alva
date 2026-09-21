import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {catalogue,applyAnswer} from '../api/business.js';
import {emptyProject,type SceneData} from '../api/model.js';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';

const disabled=['Q19','Q20','Q21','Q22','Q58','Q60'];
const scene:SceneData={walls:[{id:'n',a:{x:0,y:0},b:{x:6,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'living',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:3,y:0},{x:3,y:3},{x:0,y:3}],locked:false},{id:'study',name:'书房',purpose:'工作',polygon:[{x:3,y:0},{x:6,y:0},{x:6,y:3},{x:3,y:3}],locked:false}],openings:[],items:[],calibration:null,geography:{latitude:1.3,north:0,assumption:'synthetic acceptance fixture'}};
const answer=(p:ReturnType<typeof emptyProject>,questionId:string,roomId:string|null,text:string,state:'answered'|'unknown'|'skipped'|'not_applicable'='answered',locked=false)=>applyAnswer(p,{questionId,roomId,text,state,locked,confirmed:true});

test('ALVA-014 keeps 60 IDs, disables removed scope and keeps time planning',()=>{
 assert.equal(catalogue.length,60);assert.equal(new Set(catalogue.map(q=>q.id)).size,60);
 assert.deepEqual(catalogue.filter(q=>!q.enabled).map(q=>q.id),disabled);
 assert.equal(catalogue.find(q=>q.id==='Q23')?.enabled,true);assert.equal(catalogue.find(q=>q.id==='Q24')?.enabled,true);
 const active=JSON.stringify(catalogue.filter(q=>q.enabled));assert.equal(active.includes('预算'),false);assert.equal(active.includes('D07'),false);
 for(const q of catalogue.filter(q=>q.enabled)){assert.equal(q.choices.length,4);assert.equal(new Set(q.choices).size,4,`${q.id} choices must be distinct`)}
});

test('ALVA-014 answers stay scoped, preserve explicit states and enforce locks',()=>{
 const p=emptyProject();p.scene=structuredClone(scene);
 answer(p,'Q01',null,'先形成需求任务书');answer(p,'Q25','living','阅读与休息');answer(p,'Q25','study','临时工作');
 for(const [id,state] of [['Q02','unknown'],['Q03','skipped'],['Q04','not_applicable']] as const)answer(p,id,null,'',state);
 assert.equal(p.answers.find(a=>a.questionId==='Q25'&&a.roomId==='living')?.text,'阅读与休息');assert.equal(p.answers.find(a=>a.questionId==='Q25'&&a.roomId==='study')?.text,'临时工作');
 assert.equal(p.answers.find(a=>a.questionId==='Q02')?.state,'unknown');assert.equal(p.answers.find(a=>a.questionId==='Q03')?.state,'skipped');assert.equal(p.answers.find(a=>a.questionId==='Q04')?.state,'not_applicable');
 answer(p,'Q05',null,'保留图纸', 'answered',true);assert.throws(()=>answer(p,'Q05',null,'覆盖锁定值'),/锁定/);
 assert.throws(()=>answer(p,'Q19',null,'50000'),/禁用/);assert.throws(()=>answer(p,'Q25',null,'串到全屋'),/有效房间/);
});

test('ALVA-014 HTTP contract omits legacy budget and removed write route',async()=>{
 const prior=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva014-test-code-123456';
 const store=new AlvaStore();await store.init();const created=await store.create('ALVA-014');await store.ensureAccessCode(created.project.id);
 await store.db.query("UPDATE alva_projects SET state=jsonb_set(state,'{budget}',$2::jsonb,true) WHERE id=$1",[created.project.id,JSON.stringify({amount:50000,currency:'SGD',ceiling:60000,scope:'legacy'})]);
 const app=await buildAlva(store,{assets:false});
 try{
  assert.deepEqual((await store.get(created.project.id) as any).budget,{amount:50000,currency:'SGD',ceiling:60000,scope:'legacy'});
  const login=await app.inject({method:'POST',url:'/api/access',payload:{code:'alva014-test-code-123456'}});const headers={cookie:`alva_session=${login.cookies[0].value}`};
  const project=await app.inject({url:'/api/project',headers});assert.equal(project.statusCode,200);assert.equal(Object.hasOwn(project.json(),'budget'),false);
  const qs=(await app.inject({url:'/api/questions',headers})).json();assert.equal(qs.length,60);assert.deepEqual(qs.filter((q:any)=>!q.enabled).map((q:any)=>q.id),disabled);
  const removed=await app.inject({method:'POST',url:'/api/budget',headers,payload:{requestId:randomUUID(),expectedRevision:0,budget:{amount:1,ceiling:1,currency:'SGD',scope:''},confirmed:true}});assert.equal(removed.statusCode,404);
  assert.deepEqual((await store.get(created.project.id) as any).budget,{amount:50000,currency:'SGD',ceiling:60000,scope:'legacy'});
 }finally{await app.close();await store.close();if(prior===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=prior}
});
