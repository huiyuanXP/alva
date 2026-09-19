import test from 'node:test';
import assert from 'node:assert/strict';
import {sampleProject} from '../apps/api/sample.js';
import {proposeObjectEdit} from '../apps/api/object-agent.js';
test('object agent tools bind snapshot and reject arbitrary or unsupported parameters without mutation',async()=>{
 const p=sampleProject('synthetic');const before=structuredClone(p);
 const factory:any=async(_system:string,tools:any[])=>({abort(){},state:{messages:[]},prompt:async()=>{
  assert.deepEqual(tools.map(t=>t.name),['get_snapshot','propose_object_edit']);
  const snap=JSON.parse((await tools[0].execute('read',{})).content[0].text);
  assert.equal(snap.object_id,'sofa-main');assert.equal(snap.room_id,'living');
  for(const args of [{patch:{width:0}},{patch:{material:'wood'}},{patch:{width:220},object_id:'other'},{patch:{script:'alert(1)'}},{patch:{}}])await assert.rejects(()=>tools[1].execute('bad',args));
  // Models can echo unchanged snapshot properties; those are not additional
  // owner-requested changes and must not inflate the adoption scope.
  await tools[1].execute('ok',{patch:{width:220,depth:snap.values.depth,height:snap.values.height,elevation:snap.values.elevation,color:snap.values.color.toUpperCase()}});
 }});
 const result=await proposeObjectEdit(p,'sofa-main','宽度改为220厘米',factory);
 assert.deepEqual(result.patch,{width:220});assert.equal(result.status,'proposed');assert.deepEqual(p,before);
 await assert.rejects(()=>proposeObjectEdit(p,'missing','修改',factory),/不存在/);
});
