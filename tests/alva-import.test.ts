import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva,imageData} from '../api/api.js';
import {layoutRecognitionModel,normalizeSceneContract,normalizeStructuredOutput,recognizeLayout} from '../api/import.js';
import type {SceneData} from '../api/model.js';

const code='alva-009-test-code-123456';
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const scene=():SceneData=>({walls:[{id:'wall-a',a:{x:0,y:0},b:{x:5,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},{id:'wall-b',a:{x:5,y:0},b:{x:5,y:4},thickness:.15,height:2.8,structural:'unknown',evidence:[]},{id:'wall-c',a:{x:5,y:4},b:{x:0,y:4},thickness:.15,height:2.8,structural:'unknown',evidence:[]},{id:'wall-d',a:{x:0,y:4},b:{x:0,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'room-a',name:'布局A',purpose:'用途待确认',polygon:[{x:0,y:0},{x:5,y:0},{x:5,y:4},{x:0,y:4}],locked:false}],openings:[{id:'door-a',wallId:'wall-c',kind:'door',offset:.5,width:.9,height:2.1,sill:0}],items:[],calibration:null,geography:{latitude:31,north:0,assumption:'图上方为北，尺寸待校准'}});
function cookie(response:any){return response.cookies[0].name+'='+response.cookies[0].value}
function frames(body:string){return [...body.matchAll(/^event: (.+)\ndata: (.+)$/gm)].map(m=>({type:m[1],data:JSON.parse(m[2])}))}

test('ALVA-009 keeps attachment provenance for image imports and exposes stable source metadata',async()=>{const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE=code;const source=await imageData('image/png',png,'layout-a.png');try{assert.equal(source.mime,'image/png');assert.equal(source.originalMime,'image/png');assert.equal(source.filename,'layout-a.png');assert.equal(source.data,png);assert.equal(source.originalData,undefined)}finally{if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}});

test('ALVA-009 replays duplicate imports and failures preserve the previous candidate',async()=>{const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE=code;const store=new AlvaStore();await store.init();const app=await buildAlva(store,{assets:false});try{const created=await store.create('Import test');await store.ensureAccessCode(created.project.id);const login=await app.inject({method:'POST',url:'/api/access',payload:{code}});assert.equal(login.statusCode,200);const headers={cookie:cookie(login)};const requestId=randomUUID();let current=await store.mutate(created.project.id,requestId,0,'import',{mime:'image/png',data:png,filename:'layout-a.png'},p=>{p.candidate=scene();p.sourceImage={mime:'image/png',data:png,originalMime:'image/png',filename:'layout-a.png'};p.importState={status:'succeeded',message:'Codex已完成识别',requestId,sourceMime:'image/png',filename:'layout-a.png',provider:'codex',model:'test',startedAt:new Date().toISOString(),finishedAt:new Date().toISOString()};p.dirty=true});let replay=await app.inject({method:'POST',url:'/api/import',headers,payload:{requestId,expectedRevision:0,mime:'image/png',data:png,filename:'layout-a.png'}});assert.equal(replay.statusCode,200);assert.ok(frames(replay.body).some(f=>f.type==='done'&&f.data.replayed===true));assert.deepEqual((await store.get(created.project.id)).candidate, current.candidate);const failedRequest=randomUUID();const failed=await app.inject({method:'POST',url:'/api/import',headers,payload:{requestId:failedRequest,expectedRevision:current.revision,mime:'image/png',data:'bm90LWltYWdl',filename:'bad.png'}});assert.equal(failed.statusCode,200);assert.ok(frames(failed.body).some(f=>f.type==='error'));const after=await store.get(created.project.id);assert.deepEqual(after.candidate,current.candidate);assert.deepEqual(after.sourceImage,current.sourceImage);assert.equal(after.importState?.status,'failed');assert.equal(after.importState?.filename,'bad.png');}finally{await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}});


test('floor-plan structured output normalization accepts bare JSON, Markdown fences and surrounding prose',()=>{
 const payload='{"walls":[],"rooms":[],"openings":[],"items":[],"calibration":null,"geography":{"latitude":31,"north":0,"assumption":"待确认"}}';
 assert.equal(normalizeStructuredOutput(payload),payload);
 assert.equal(normalizeStructuredOutput('```json\n'+payload+'\n```'),payload);
 assert.equal(normalizeStructuredOutput('识别结果如下：\n'+payload+'\n请核对。'),payload);
});

test('floor-plan recognition uses OPENAI_VISION_MODEL and parses fenced provider JSON',async()=>{
 const previousVision=process.env.OPENAI_VISION_MODEL,previousModel=process.env.OPENAI_MODEL;process.env.OPENAI_VISION_MODEL='vision-structured-test';process.env.OPENAI_MODEL='general-model-must-not-be-used';
 const output=scene(),seen:string[]=[];
 try{
  const result=await recognizeLayout('data:image/png;base64,'+png,undefined,undefined,async input=>{seen.push(input.model||'');return '```json\n'+JSON.stringify(output)+'\n```'});
  assert.deepEqual(seen,['vision-structured-test']);assert.equal(layoutRecognitionModel(),'vision-structured-test');assert.equal(result.walls.length,4);assert.equal(result.rooms.length,1);assert.equal(result.openings.length,1);assert.equal(result.calibration,null);
 }finally{if(previousVision===undefined)delete process.env.OPENAI_VISION_MODEL;else process.env.OPENAI_VISION_MODEL=previousVision;if(previousModel===undefined)delete process.env.OPENAI_MODEL;else process.env.OPENAI_MODEL=previousModel}
});

test('floor-plan recognition repairs parse/schema failures with the same dedicated vision model',async()=>{
 const previousVision=process.env.OPENAI_VISION_MODEL;process.env.OPENAI_VISION_MODEL='vision-repair-test';const calls:any[]=[];
 try{
  const result=await recognizeLayout('data:image/png;base64,'+png,undefined,undefined,async input=>{calls.push(input);return calls.length===1?'not valid json':'前言\n'+JSON.stringify(scene())+'\n结束'});
  assert.equal(calls.length,2);assert.ok(calls.every(c=>c.model==='vision-repair-test'));assert.match(calls[1].text,/(?:结构化解析或几何校验|json阶段校验失败)/);assert.equal(result.rooms.length,1);
 }finally{if(previousVision===undefined)delete process.env.OPENAI_VISION_MODEL;else process.env.OPENAI_VISION_MODEL=previousVision}
});


test('floor-plan contract normalization accepts equivalent provider field shapes without inventing geometry',()=>{
 const provider={metadata:{latitude:31,north:0,assumption:'待确认'},walls:[{id:'w1',a:[0,0],b:[5,0],thickness:.15,height:2.8,structural:'unknown',evidence:''},{id:'w2',a:[5,0],b:[5,4],thickness:.15,height:2.8,structural:'unknown',evidence:''},{id:'w3',a:[5,4],b:[0,4],thickness:.15,height:2.8,structural:'unknown',evidence:''},{id:'w4',a:[0,4],b:[0,0],thickness:.15,height:2.8,structural:'unknown',evidence:''}],rooms:[{id:'r1',name:'书房',polygon:[[0,0],[5,0],[5,4],[0,4]]}],openings:[{id:'d1',wallId:'w3',type:'door',offset:.5,width:.9,height:2.1,sillHeight:0}]};
 const normalized=normalizeSceneContract(provider) as any;
 assert.deepEqual(normalized.walls[0].a,{x:0,y:0});assert.deepEqual(normalized.walls[0].evidence,[]);assert.equal(normalized.rooms[0].purpose,'书房');assert.equal(normalized.rooms[0].locked,false);assert.equal(normalized.openings[0].kind,'door');assert.equal(normalized.openings[0].sill,0);assert.deepEqual(normalized.items,[]);assert.equal(normalized.calibration,null);assert.equal(normalized.geography.latitude,31);
});
