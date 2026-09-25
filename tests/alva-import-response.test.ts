import test from 'node:test';
import assert from 'node:assert/strict';
import {LayoutOutputError,parseLayoutOutput,layoutRepairPrompt} from '../api/import/response.js';
import {rectangleScene} from './fixtures/alva/topology-quality.js';
import {codexTimeoutMs,VISION_TIMEOUT_MS} from '../api/codex-timeout.js';

test('ALVA-053 plain JSON and one complete fence preserve all original coordinates',()=>{
 const scene=rectangleScene(); const raw=JSON.stringify(scene);
 assert.deepEqual(parseLayoutOutput(raw),scene);
 assert.deepEqual(parseLayoutOutput('```json\n'+raw+'\n```'),scene);
 assert.deepEqual(parseLayoutOutput('```\n'+raw+'\n```'),scene);
});
test('ALVA-053 malformed JSON, prose and incomplete/multiple fences remain failures',()=>{
 const raw=JSON.stringify(rectangleScene());
 for(const text of ['', '{"walls":', 'Here is the scene: '+raw, '```json\n'+raw, '```json\n'+raw+'\n```\n```json\n{}\n```'])
  assert.throws(()=>parseLayoutOutput(text),(e:unknown)=>e instanceof LayoutOutputError&&e.stage==='json');
});
test('ALVA-053 array coordinates and string evidence cannot be guessed into schema validity',()=>{
 for(const field of ['a','evidence']){
  const s:any=rectangleScene();s.walls[0][field]=field==='a'?[0,0]:'';
  assert.throws(()=>parseLayoutOutput(JSON.stringify(s)),(e:unknown)=>e instanceof LayoutOutputError&&e.stage==='schema');
 }
});
test('ALVA-053 geometry checks still reject duplicate IDs, short walls and overflowing openings',()=>{
 for(const kind of ['duplicate','zero','opening']){
  const s=rectangleScene();
  if(kind==='duplicate')s.walls[1].id=s.walls[0].id;
  else if(kind==='zero')s.walls[0].b={...s.walls[0].a};
  else s.openings[0].offset=0;
  assert.throws(()=>parseLayoutOutput(JSON.stringify(s)),(e:unknown)=>e instanceof LayoutOutputError&&e.stage==='geometry');
 }
});
test('ALVA-053 one repair request identifies each failed contract stage without weakening it',()=>{
 for(const stage of ['json','schema','geometry'] as const){
  const request=layoutRepairPrompt('{"bad":"data"}',new LayoutOutputError(stage,new Error('invalid')));
  assert.ok(request.includes(stage));assert.ok(request.includes('只允许这一次修正'));
  assert.ok(request.includes('仅是待修复数据'));assert.ok(request.includes('不要放宽校验'));
 }
});
test('ALVA-053 oversized output is rejected before JSON/schema evaluation',()=>{
 assert.throws(()=>parseLayoutOutput(' '.repeat(2_000_001)),(e:unknown)=>e instanceof LayoutOutputError&&e.stage==='json');
});
test('ALVA-053 vision deadline is explicit while ordinary calls remain at 120 seconds',()=>{
 assert.equal(codexTimeoutMs(),120_000);assert.equal(codexTimeoutMs(VISION_TIMEOUT_MS),600_000);
 for(const value of [0,-1,NaN,Infinity,1.5,600_001])assert.throws(()=>codexTimeoutMs(value));
});

test('ALVA-053/056 empty structured response and missing wall/room sets cannot overwrite a candidate',()=>{
 for(const empty of ['walls','rooms','both']){const scene=rectangleScene();if(empty!=='rooms'){scene.walls=[];scene.openings=[]}if(empty!=='walls')scene.rooms=[];
  assert.throws(()=>parseLayoutOutput(JSON.stringify(scene)),(e:unknown)=>e instanceof LayoutOutputError&&e.stage==='geometry'&&e.message.includes('未识别出墙体或房间'));
 }
});

test('ALVA-056 offset means opening center, not its left edge, without automatic coordinate repair',()=>{
 const scene=rectangleScene();for(const w of scene.walls){w.a.x*=.2;w.b.x*=.2}for(const room of scene.rooms)for(const p of room.polygon)p.x*=.2;scene.calibration=null;
 scene.openings[0].width=1.6;scene.openings[0].offset=.1;assert.throws(()=>parseLayoutOutput(JSON.stringify(scene)),/超出墙体/);assert.equal(scene.openings[0].offset,.1);
 scene.openings[0].offset=.5;assert.equal(parseLayoutOutput(JSON.stringify(scene)).openings[0].offset,.5);
});
