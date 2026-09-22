import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {emptyProject,type SceneData} from '../api/model.js';
import {applyAnswer,unansweredForScope} from '../api/business.js';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';

const scene:SceneData={walls:[{id:'n',a:{x:0,y:0},b:{x:6,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'living',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:3,y:0},{x:3,y:3},{x:0,y:3}],locked:false},{id:'study',name:'书房',purpose:'工作',polygon:[{x:3,y:0},{x:6,y:0},{x:6,y:3},{x:3,y:3}],locked:false}],openings:[],items:[],calibration:null,geography:{latitude:1.3,north:0,assumption:'test'}};

test('ALVA-016 unanswered statistics keep project/room scopes independent and exclude disabled questions',()=>{
 const p=emptyProject('scope');p.scene=structuredClone(scene);applyAnswer(p,{questionId:'Q01',roomId:null,text:'需求任务书',state:'answered',locked:false,confirmed:true});applyAnswer(p,{questionId:'Q25',roomId:'living',text:'阅读',state:'answered',locked:false,confirmed:true});
 const project=unansweredForScope(p,null),living=unansweredForScope(p,'living'),study=unansweredForScope(p,'study');
 assert.equal(project.some(q=>q.id==='Q01'),false);assert.equal(living.some(q=>q.id==='Q25'),false);assert.equal(study.some(q=>q.id==='Q25'),true);
 for(const list of [project,living,study])assert.equal(list.some(q=>['Q19','Q20','Q21','Q22','Q58','Q60'].includes(q.id)),false);
});

test('ALVA-016 repeated analyze with no new evidence is a no-op',async()=>{
 const prior=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE='alva016-test-code-123456';const store=new AlvaStore();await store.init();const created=await store.create('ALVA-016');await store.ensureAccessCode(created.project.id);let p=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=structuredClone(scene);p.lastAnalysisEvidence=p.evidence.length});const app=await buildAlva(store,{assets:false});
 try{const login=await app.inject({method:'POST',url:'/api/access',payload:{code:'alva016-test-code-123456'}}),headers={cookie:`${login.cookies[0].name}=${login.cookies[0].value}`};const r=await app.inject({method:'POST',url:'/api/analyze',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision}});assert.equal(r.statusCode,200);assert.equal(r.json().revision,p.revision);assert.equal((await store.get(created.project.id)).lastAnalysisEvidence,p.lastAnalysisEvidence)}finally{await app.close();await store.close();if(prior===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=prior}
});
