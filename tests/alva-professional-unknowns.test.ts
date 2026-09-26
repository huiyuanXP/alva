import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp,rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {AlvaStore} from '../api/store.js';
import {sections} from '../api/export.js';
import {writeUserContextProjection,ContextProjectionError,type UserContextProject} from '../api/user-context/index.js';
import {runLayoutReview,recordLayoutReviewDecision,prepareLayoutReviewForSave} from '../api/review/index.js';
import type {LayoutReviewResult,LayoutReviewAdoption} from '../packages/contracts/alva/layout-review.js';
import {contextEntry,painFurniture,reviewProject} from './fixtures/alva/layout-review.js';

type ReviewedProject=UserContextProject&{layoutReview?:LayoutReviewResult;layoutReviewAdoption?:LayoutReviewAdoption};
const invalid=(error:unknown)=>error instanceof ContextProjectionError&&error.code==='REVIEW_DECISION_INVALID';

test('ALVA-030 user tradeoff stays separate from professional unknown through save and delivery reading',async()=>{
 const dataRoot=await mkdtemp(join(tmpdir(),'alva030-professional-')),store=new AlvaStore();await store.init();
 try{
  const fixture=reviewProject();painFurniture(fixture);fixture.scene!.items[0].material='stone';contextEntry(fixture,'coffee','habits','每天早晨做咖啡');
  const {project}=await store.create('ALVA-030 synthetic');
  let p=await store.mutate(project.id,randomUUID(),0,'seed',{},current=>{const target=current as ReviewedProject;target.scene=fixture.scene;target.evidence=fixture.evidence;target.userContextEntries=fixture.userContextEntries}) as ReviewedProject;
  let context=await writeUserContextProjection(p,{dataRoot}),review=runLayoutReview(p,context);
  const tradeoff=review.findings.find(f=>f.ruleId==='coffee-worktop')!,professional=review.findings.find(f=>f.ruleId==='material-support-unknown')!;
  assert.match(professional.reason,/缺少重量、连接、安装与支撑资料/);assert.match(professional.reason,/无法判断承载是否成立/);assert.match(professional.reason,/不能断言失效/);
  review=recordLayoutReviewDecision(p,context,review,{reviewId:review.id,findingId:tradeoff.id,decision:'accept_tradeoff',note:'先保留当前咖啡操作台',confirmed:true});
  assert.throws(()=>recordLayoutReviewDecision(p,context,review,{reviewId:review.id,findingId:professional.id,decision:'accept_tradeoff',note:'我愿意承担风险',confirmed:true}),invalid);
  review=recordLayoutReviewDecision(p,context,review,{reviewId:review.id,findingId:professional.id,decision:'defer',note:'等待专业人员补充支撑资料',confirmed:true});
  p=await store.mutate(p.id,randomUUID(),p.revision,'layout-review',{},current=>{(current as ReviewedProject).layoutReview=review}) as ReviewedProject;
  context=await writeUserContextProjection(p,{dataRoot});
  const saved=await store.mutate(p.id,randomUUID(),p.revision,'save',{confirmed:true},current=>{const target=current as ReviewedProject;target.layoutReviewAdoption=prepareLayoutReviewForSave(target,context,target.layoutReview!)}) as ReviewedProject;
  const snapshot=await store.snapshot(p.id,saved.savedVersion) as ReviewedProject,adoption=snapshot.layoutReviewAdoption!;
  assert.equal(adoption.decisions.find(d=>d.findingId===tradeoff.id)?.decision,'accept_tradeoff');assert.equal(adoption.decisions.find(d=>d.findingId===professional.id)?.decision,'defer');
  assert.ok(adoption.professionalUnknownIds.includes(professional.id));assert.ok(adoption.pendingFindingIds.includes(professional.id));
  const designer=sections(snapshot,'designer'),decisionText=(designer.find(([name])=>name==='D06 方案决策与取舍')![1] as string[]).join('\n'),riskText=(designer.find(([name])=>name==='D09 待核实与风险')![1] as string[]).join('\n');
  assert.match(decisionText,/用户取舍 \[咖啡操作空间待补充\].*先保留当前咖啡操作台.*原始依据：每天早晨做咖啡/);
  assert.match(riskText,/专业待核实 \[材料支撑待专业核实\].*状态：未决/);assert.match(riskText,/缺少重量、连接、安装与支撑资料/);
 }finally{await store.close();await rm(dataRoot,{recursive:true,force:true})}
});
