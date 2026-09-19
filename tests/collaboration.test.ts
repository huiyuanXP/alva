import test from 'node:test';
import assert from 'node:assert/strict';
import { randomUUID } from 'node:crypto';
import { Store } from '../apps/api/store.js';
import { buildApp } from '../apps/api/app.js';
import type { ProjectData } from '../packages/contracts/index.js';

function cookie(response: any) { return response.cookies[0].name + '=' + response.cookies[0].value; }
function answers(p: ProjectData) {
  const now = new Date().toISOString(), evidenceId = randomUUID();
  p.evidence.push({ id: evidenceId, quote: '我希望客厅保留阅读角，原话不可替代。', source: 'user_chat', room_id: 'living', created_at: now });
  p.intake_answers = [
    { id: randomUUID(), question_id: 'Q13', room_id: null, answer_text: '温暖、安静', answer_state: 'answered', choice: 'E', source: 'owner', confirmation_state: 'confirmed', evidence_ids: [evidenceId], version: p.version + 1, updated_at: now },
    { id: randomUUID(), question_id: 'Q02', room_id: null, answer_text: 'SECRET住址', answer_state: 'answered', choice: 'E', source: 'owner', confirmation_state: 'confirmed', evidence_ids: [], version: p.version + 1, updated_at: now },
    { id: randomUUID(), question_id: 'Q19', room_id: null, answer_text: '五万到六万', answer_state: 'answered', choice: 'E', source: 'owner', confirmation_state: 'confirmed', evidence_ids: [], version: p.version + 1, updated_at: now, budget: { target: 50000, ceiling: 60000, currency: 'SGD' } },
    { id: randomUUID(), question_id: 'Q20', room_id: null, answer_text: 'SGD', answer_state: 'answered', choice: 'E', source: 'owner', confirmation_state: 'confirmed', evidence_ids: [], version: p.version + 1, updated_at: now },
    { id: randomUUID(), question_id: 'Q21', room_id: null, answer_text: '施工与家具', answer_state: 'answered', choice: 'E', source: 'owner', confirmation_state: 'confirmed', evidence_ids: [], version: p.version + 1, updated_at: now },
    { id: randomUUID(), question_id: 'Q06', room_id: null, answer_text: '只共享必要内容', answer_state: 'answered', choice: 'E', source: 'owner', confirmation_state: 'confirmed', evidence_ids: [], version: p.version + 1, updated_at: now, sharing: { mode: 'selected', question_ids: ['Q13','Q19','Q20','Q21'], attachment_ids: [] } },
  ];
}

test('project invite creates scoped designer session, sanitized board and read-only enforcement', async () => {
  const store = new Store(); await store.init(); const app = await buildApp(store, { accessCode: 'owner-code', origin: 'http://127.0.0.1', assets: false });
  try {
    const owner = await app.inject({ method: 'POST', url: '/api/session/login', payload: { code: 'owner-code' } }); assert.equal(owner.statusCode, 200); const ownerCookie = cookie(owner);
    const project = await store.create('owner'), other = await store.create('owner');
    const invite = await app.inject({ method: 'POST', url: `/api/projects/${project.id}/collaboration/invite`, headers: { cookie: ownerCookie } }); assert.equal(invite.statusCode, 200); const code = invite.json().code;
    const designer = await app.inject({ method: 'POST', url: '/api/session/login', payload: { code } }); assert.equal(designer.statusCode, 200); const designerCookie = cookie(designer);
    assert.equal((await app.inject({ url: '/api/session', headers: { cookie: designerCookie } })).json().role, 'designer');
    assert.deepEqual((await app.inject({ url: '/api/projects', headers: { cookie: designerCookie } })).json().projects.map((x:any)=>x.id), [project.id]);
    await store.mutate(project.id, 'owner', randomUUID(), 0, 'fixture', {}, p => answers(p));
    const board = await app.inject({ url: `/api/projects/${project.id}/designer-board`, headers: { cookie: designerCookie } }); assert.equal(board.statusCode, 200); const data = board.json();
    assert.equal(data.requirements.some((r:any)=>r.value === '温暖、安静'), true); assert.equal(data.requirements.some((r:any)=>r.value.includes('SECRET')), false); assert.deepEqual(data.budget, { target: 50000, ceiling: 60000, currency: 'SGD', scope: '施工与家具', state: '用户意向 · 非报价' });
    assert.equal((await app.inject({ url: `/api/projects/${other.id}/designer-board`, headers: { cookie: designerCookie } })).statusCode, 403);
    const view = await app.inject({ url: `/api/projects/${project.id}/collaboration/view`, headers: { cookie: designerCookie } }); assert.equal(view.statusCode, 200); const shared = view.json().project; assert.equal(JSON.stringify(shared).includes('SECRET住址'), false); assert.equal(shared.intake_answers.some((a:any)=>a.question_id==='Q02'), false);
    const forbidden = await app.inject({ method: 'POST', url: `/api/projects/${project.id}/requirements`, headers: { cookie: designerCookie }, payload: {} }); assert.equal(forbidden.statusCode, 403);
    assert.equal((await app.inject({ url: `/api/projects/${project.id}`, headers: { cookie: designerCookie } })).statusCode, 403);
    assert.equal((await app.inject({ method: 'POST', url: `/api/projects/${project.id}/scene/save`, headers: { cookie: designerCookie }, payload: { scene: shared.scene, expected_version: shared.version, request_id: randomUUID() } })).statusCode, 403);
    const suggestion = await app.inject({ method: 'POST', url: `/api/projects/${project.id}/collaboration/suggestions`, headers: { cookie: designerCookie }, payload: { request_id: randomUUID(), expected_version: 1, room_id: 'living', text: '建议保留一条可调整的阅读动线' } }); assert.equal(suggestion.statusCode, 200, suggestion.body);
    const saved = await store.get(project.id, 'owner'); assert.equal(saved.collaboration_suggestions?.[0].author_role, 'designer'); assert.equal(saved.requirements.some(r=>r.confirmation_state==='confirmed'), false);
    const raceVersion = saved.version;
    const race = await Promise.all([1, 2].map(n => app.inject({ method: 'POST', url: `/api/projects/${project.id}/collaboration/suggestions`, headers: { cookie: designerCookie }, payload: { request_id: randomUUID(), expected_version: raceVersion, room_id: 'living', text: `并发建议 ${n}` } })));
    assert.deepEqual(race.map(r => r.statusCode).sort(), [200, 409]);
    assert.equal((await store.get(project.id, 'owner')).collaboration_suggestions?.length, 2);
  } finally { await app.close(); await store.close(); }
});
