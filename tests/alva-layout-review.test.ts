import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp, rm} from 'node:fs/promises';
import {join} from 'node:path';
import {tmpdir} from 'node:os';
import {itemFromAsset} from '../api/model.js';
import {writeUserContextProjection, ContextProjectionError, type UserContextProject} from '../api/user-context/index.js';
import {runLayoutReview, isLayoutReviewCurrent, recordLayoutReviewDecision, prepareLayoutReviewForSave, createLayoutReviewTools} from '../api/review/index.js';
import {footprintInRoom} from '../api/review/geometry.js';
import {contextEntry, painFurniture, reviewProject} from './fixtures/alva/layout-review.js';

async function isolated(fn: (dataRoot: string) => Promise<void>) {
  const root = await mkdtemp(join(tmpdir(), 'alva029-review-'));
  try { await fn(root); } finally { await rm(root, {recursive: true, force: true}); }
}
const code = (expected: string) => (error: unknown) => error instanceof ContextProjectionError && error.code === expected;
const pains = (review: ReturnType<typeof runLayoutReview>) => review.findings.filter(f => ['coffee-worktop', 'pet-toy-clearance', 'plant-daylight'].includes(f.ruleId));
const review = async (p: UserContextProject, dataRoot: string) => runLayoutReview(p, await writeUserContextProjection(p, {dataRoot}));

test('ALVA-029 coffee/pet/plant positive cases retain exact source and object references', () => isolated(async dataRoot => {
  const p = reviewProject(); painFurniture(p);
  contextEntry(p, 'habits', 'habits', '每天做咖啡，家里养狗，喜欢绿植与明亮采光。');
  const original = structuredClone(p), result = await review(p, dataRoot);
  assert.equal(pains(result).length, 3);
  assert.deepEqual(Object.keys(result.checks).sort(), ['behavior', 'furniture', 'geometry', 'navigation', 'requirement']);
  for (const finding of pains(result)) {
    assert.deepEqual(finding.contextEntryIds, ['habits']); assert.deepEqual(finding.evidenceIds, ['source-habits']);
    assert.ok(finding.objectIds.length); assert.ok(finding.roomIds.length); assert.ok(finding.reason); assert.ok(finding.suggestion);
  }
  assert.deepEqual(p, original, 'review must not edit design, answers, decisions or snapshots');
  assert.deepEqual(await review(p, dataRoot), result, 'same inputs produce the same review');
}));

test('ALVA-029 negative statements and pending/inferred/rejected habits do not trigger positive findings', () => isolated(async dataRoot => {
  for (const status of ['confirmed', 'pending', 'inferred', 'rejected'] as const) {
    const p = reviewProject(); painFurniture(p);
    contextEntry(p, 'habits', 'habits', status === 'confirmed' ? '不喝咖啡，不养宠物，不需要绿植。' : '每天咖啡，养猫，喜欢绿植采光。', {status});
    assert.equal(pains(await review(p, dataRoot)).length, 0, status);
  }
}));

test('ALVA-029 supported pain checks clear after actual layout fixes', () => isolated(async dataRoot => {
  const p = reviewProject(); const {table, sofa, plant} = painFurniture(p);
  contextEntry(p, 'habits', 'habits', '每天咖啡，养猫，喜欢绿植采光。');
  assert.equal(pains(await review(p, dataRoot)).length, 3);
  table.width = 1.2; sofa.clearance = 0; plant.height = 0.8; p.revision++;
  assert.equal(pains(await review(p, dataRoot)).length, 0);
}));

test('ALVA-029 changed current answers do not reuse positive historical questionnaire evidence', () => isolated(async dataRoot => {
  const p = reviewProject(); painFurniture(p);
  const time = '2026-09-26T00:00:00.000Z';
  p.evidence = [{id: 'old', quote: '每天咖啡，养狗，喜欢绿植采光', source: 'questionnaire', createdAt: time},
    {id: 'new', quote: '不喝咖啡，不养宠物，不需要绿植', source: 'questionnaire', createdAt: time}];
  p.answers = [{questionId: 'Q01', roomId: null, text: p.evidence[0].quote, state: 'answered', confirmed: true, locked: false, evidenceId: 'old'}];
  const old = await review(p, dataRoot); assert.equal(pains(old).length, 3);
  p.answers[0] = {...p.answers[0], evidenceId: 'new', text: p.evidence[1].quote}; p.revision++;
  const context = await writeUserContextProjection(p, {dataRoot});
  assert.equal(pains(runLayoutReview(p, context)).length, 0);
  assert.equal(isLayoutReviewCurrent(p, context, old), false);
}));

test('ALVA-029 confirmed correction supersedes the original habit without deleting provenance', () => isolated(async dataRoot => {
  const p = reviewProject(); painFurniture(p);
  contextEntry(p, 'old', 'habits', '每天咖啡，养狗，喜欢绿植采光');
  const old = await review(p, dataRoot); assert.equal(pains(old).length, 3);
  contextEntry(p, 'new', 'habits', '不喝咖啡，不养宠物，不需要绿植', {supersedesId: 'old'}); p.revision++;
  const context = await writeUserContextProjection(p, {dataRoot});
  assert.equal(pains(runLayoutReview(p, context)).length, 0);
  assert.equal(context.entries.find(e => e.id === 'old')?.status, 'rejected');
}));

test('ALVA-029 scoped habits do not leak to another room or unrelated object', () => isolated(async dataRoot => {
  const p = reviewProject(); painFurniture(p);
  p.scene!.rooms.push({id: 'room-2', name: '另一个空间', purpose: '休息', polygon: [{x: 7, y: 0}, {x: 10, y: 0}, {x: 10, y: 3}, {x: 7, y: 3}], locked: false});
  contextEntry(p, 'room', 'habits', '每天咖啡，养狗，喜欢绿植采光', {roomIds: ['room-2']});
  assert.equal(pains(await review(p, dataRoot)).length, 0);
  p.userContextEntries![0].roomIds = ['room-1']; p.userContextEntries![0].objectIds = ['table']; p.revision++;
  assert.deepEqual(pains(await review(p, dataRoot)).map(f => f.ruleId), ['coffee-worktop']);
}));

test('ALVA-029 model summary cannot invent an unsupported habit absent from its actual quote', () => isolated(async dataRoot => {
  const p = reviewProject(); painFurniture(p);
  contextEntry(p, 'summary', 'habits', '希望家里舒适一点', {text: '每天咖啡，养狗，喜欢绿植采光'});
  assert.equal(pains(await review(p, dataRoot)).length, 0);
}));

test('ALVA-029 coffee color and panda videos do not imply coffee-making or household pets', () => isolated(async dataRoot => {
  const p = reviewProject(); painFurniture(p);
  contextEntry(p, 'visual', 'preferences', '喜欢咖啡色的家具，常看熊猫视频。');
  assert.equal(pains(await review(p, dataRoot)).length, 0);
}));

test('ALVA-029 geometry catches rotated footprint outside despite an inside center', () => isolated(async dataRoot => {
  const p = reviewProject(); p.scene!.items = [{...itemFromAsset('alva-sofa', 'room-1', 0.65, 2), id: 'rotated', rotation: 45}];
  const result = await review(p, dataRoot);
  assert.ok(result.findings.some(f => f.ruleId === 'footprint-outside-room' && f.objectIds.includes('rotated')));
}));

test('ALVA-029 geometry catches furniture bridging a concave room notch and rotated overlap', () => isolated(async dataRoot => {
  const polygon = [{x: 0, y: 0}, {x: 6, y: 0}, {x: 6, y: 6}, {x: 4, y: 6}, {x: 4, y: 2}, {x: 2, y: 2}, {x: 2, y: 6}, {x: 0, y: 6}];
  assert.equal(footprintInRoom({x: 3, y: 3, width: 4.4, depth: 0.5, rotation: 0}, polygon), false);
  const p = reviewProject(); p.scene!.items = [{...itemFromAsset('alva-table', 'room-1', 3, 3), id: 'a', rotation: 45},
    {...itemFromAsset('alva-chair', 'room-1', 3.1, 3), id: 'b', rotation: 15}];
  assert.ok((await review(p, dataRoot)).findings.some(f => f.ruleId === 'footprints-overlap'));
}));

test('ALVA-029 actual door-to-door grid comparison finds a barrier but permits a detour', () => isolated(async dataRoot => {
  const p = reviewProject();
  const barrier = {...itemFromAsset('alva-cabinet', 'room-1', 3, 3), id: 'barrier', width: 0.6, depth: 6};
  p.scene!.items = [barrier];
  const blocked = (await review(p, dataRoot)).findings.find(f => f.ruleId === 'door-route-blocked');
  assert.ok(blocked); assert.ok(blocked.objectIds.includes('barrier'));
  assert.deepEqual(blocked.path?.openingIds, ['door-left', 'door-right']); assert.ok(blocked.path!.points.length >= 2);
  barrier.depth = 1; p.revision++;
  assert.ok(!(await review(p, dataRoot)).findings.some(f => f.ruleId === 'door-route-blocked'));
}));

test('ALVA-029 incomplete doors report a navigation limitation rather than universal passage success', () => isolated(async dataRoot => {
  const p = reviewProject(); p.scene!.openings = [];
  const result = await review(p, dataRoot);
  assert.equal(result.checks.navigation.status, 'needs_information');
  assert.ok(result.limitations.some(line => line.includes('少于两个')));
}));

test('ALVA-029 explicit material preference and functional requirement conflicts are independently sourced', () => isolated(async dataRoot => {
  const p = reviewProject();
  p.scene!.items = [{...itemFromAsset('alva-chair', 'room-1', 3, 3), id: 'glass-chair', material: 'glass'}];
  contextEntry(p, 'style', 'preferences', '不要玻璃家具。');
  contextEntry(p, 'work', 'requirements', '需要书桌。');
  const result = await review(p, dataRoot);
  assert.ok(result.findings.some(f => f.ruleId === 'material-preference-conflict' && f.contextEntryIds.includes('style')));
  assert.ok(result.findings.some(f => f.ruleId === 'missing-alva-table' && f.contextEntryIds.includes('work')));
  assert.ok(result.findings.some(f => f.kind === 'professional'));
}));

test('ALVA-029 review freshness follows scene and context inputs, retaining reviewed revision after administrative writes', () => isolated(async dataRoot => {
  const p = reviewProject(); painFurniture(p); contextEntry(p, 'one', 'habits', '每天咖啡');
  const firstContext = await writeUserContextProjection(p, {dataRoot}), result = runLayoutReview(p, firstContext);
  p.revision++;
  assert.equal(isLayoutReviewCurrent(p, firstContext, result), false, 'even unchanged inputs need a current projection read');
  const context = await writeUserContextProjection(p, {dataRoot});
  assert.equal(isLayoutReviewCurrent(p, context, result), true);
  const adoption = prepareLayoutReviewForSave(p, context, result);
  assert.equal(adoption.reviewedRevision, 0); assert.equal(adoption.adoptedAtRevision, 1);
  p.scene!.items[0].x -= 0.1;
  assert.equal(isLayoutReviewCurrent(p, context, result), false);
  assert.throws(() => prepareLayoutReviewForSave(p, context, result), code('REVIEW_STALE'));
}));

test('ALVA-029 save adoption preserves explicit choices while professional unknowns stay open', () => isolated(async dataRoot => {
  const p = reviewProject(); painFurniture(p); p.scene!.items[0].material = 'stone'; contextEntry(p, 'one', 'habits', '每天咖啡');
  const context = await writeUserContextProjection(p, {dataRoot}), result = runLayoutReview(p, context);
  const coffee = result.findings.find(f => f.ruleId === 'coffee-worktop')!, professional = result.findings.find(f => f.kind === 'professional')!;
  const decision = {reviewId: result.id, findingId: coffee.id, decision: 'accept_tradeoff', note: '先保留当前小台面', confirmed: true};
  const accepted = recordLayoutReviewDecision(p, context, result, decision);
  assert.equal(result.decisions.length, 0); assert.equal(accepted.decisions.length, 1);
  assert.equal(recordLayoutReviewDecision(p, context, accepted, decision).decisions.length, 1);
  assert.throws(() => recordLayoutReviewDecision(p, context, accepted, {...decision, findingId: professional.id}), code('REVIEW_DECISION_INVALID'));
  const adoption = prepareLayoutReviewForSave(p, context, accepted);
  assert.ok(!adoption.pendingFindingIds.includes(coffee.id)); assert.ok(adoption.professionalUnknownIds.includes(professional.id));
  assert.ok(adoption.pendingFindingIds.includes(professional.id)); assert.equal(p.savedVersion, 0);
  assert.throws(() => recordLayoutReviewDecision(p, context, result, {...decision, confirmed: false}), code('REVIEW_DECISION_INVALID'));
}));

test('ALVA-029 missing or invalid layouts fail explicitly and stale context cannot be reviewed', () => isolated(async dataRoot => {
  const p = reviewProject(), context = await writeUserContextProjection(p, {dataRoot});
  p.scene = null; assert.throws(() => runLayoutReview(p, context), code('REVIEW_SCENE_REQUIRED'));
  p.scene = reviewProject().scene; p.scene!.items.push({...itemFromAsset('alva-chair', 'missing-room', 2, 2), id: 'invalid'});
  assert.throws(() => runLayoutReview(p, context), code('REVIEW_SCENE_INVALID'));
  p.revision++; assert.throws(() => runLayoutReview(p, context), code('CONTEXT_STALE'));
}));

test('ALVA-029 review tool always reloads inputs and reports persistence truthfully', () => isolated(async dataRoot => {
  const p = reviewProject(); painFurniture(p); contextEntry(p, 'one', 'habits', '每天咖啡');
  let persisted = 0;
  const tool = createLayoutReviewTools({dataRoot, getProject: async () => structuredClone(p), onReview: async () => { persisted++; p.revision++; }})[0];
  const output = await tool.run({}) as {review: ReturnType<typeof runLayoutReview>; persisted: boolean};
  assert.equal(output.persisted, true); assert.equal(persisted, 1); assert.equal(output.review.projectRevision, 0);
  const readonly = createLayoutReviewTools({dataRoot, getProject: async () => structuredClone(p)})[0];
  assert.equal((await readonly.run({}) as typeof output).persisted, false);
  assert.equal(p.savedVersion, 0);
  await assert.rejects(tool.run({projectId: 'another-project'}));
}));

test('ALVA-029 layout modification during review persistence invalidates tool success', () => isolated(async dataRoot => {
  const p = reviewProject(); painFurniture(p);
  const tool = createLayoutReviewTools({dataRoot, getProject: async () => structuredClone(p), onReview: async () => { p.scene!.items[0].x -= 0.2; p.revision++; }})[0];
  await assert.rejects(tool.run({}), code('REVIEW_STALE'));
}));
