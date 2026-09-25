import {test} from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {roomStyleTools} from '../api/room-style/index.js';
import {reopenTopology} from '../api/topology/service.js';
import {seedLivingStage} from './fixtures/alva/living-stage.js';
import {wallSideStyles} from '../web/src/room-style/surfaces.js';

const style={tags:['简洁','暖色'],wall:{color:'#ded6cb',material:'paint' as const},floor:{color:'#ad997c',material:'wood' as const}};
test('room styles preview as candidates, require confirmation, survive reload and expire with topology',async()=>{
 const store=new AlvaStore();await store.init();const {project}=await store.create('synthetic style');await store.ensureAccessCode(project.id);
 const seeded=await store.mutate(project.id,randomUUID(),0,'seed',{},seedLivingStage),headers={cookie:`alva_session=${(await store.issueInternalSession(project.id)).token}`};const app=await buildAlva(store,{assets:false});
 try{
  const [propose]=roomStyleTools(store,project.id,()=>{});const result=await propose.run({expectedRevision:seeded.revision,roomId:'room',style,reason:'用户要求暖色墙面和木色地面'}) as any;
  let p=await store.get(project.id);assert.equal(p.roomStyles,undefined);assert.deepEqual(p.scene,seeded.scene);assert.equal(p.roomStyleCandidates?.[0].status,'pending');
  const response=await app.inject({method:'POST',url:'/api/room-styles/decide',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,id:result.candidate.id,decision:'confirm',confirmed:true}});assert.equal(response.statusCode,200,response.body);
  p=await store.get(project.id);assert.deepEqual(p.roomStyles?.room,style);assert.deepEqual(p.scene,seeded.scene);assert.deepEqual(p.confirmedBuilding,seeded.confirmedBuilding);
  const sides=wallSideStyles(p.scene!,p.roomStyles!,2.5,0,0,.15);assert.deepEqual(sides[0],style.wall);assert.equal(sides[1],undefined);
  const pending=await propose.run({expectedRevision:p.revision,roomId:'room',style,reason:'第二候选'}) as any;
  p=await store.get(project.id);p=await store.mutate(p.id,randomUUID(),p.revision,'lock',{},p=>{p.scene!.rooms[0].locked=true});
  const stale=await app.inject({method:'POST',url:'/api/room-styles/decide',headers,payload:{requestId:randomUUID(),expectedRevision:p.revision,id:pending.candidate.id,decision:'confirm',confirmed:true}});assert.equal(stale.statusCode,409);
  const reopened=await store.mutate(p.id,randomUUID(),p.revision,'reopen',{},p=>reopenTopology(p,{}));assert.deepEqual(reopened.roomStyles,{});assert.deepEqual(reopened.roomStyleCandidates,[]);
 }finally{await app.close();await store.close()}
});
