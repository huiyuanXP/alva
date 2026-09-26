import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp, rm} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {AlvaStore} from '../api/store.js';
import {writeUserContextProjection, type UserContextProject} from '../api/user-context/index.js';
import {runLayoutReview, recordLayoutReviewDecision, prepareLayoutReviewForSave} from '../api/review/index.js';
import type {LayoutReviewResult, LayoutReviewAdoption} from '../packages/contracts/alva/layout-review.js';
import {contextEntry, painFurniture, reviewProject} from './fixtures/alva/layout-review.js';

type ReviewedProject = UserContextProject & {layoutReview?: LayoutReviewResult; layoutReviewAdoption?: LayoutReviewAdoption};

test('ALVA-029 actual PGlite snapshot keeps adopted review and tradeoffs; save rollback/retry creates no partial version', async () => {
  const dataRoot = await mkdtemp(join(tmpdir(), 'alva029-store-'));
  const store = new AlvaStore();
  await store.init();
  try {
    const fixture = reviewProject(); painFurniture(fixture); fixture.scene!.items[0].material = 'stone';
    contextEntry(fixture, 'coffee', 'habits', '每天早晨做咖啡');
    const created = await store.create('ALVA-029 合成数据库验收');
    let p = await store.mutate(created.project.id, randomUUID(), 0, 'seed-synthetic-layout', {}, project => {
      const target = project as ReviewedProject;
      target.scene = fixture.scene; target.evidence = fixture.evidence; target.userContextEntries = fixture.userContextEntries;
    }) as ReviewedProject;
    let context = await writeUserContextProjection(p, {dataRoot});
    const review = runLayoutReview(p, context);
    p = await store.mutate(p.id, randomUUID(), p.revision, 'layout-review', {id: review.id}, current => {
      (current as ReviewedProject).layoutReview = review;
    }) as ReviewedProject;
    context = await writeUserContextProjection(p, {dataRoot});
    const finding = review.findings.find(f => f.ruleId === 'coffee-worktop')!;
    const input = {reviewId: review.id, findingId: finding.id, decision: 'accept_tradeoff', note: '先保留现有咖啡台', confirmed: true};
    p = await store.mutate(p.id, randomUUID(), p.revision, 'review-decision', input, current => {
      const target = current as ReviewedProject;
      target.layoutReview = recordLayoutReviewDecision(target, context, target.layoutReview!, input);
    }) as ReviewedProject;
    context = await writeUserContextProjection(p, {dataRoot});
    const before = structuredClone(p), expectedAdoption = prepareLayoutReviewForSave(p, context, p.layoutReview!);
    store.failNextSave = true;
    const requestId = randomUUID(), saveInput = {confirmed: true};
    const save = () => store.mutate(p.id, requestId, p.revision, 'save', saveInput, current => {
      const target = current as ReviewedProject;
      target.layoutReviewAdoption = prepareLayoutReviewForSave(target, context, target.layoutReview!);
    });
    await assert.rejects(save(), /isolated_save_fault/);
    assert.deepEqual(await store.get(p.id), before);
    assert.equal((await store.versions(p.id)).length, 0);
    const saved = await save();
    assert.equal(saved.savedVersion, 1);
    const snapshot = await store.snapshot(p.id, 1) as ReviewedProject;
    assert.deepEqual(snapshot.layoutReviewAdoption, expectedAdoption);
    assert.equal(snapshot.layoutReviewAdoption!.decisions[0].note, '先保留现有咖啡台');
    assert.ok(snapshot.layoutReviewAdoption!.professionalUnknownIds.length);
    assert.equal(snapshot.layoutReview!.projectRevision, review.projectRevision);
    assert.equal((await save()).savedVersion, 1, 'retry of the same committed request is idempotent');
    assert.equal((await store.versions(p.id)).length, 1);
    const edited = await store.mutate(p.id, randomUUID(), saved.revision, 'test-layout-edit', {}, current => { current.scene!.items[0].x -= 0.1; }) as ReviewedProject;
    const changedContext = await writeUserContextProjection(edited, {dataRoot});
    assert.throws(() => prepareLayoutReviewForSave(edited, changedContext, edited.layoutReview!), /审查已过期/);
    assert.deepEqual((await store.snapshot(p.id, 1) as ReviewedProject).layoutReviewAdoption, expectedAdoption, 'saved review is immutable after current edits');
  } finally { await store.close(); await rm(dataRoot, {recursive: true, force: true}); }
});
