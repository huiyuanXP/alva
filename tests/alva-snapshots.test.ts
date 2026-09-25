import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdtemp, mkdir, rm} from 'node:fs/promises';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {DomainError, type Project} from '../api/model.js';
import {validateBuildingScene} from '../api/building/types.js';
import {snapshotProject} from '../api/snapshots/state.js';
import {seedSnapshotProject} from './fixtures/alva/snapshot.js';
import type {SaveCommand, SaveReceipt} from '../packages/contracts/alva/snapshots.js';

test('ALVA-036 manual global snapshots: real HTTP/database, atomicity and durable retries', async t => {
  const previousCode = process.env.ALVA_ACCESS_CODE;
  process.env.ALVA_ACCESS_CODE = 'ALVA036-synthetic-test-code';
  await mkdir('.runtime', {recursive: true});
  const root = await mkdtemp('.runtime/alva036-unit-');
  let store = new AlvaStore(root + '/db');
  await store.init();
  const {project} = await store.create('ALVA-036 合成验收');
  await store.ensureAccessCode(project.id);
  let app = await buildAlva(store, {assets: false});
  const auth = await app.inject({method: 'POST', url: '/api/access', payload: {code: process.env.ALVA_ACCESS_CODE}});
  assert.equal(auth.statusCode, 200);
  const headers = {cookie: `alva_session=${auth.cookies[0].value}`};
  const get = () => store.get(project.id);
  const count = async () => (await store.versions(project.id)).length;
  const command = async (): Promise<SaveCommand> => ({requestId: randomUUID(), expectedRevision: (await get()).revision, confirmed: true});
  const save = (payload: SaveCommand) => app.inject({method: 'POST', url: '/api/save', headers, payload});
  let durableCommand: SaveCommand, durableReceipt: SaveReceipt;
  try {
    await t.test('requires owner, explicit confirmation and session-scoped project', async () => {
      const b = await command();
      assert.equal((await app.inject({method: 'POST', url: '/api/save', payload: b})).statusCode, 401);
      const invite = await store.invite(project.id, 'designer');
      const login = await app.inject({method: 'POST', url: '/api/access', payload: {code: process.env.ALVA_ACCESS_CODE, inviteToken: invite.token}});
      assert.equal((await app.inject({method: 'POST', url: '/api/save', headers: {cookie: `alva_session=${login.cookies[0].value}`}, payload: b})).statusCode, 403);
      assert.equal((await save({...b, confirmed: false} as never)).statusCode, 400);
      const other = await store.create('other synthetic project');
      assert.equal((await app.inject({url: `/api/projects/${other.project.id}`, headers})).statusCode, 403);
      assert.equal((await save({...b, projectId: other.project.id} as never)).statusCode, 400);
      assert.equal(await count(), 0);
    });

    await t.test('questionnaire-only drafts can be saved; missing-scene export is explicit 422', async () => {
      const response = await save(await command());
      assert.equal(response.statusCode, 200);
      assert.equal(response.json().scene, null);
      assert.equal(response.json().saveReceipt.version, 1);
      assert.ok(Number.isFinite(Date.parse(response.json().saveReceipt.createdAt)));
      assert.equal((await app.inject({url: '/api/export/1', headers})).statusCode, 422);
    });

    await t.test('edits, analysis/generation persistence and confirmations never create archive points', async () => {
      const before = await count();
      await store.mutate(project.id, randomUUID(), null, 'synthetic-seed', {}, seedSnapshotProject);
      for (const operation of ['analysis-complete', 'building-start', 'building-complete']) {
        await store.mutate(project.id, randomUUID(), null, operation, {}, p => {p.lastAnalysisEvidence++;});
        assert.equal(await count(), before);
      }
      const change = await app.inject({method: 'POST', url: '/api/purpose/confirm', headers,
        payload: {...await command(), roomId: 'room', purpose: '安静阅读'}});
      assert.equal(change.statusCode, 200);
      assert.equal(change.json().dirty, true);
      const confirm = await app.inject({method: 'POST', url: '/api/building/confirm', headers, payload: await command()});
      assert.equal(confirm.statusCode, 200);
      assert.equal(await count(), before);
      const receipts = (await store.db.query<{response: Record<string, unknown>}>('SELECT response FROM alva_commands')).rows;
      assert.ok(receipts.length > 3);
      assert.ok(receipts.every(r => r.response.kind === 'command-receipt-v1' && !('scene' in r.response) && !('answers' in r.response)));
    });

    await t.test('snapshot keeps every global field and preserves acknowledged/unresolved findings exactly', async () => {
      await store.mutate(project.id, randomUUID(), null, 'rich-fixture', {}, p => {seedSnapshotProject(p); p.candidate = structuredClone(p.scene);});
      const before = await get();
      validateBuildingScene(before.confirmedBuilding, before.confirmedTopology!.scene, 1, 'a'.repeat(64));
      const b = await command(), response = await save(b);
      assert.equal(response.statusCode, 200);
      const after = response.json<Project & {saveReceipt: SaveReceipt}>();
      const snapshot = await store.snapshot(project.id, after.saveReceipt.version);
      const {revision: _r, savedVersion: _v, dirty: _d, ...expected} = before;
      const {revision: r, savedVersion: v, dirty: d, ...actual} = snapshot;
      assert.deepEqual(actual, expected);
      assert.equal(r, before.revision + 1); assert.equal(v, before.savedVersion + 1); assert.equal(d, false);
      assert.deepEqual(snapshot.findings, before.findings);
      assert.equal(snapshot.findings[0].status, 'acknowledged');
      assert.equal(snapshot.findings[1].status, 'pending');
      assert.equal((await store.versions(project.id))[0].version, v);
    });

    await t.test('actual snapshot INSERT followed by failure rolls back snapshot, draft and receipt; retry works', async () => {
      const b = await command(), before = await get(), n = await count();
      store.failNextSave = true;
      const failed = await save(b);
      assert.equal(failed.statusCode, 500);
      assert.deepEqual(await get(), before); assert.equal(await count(), n);
      assert.equal((await store.db.query('SELECT 1 FROM alva_commands WHERE request_id=$1', [b.requestId])).rows.length, 0);
      const retried = await save(b); assert.equal(retried.statusCode, 200); assert.equal(await count(), n + 1);
      assert.equal((await save(b)).json().saveReceipt.version, retried.json().saveReceipt.version);
      assert.equal(await count(), n + 1);
    });

    await t.test('real database failure after project update and receipt insertion is fully atomic', async () => {
      const b = await command(), before = await get(), n = await count();
      await store.db.exec(`CREATE FUNCTION alva036_fail_receipt() RETURNS trigger AS $$ BEGIN
        IF NEW.request_id='${b.requestId}' THEN RAISE EXCEPTION 'ALVA036 isolated receipt write fault'; END IF;
        RETURN NEW; END; $$ LANGUAGE plpgsql;
        CREATE TRIGGER alva036_fault AFTER INSERT ON alva_commands FOR EACH ROW EXECUTE FUNCTION alva036_fail_receipt();`);
      try {
        assert.equal((await save(b)).statusCode, 500);
        assert.deepEqual(await get(), before); assert.equal(await count(), n);
        assert.equal((await store.db.query('SELECT 1 FROM alva_commands WHERE request_id=$1', [b.requestId])).rows.length, 0);
      } finally { await store.db.exec('DROP TRIGGER alva036_fault ON alva_commands; DROP FUNCTION alva036_fail_receipt();'); }
      assert.equal((await save(b)).statusCode, 200); assert.equal(await count(), n + 1);
    });

    await t.test('simultaneous duplicate saves commit one version; distinct stale requests return conflict', async () => {
      const b = await command(), n = await count();
      const [a, c] = await Promise.all([save(b), save(b)]);
      assert.equal(a.statusCode, 200); assert.equal(c.statusCode, 200);
      assert.deepEqual(a.json().saveReceipt, c.json().saveReceipt); assert.equal(await count(), n + 1);
      const after = await get();
      assert.equal((await save({...b, requestId: randomUUID()})).statusCode, 409);
      assert.deepEqual(await get(), after); assert.equal(await count(), n + 1);
    });

    await t.test('retry after later edits returns current work plus original save receipt, never rolls back', async () => {
      const b = await command(), first = await save(b), receipt = first.json().saveReceipt;
      await store.mutate(project.id, randomUUID(), null, 'later-edit', {}, p => {p.name = '重试不能覆盖的新工作稿';});
      const before = await get(), n = await count();
      const retried = await save(b);
      assert.equal(retried.statusCode, 200); assert.deepEqual(retried.json().saveReceipt, receipt);
      assert.equal(retried.json().name, before.name); assert.equal(retried.json().dirty, true);
      assert.deepEqual(await get(), before); assert.equal(await count(), n);
      assert.notEqual((await store.snapshot(project.id, receipt.version)).name, before.name);
      assert.equal((await save({...b, expectedRevision: before.revision})).statusCode, 409);
    });

    await t.test('conflicts can be explicitly reread and saved with a fresh request', async () => {
      const stale = await command();
      await store.mutate(project.id, randomUUID(), null, 'other-session-edit', {}, p => {p.scene!.rooms[0].purpose = '另一设备更新';});
      const before = await get(), n = await count();
      const conflict = await save(stale); assert.equal(conflict.statusCode, 409); assert.match(conflict.json().error, /重新读取/);
      assert.deepEqual(await get(), before); assert.equal(await count(), n);
      const read = await app.inject({url: '/api/project', headers}); assert.equal(read.json().revision, before.revision);
      assert.equal(await count(), n);
      assert.equal((await save(await command())).statusCode, 200); assert.equal(await count(), n + 1);
    });

    await t.test('new snapshots exclude legacy budgets but never rewrite working or older states', async () => {
      const legacyVersion = 1, legacy = await store.snapshot(project.id, legacyVersion);
      await store.mutate(project.id, randomUUID(), null, 'legacy-budget-fixture', {}, p => {
        Object.assign(p, {budget: {max: 123}, extra: {budget: 'legacy', preserve: 'non-budget'}});
        p.answers.push({questionId: 'Q19', roomId: null, text: 'legacy budget response', state: 'answered', locked: false, confirmed: true, evidenceId: 'budget-quote'});
        p.evidence.push({id: 'budget-quote', quote: 'legacy budget response', source: 'questionnaire', createdAt: new Date().toISOString()});
        p.lastAnalysisEvidence = p.evidence.length;
        p.findings[0].evidenceIds.push('budget-quote');
        p.intakeProgress!.cursor = {questionId: 'Q19', roomId: null};
      });
      const response = await save(await command()); assert.equal(response.statusCode, 200);
      const snap = await store.snapshot(project.id, response.json().saveReceipt.version);
      assert.ok(!JSON.stringify(snap).includes('"budget":'));
      assert.ok(!snap.answers.some(a => a.questionId === 'Q19'));
      assert.ok(!snap.evidence.some(e => e.id === 'budget-quote'));
      assert.ok(!snap.findings[0].evidenceIds.includes('budget-quote'));
      assert.equal(snap.intakeProgress!.cursor, null);
      assert.equal(snap.lastAnalysisEvidence, snap.evidence.length);
      assert.equal((snap as any).extra.preserve, 'non-budget');
      assert.ok((await get() as any).budget);
      assert.ok((await get()).answers.some(a => a.questionId === 'Q19'));
      assert.deepEqual(await store.snapshot(project.id, legacyVersion), legacy);
    });

    await t.test('legacy full-response command receipts remain retryable without new per-operation state', async () => {
      const b = await command(), first = await save(b), version = first.json().saveReceipt.version;
      await store.db.query('UPDATE alva_commands SET response=$2 WHERE project_id=$3 AND request_id=$1',
        [b.requestId, JSON.stringify(await store.snapshot(project.id, version)), project.id]);
      const n = await count();
      assert.equal((await save(b)).json().saveReceipt.version, version); assert.equal(await count(), n);
      const absent = await store.replay(project.id, randomUUID(), 'save', {}); assert.equal(absent, null);
      await assert.rejects(() => store.replay(project.id, b.requestId, 'different', {}), (e: unknown) => e instanceof DomainError && e.statusCode === 409);
    });

    await t.test('close/reopen preserves snapshots, timestamps, sessions and exactly-once retries', async () => {
      durableCommand = await command();
      const result = await save(durableCommand); assert.equal(result.statusCode, 200); durableReceipt = result.json().saveReceipt;
      const before = await get(), versions = await store.versions(project.id), snap = await store.snapshot(project.id, durableReceipt.version);
      await app.close(); await store.close();
      store = new AlvaStore(root + '/db'); await store.init(); app = await buildAlva(store, {assets: false});
      assert.deepEqual(await get(), before); assert.deepEqual(await store.versions(project.id), versions);
      assert.deepEqual(await store.snapshot(project.id, durableReceipt.version), snap);
      const retried = await save(durableCommand); assert.equal(retried.statusCode, 200);
      assert.deepEqual(retried.json().saveReceipt, durableReceipt); assert.equal(await count(), versions.length);
      assert.deepEqual(await get(), before);
      assert.deepEqual(snapshotProject(before), snap);
    });
  } finally {
    await app.close(); await store.close(); await rm(root, {recursive: true, force: true});
    if (previousCode === undefined) delete process.env.ALVA_ACCESS_CODE; else process.env.ALVA_ACCESS_CODE = previousCode;
  }
});
