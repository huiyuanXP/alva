import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import * as THREE from 'three';
import {assets,itemFromAsset} from '../api/model.js';
import {catalogueFurniture} from '../web/src/scene/furniture/catalogue.js';
import {furnitureObject,furnitureStats,disposeFurniture} from '../web/src/scene/furniture/geometry.js';
import {validateFurnitureModel} from '../packages/contracts/alva/furniture-model.js';
import {generateFurnitureModel} from '../api/furniture/generate-model.js';
import {rejectUnreviewedModels} from '../api/furniture/model-tools.js';
import {McpError} from '../api/mcp/contracts.js';
import {applyChanges} from '../api/business.js';
import {snapshotScene} from './fixtures/alva/snapshot.js';
import type {CodexInput} from '../api/codex.js';
const pass={verdict:'pass',detailAdequate:true,matchesRequest:true,observations:['前右视角有独立座垫和圆角扶手','背左视角有独立背板及支撑连接','正面视角能看见坐垫边缘缝线'],issues:[],repairs:[]};
const renders={images:['data:image/png;base64,YQ==','data:image/png;base64,Yg==','data:image/png;base64,Yw=='],views:['front-right','back-left','front-detail'],stats:{meshes:15,triangles:30000},bounds:{min:[-.5,0,-.5],max:[.5,1,.5]}};
const dimensions={width:2.1,height:.8,depth:.9};
test('all seven catalogue assets have distinct detailed geometry within authoritative footprint',()=>{
 for(const asset of assets){const model=validateFurnitureModel(catalogueFurniture(asset.id,asset.color,asset.material)),item=itemFromAsset(asset.id,'room',0,0);const object=furnitureObject(item);object.updateMatrixWorld(true);const size=new THREE.Box3().setFromObject(object).getSize(new THREE.Vector3()),stats=furnitureStats(object);assert.ok(stats.meshes>=8);assert.ok(stats.triangles>2500);for(const [actual,expected] of [[size.x,item.width],[size.y,item.height],[size.z,item.depth]])assert.ok(Math.abs(actual-expected)<1e-5,asset.id);assert.ok(model.parts.some(p=>p.role==='detail'));disposeFurniture(object)}
});
test('critic receives original request, design summary and actual render images; revision uses feedback before passing',async()=>{
 const auditRoot=await mkdtemp(join(tmpdir(),'alva071-test-'));const inputs:CodexInput[]=[];let generation=0,critics=0;const originalPrompt='生成一件有三块独立坐垫和圆角扶手的沙发';
 try{const result=await generateFurnitureModel({originalPrompt,assetName:'沙发',dimensions,auditRoot,render:async()=>renders,call:async input=>{inputs.push(input);await input.session?.onThread('synthetic-thread');if(input.images?.length){critics++;return JSON.stringify(critics===1?{...pass,verdict:'revise',detailAdequate:false,issues:['缝线不够清楚'],repairs:['将坐垫缝线做成可见独立几何']}:pass)}generation++;const m=catalogueFurniture('alva-sofa','#889988','fabric');m.name='revision-'+generation;return JSON.stringify(m)}});
 assert.equal(result.attempts,2);assert.equal(generation,2);assert.equal(critics,2);assert.equal(result.model.name,'revision-2');assert.deepEqual(inputs[1].images,renders.images);assert.ok(inputs[1].text.includes(originalPrompt));assert.ok(inputs[1].text.includes(result.model.designSummary));assert.ok(inputs[2].text.includes('缝线不够清楚'));assert.equal(inputs[2].session?.threadId,'synthetic-thread');assert.equal(result.renderHashes.length,3);
 const scene=snapshotScene();const updated=applyChanges(scene,[{action:'update',targetId:'table',values:{visualModel:result}}]);assert.equal(updated.items[0].visualModel?.modelHash,result.modelHash);const replaced=applyChanges(updated,[{action:'update',targetId:'table',values:{assetId:'alva-chair'}}]);assert.equal(replaced.items[0].visualModel,undefined);
 }finally{await rm(auditRoot,{recursive:true,force:true})}
});
test('three visual rejections fail closed, no accepted model and no fourth generation',async()=>{
 const auditRoot=await mkdtemp(join(tmpdir(),'alva071-test-'));let count=0;
 try{await assert.rejects(generateFurnitureModel({originalPrompt:'有细节的沙发',assetName:'沙发',dimensions,auditRoot,render:async()=>renders,call:async input=>{count++;return JSON.stringify(input.images?.length?{...pass,verdict:'revise',matchesRequest:false,issues:['没有满足扶手需求'],repairs:['重建扶手']}:catalogueFurniture('alva-sofa','#889988','fabric'))}}),e=>e instanceof McpError&&e.detail.code==='FURNITURE_CRITIC_REJECTED');assert.equal(count,6)}finally{await rm(auditRoot,{recursive:true,force:true})}
});
test('single cube, fabricated reviewed model and missing render cannot bypass critic',async()=>{
 const model=catalogueFurniture('alva-sofa','#889988','fabric');assert.throws(()=>validateFurnitureModel({...model,parts:model.parts.slice(0,1)}));assert.throws(()=>rejectUnreviewedModels([{action:'update',targetId:'a',values:{visualModel:{critique:pass}}}]),e=>e instanceof McpError&&e.detail.code==='FURNITURE_CRITIC_REQUIRED');
 const auditRoot=await mkdtemp(join(tmpdir(),'alva071-test-'));try{await assert.rejects(generateFurnitureModel({originalPrompt:'详细沙发',assetName:'沙发',dimensions,auditRoot,call:async()=>JSON.stringify(model),render:async()=>{throw new Error('WebGL failure')}}),e=>e instanceof McpError&&e.detail.code==='FURNITURE_RENDER_FAILED')}finally{await rm(auditRoot,{recursive:true,force:true})}
});
test('cancelled generation never reaches visual review or success',async()=>{
 const auditRoot=await mkdtemp(join(tmpdir(),'alva071-test-')),controller=new AbortController();let rendered=false;
 try{await assert.rejects(generateFurnitureModel({originalPrompt:'详细沙发',assetName:'沙发',dimensions,auditRoot,signal:controller.signal,call:async()=>{controller.abort();return JSON.stringify(catalogueFurniture('alva-sofa','#889988','fabric'))},render:async()=>{rendered=true;return renders}}));assert.equal(rendered,false)}finally{await rm(auditRoot,{recursive:true,force:true})}
});
