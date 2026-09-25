import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {applyAnswer} from '../api/business.js';
import {consultationSnapshot} from '../api/chat.js';
import {emptyProject,type SceneData} from '../api/model.js';

const scene:SceneData={walls:[{id:'n',a:{x:0,y:0},b:{x:6,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'living',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:3,y:0},{x:3,y:3},{x:0,y:3}],locked:false}],openings:[],items:[],calibration:null,geography:{latitude:1.3,north:0,assumption:'test'}};
const cookie=(r:any)=>`${r.cookies[0].name}=${r.cookies[0].value}`;

test('ALVA-015 manual answers are visible to later Chat snapshots',()=>{
 const p=emptyProject('manual');p.scene=structuredClone(scene);applyAnswer(p,{questionId:'Q25',roomId:'living',text:'阅读和休息',state:'answered',locked:false,confirmed:true});
 const snapshot=consultationSnapshot(p,'living'),answer=snapshot.project.answers.find(a=>a.questionId==='Q25');assert.equal(answer?.text,'阅读和休息');assert.equal(snapshot.project.evidence.find(e=>e.id===answer?.evidenceId)?.source,'questionnaire');
});

test('ALVA-015 Chat confirmation keeps exact quote, cannot duplicate, and locked values require explicit unlock',async()=>{
 const prior=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva015-test-code-123456';const store=new AlvaStore();await store.init();const created=await store.create('ALVA-015');await store.ensureAccessCode(created.project.id);let p=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=structuredClone(scene);(p as any).pendingAnswers=[{id:'pending-1',questionId:'Q25',roomId:'living',text:'阅读和休息',quote:'我平时主要在客厅读书和休息'}]});const app=await buildAlva(store,{assets:false});
 try{const login=await app.inject({method:'POST',url:'/api/access',payload:{code:'alva015-test-code-123456'}});const headers={cookie:cookie(login)};
  let r=await app.inject({method:'POST',url:'/api/pending-answers/confirm',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,id:'pending-1',confirmed:true}});assert.equal(r.statusCode,200);p=r.json();let answer=p.answers.find((a:any)=>a.questionId==='Q25'&&a.roomId==='living')!;assert.equal(answer.text,'阅读和休息');let ev=p.evidence.find((e:any)=>e.id===answer.evidenceId)!;assert.equal(ev.quote,'我平时主要在客厅读书和休息');assert.equal(ev.source,'chat');assert.equal((p as any).pendingAnswers.length,0);
  const evidenceCount=p.evidence.length,answerCount=p.answers.length;r=await app.inject({method:'POST',url:'/api/pending-answers/confirm',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,id:'pending-1',confirmed:true}});assert.equal(r.statusCode,422);let saved=await store.get(created.project.id);assert.equal(saved.evidence.length,evidenceCount);assert.equal(saved.answers.length,answerCount);
  p=await store.mutate(created.project.id,randomUUID(),saved.revision,'lock-seed',{},p=>{p.answers.find(a=>a.questionId==='Q25'&&a.roomId==='living')!.locked=true;(p as any).pendingAnswers=[{id:'pending-2',questionId:'Q25',roomId:'living',text:'会客',quote:'我想改成主要会客'}]});
  r=await app.inject({method:'POST',url:'/api/pending-answers/confirm',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,id:'pending-2',confirmed:true}});assert.equal(r.statusCode,422);r=await app.inject({method:'POST',url:'/api/answers/unlock',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,questionId:'Q25',roomId:'living',confirmed:false}});assert.equal(r.statusCode,400);r=await app.inject({method:'POST',url:'/api/answers/unlock',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,questionId:'Q25',roomId:'living',confirmed:true}});assert.equal(r.statusCode,200);p=r.json();r=await app.inject({method:'POST',url:'/api/pending-answers/confirm',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,id:'pending-2',confirmed:true}});assert.equal(r.statusCode,200);answer=r.json().answers.find((a:any)=>a.questionId==='Q25')!;assert.equal(answer.text,'会客');
 }finally{await app.close();await store.close();if(prior===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=prior}
});

import {createTopologyVersion} from '../api/topology/calibration.js';
test('persistent Chat snapshots retain current geometry once and keep historical topology metadata',()=>{
 const p=emptyProject('synthetic compact snapshot');p.scene={...structuredClone(scene),calibration:{wallId:'n',length:6,source:'synthetic',confirmed:true}};p.confirmedTopology=createTopologyVersion(p,p.scene);p.topologyVersions=[p.confirmedTopology];p.sourceImage={mime:'image/png',data:'private-attachment-bytes',filename:'synthetic.png'} as any;
 const snapshot=consultationSnapshot(p,null);assert.deepEqual(snapshot.project.scene,p.scene);assert.equal(snapshot.project.confirmedTopology?.sourceFingerprint,p.confirmedTopology.sourceFingerprint);assert.equal(snapshot.project.confirmedTopology?.scene,undefined);assert.equal('scene' in snapshot.project.topologyVersions[0],false);assert.equal(snapshot.project.sourceImage,undefined);assert.ok(p.confirmedTopology.scene);assert.equal(p.sourceImage!.data,'private-attachment-bytes');
});
