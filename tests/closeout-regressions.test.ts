import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import React from 'react';
import { renderToStaticMarkup } from 'react-dom/server';
import { Store } from '../apps/api/store.js';
import { buildApp } from '../apps/api/app.js';
import { MediaService } from '../apps/api/media.js';
import { ChatService } from '../apps/api/chat.js';
import { MediaInput } from '../apps/web/src/MediaInput.js';
import { sampleProject } from '../apps/api/sample.js';

async function referenceFixture() {
  const store = new Store();
  await store.init();
  const app = await buildApp(store, {
    assets: false,
    accessCode: 'synthetic-closeout',
    referenceGenerator: async () => ({ lines: [{ asset_id: 'chair', quantity: 1 }], text: '未采用参考' }),
  });
  const login = await app.inject({ method: 'POST', url: '/api/session/login', payload: { code: 'synthetic-closeout' } });
  const headers = { cookie: `${login.cookies[0].name}=${login.cookies[0].value}` };
  const project = await store.create('owner');
  const post = (path: string, payload: unknown) => app.inject({ method: 'POST', url: `/api/projects/${project.id}${path}`, headers, payload: payload as any });
  const generated = await post('/references', { request_id: randomUUID(), expected_version: 0, room_id: 'living', text: '一把参考椅子' });
  assert.equal(generated.statusCode, 200, generated.body);
  const p = generated.json();
  const plan = p.reference_plans[0];
  const objectId = plan.lines[0].object_ids[0];
  const adopt = (version: number) => post('/references/decision', { request_id: randomUUID(), expected_version: version, room_id: 'living', plan_id: plan.id, object_ids: [objectId], action: 'accept', confirmed: true });
  return { store, app, p, projectId: project.id, objectId, post, adopt, close: async () => { await app.close(); await store.close(); } };
}

test('accepted reference cannot cross its bound room or floor through generic scene save', async () => {
  const f = await referenceFixture();
  try {
    const accepted = await f.adopt(f.p.version);
    assert.equal(accepted.statusCode, 200, accepted.body);
    const before = accepted.json();
    const events = await f.store.events(f.projectId, 0);
    const moved = structuredClone(before.scene);
    moved.floors[0].furniture.find((o: any) => o.id === f.objectId).position = { x: 710, y: 150 };
    const result = await f.post('/scene/save', { request_id: randomUUID(), expected_version: before.version, scene: moved });
    assert.equal(result.statusCode, 409, 'moving a confirmed reference to room2 must not silently update living-room requirements');
    assert.deepEqual(await f.store.get(f.projectId, 'owner'), before);
    assert.deepEqual(await f.store.events(f.projectId, 0), events);
    const otherFloor = structuredClone(before.scene);
    const ref = otherFloor.floors[0].furniture.find((o: any) => o.id === f.objectId);
    otherFloor.floors[0].furniture = otherFloor.floors[0].furniture.filter((o: any) => o.id !== f.objectId);
    otherFloor.floors.push({ id: 'upper', name: 'upper', level: 1, walls: [], rooms: [], doors: [], windows: [], furniture: [ref] });
    assert.equal((await f.post('/scene/save', { request_id: randomUUID(), expected_version: before.version, scene: otherFloor })).statusCode, 409);
  } finally { await f.close(); }
});

test('reference adoption and accepted scene saves reject unsupported scaling without changing confirmation', async () => {
  const f = await referenceFixture();
  try {
    const scaled = structuredClone(f.p.scene);
    scaled.floors[0].furniture.find((o: any) => o.id === f.objectId).scale.x = 2;
    const saved = await f.post('/scene/save', { request_id: randomUUID(), expected_version: f.p.version, scene: scaled });
    assert.equal(saved.statusCode, 200, saved.body);
    const pending = saved.json();
    assert.equal((await f.adopt(pending.version)).statusCode, 409, 'confirmation must not record raw width for physically scaled furniture');
    assert.deepEqual(await f.store.get(f.projectId, 'owner'), pending);
    const restored = await f.post('/scene/save', { request_id: randomUUID(), expected_version: pending.version, scene: f.p.scene });
    assert.equal(restored.statusCode, 200, restored.body);
    const accepted = await f.adopt(restored.json().version);
    assert.equal(accepted.statusCode, 200, accepted.body);
    const before = accepted.json();
    for (const axis of ['x', 'y', 'z']) {
      const scene = structuredClone(before.scene);
      scene.floors[0].furniture.find((o: any) => o.id === f.objectId).scale[axis] = 2;
      assert.equal((await f.post('/scene/save', { request_id: randomUUID(), expected_version: before.version, scene })).statusCode, 409, `accepted reference scale.${axis}`);
      assert.deepEqual(await f.store.get(f.projectId, 'owner'), before);
    }
    const missing = structuredClone(before.scene);
    delete missing.floors[0].furniture.find((o: any) => o.id === f.objectId).width;
    assert.equal((await f.post('/scene/save', { request_id: randomUUID(), expected_version: before.version, scene: missing })).statusCode, 409);
  } finally { await f.close(); }
});

function syntheticWav(): Buffer {
  const b = Buffer.alloc(44 + 32000);
  b.write('RIFF', 0); b.writeUInt32LE(b.length - 8, 4); b.write('WAVEfmt ', 8);
  b.writeUInt32LE(16, 16); b.writeUInt16LE(1, 20); b.writeUInt16LE(1, 22);
  b.writeUInt32LE(16000, 24); b.writeUInt32LE(32000, 28); b.writeUInt16LE(2, 32); b.writeUInt16LE(16, 34);
  b.write('data', 36); b.writeUInt32LE(32000, 40);
  return b;
}

test('failed concurrent re-analysis preserves explicitly confirmed corrected transcript and attachment status', async () => {
  const store = new Store(); await store.init();
  const p = await store.create('owner');
  const chat = new ChatService(store, async () => { throw new Error('Synthetic model failure after durable user confirmation'); });
  let calls = 0;
  let release!: () => void;
  let entered!: () => void;
  const gate = new Promise<void>(resolve => { release = resolve; });
  const started = new Promise<void>(resolve => { entered = resolve; });
  const media = new MediaService(store, async () => {
    calls++;
    if (calls === 2) { entered(); await gate; }
    return new Response(JSON.stringify({ choices: [{ message: { content: 'Original transcript' } }] }));
  }, chat);
  try {
    let q = await media.upload(p.id, 'owner', { request_id: randomUUID(), expected_version: 0, room_id: 'living', mime: 'audio/wav', data: syntheticWav().toString('base64') });
    const id = q.attachments![0].id;
    q = await media.analyze(p.id, 'owner', { request_id: randomUUID(), expected_version: q.version, attachment_id: id });
    const pending = media.analyze(p.id, 'owner', { request_id: randomUUID(), expected_version: q.version, attachment_id: id });
    const settled = pending.then(value => ({ value, error: null }), error => ({ value: null, error }));
    await started;
    q = await store.get(p.id, 'owner');
    await media.confirm(p.id, 'owner', { request_id: randomUUID(), expected_version: q.version, attachment_id: id, transcript: '业主明确纠正后的文字', confirmed: true });
    await chat.active.get(p.id)?.promise;
    release();
    assert.ok((await settled).error, 'stale analysis must report its version conflict');
    const after = await store.get(p.id, 'owner');
    assert.equal(after.attachments![0].status, 'confirmed');
    assert.equal(after.attachments![0].corrected_transcript, '业主明确纠正后的文字');
    assert.equal(after.media_analyses!.at(-1)!.status, 'failed');
    assert.ok(after.messages.some(m => m.role === 'user' && m.content === '业主明确纠正后的文字'));
  } finally { release?.(); await chat.stop(); await store.close(); }
});

test('reloaded media form displays the persisted correction instead of the original transcription', () => {
  const p = sampleProject(randomUUID());
  p.attachments = [{ id: 'synthetic-audio', room_id: 'living', message_id: 'synthetic-message', mime: 'audio/wav', status: 'confirmed', transcript: 'ORIGINAL_WRONG_TEXT', corrected_transcript: 'PERSISTED_CORRECTED_TEXT' }];
  const html = renderToStaticMarkup(React.createElement(MediaInput, { project: p, roomId: 'living', visible: true, commit: async () => p }));
  assert.match(html, /<textarea[^>]*>PERSISTED_CORRECTED_TEXT<\/textarea>/);
  assert.doesNotMatch(html, /<textarea[^>]*>ORIGINAL_WRONG_TEXT<\/textarea>/);
});
