import test from 'node:test';
import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {activeAnswers, brief, flags, items, path, selectedRooms, validation, consultationVision, condition, priorities,
  type Answers, type Value} from '../packages/contracts/alva/home-vision/flow.js';
import {completeValue} from '../packages/contracts/alva/home-vision/field-values.js';
import {updateReferences} from '../packages/contracts/alva/home-vision/references.js';
import {snapshotProject} from '../api/snapshots/state.js';
import {emptyProject} from '../api/model.js';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';

const answers = (entries: Record<string, Value>): Answers => Object.fromEntries(
  Object.entries(entries).map(([id, value]) => [id, {state: 'answered', value}]),
);

test('room changes preserve an inactive priority without rejecting the next draft', () => {
  const draft = answers({Q05a: ['Q05a.bedroom', 'Q05a.bathroom'], Q05b: 'Q05a.kitchen'});
  const before = structuredClone(draft);
  assert.deepEqual(validation(draft), []);
  assert.equal(activeAnswers(draft).Q05b, undefined);
  assert.deepEqual(draft, before);
});

test('one-room transition preserves raw whole-home answers without activating room flags', () => {
  for (const rooms of [['Q05a.whole_home'], ['Q05a.bedroom', 'Q05a.kitchen']]) {
    const draft = answers({Q01a: 'Q01a.one_room', Q04a: ['Q04a.children'], Q05a: rooms});
    assert.deepEqual(validation(draft), []);
    assert.deepEqual(selectedRooms(draft), []);
    assert.equal(activeAnswers(draft).Q05a, undefined);
    assert.equal([...flags(draft)].some(flag => flag.startsWith('ROOM_')), false);
    assert.deepEqual(path(draft).filter(card => card.stage === 'S3').map(card => card.card), ['Q26', 'Q27', 'Q28']);
    assert.deepEqual(draft.Q05a.value, rooms);
  }
});

test('area remains a draft until both a number and an explicit unit are present', () => {
  const group = items.find(item => item.id === 'Q03b')!;
  const draft = answers({Q03b: {'Q03b.size': {amount: 85}, 'Q03b.bedrooms': 2}});
  assert.deepEqual(validation(draft), []);
  assert.equal(completeValue(group, draft.Q03b.value), false);
  assert.deepEqual(activeAnswers(draft).Q03b.value, {'Q03b.bedrooms': 2});
  draft.Q03b.value = {'Q03b.size': {amount: 85, unit: 'sqm'}, 'Q03b.bedrooms': 2};
  assert.equal(completeValue(group, draft.Q03b.value), true);
  assert.deepEqual(activeAnswers(draft).Q03b.value, draft.Q03b.value);
  assert(validation(answers({Q03b: {'Q03b.size': {amount: -1, unit: 'sqm'}}})).length);
  assert(validation(answers({Q03b: {'Q03b.size': {amount: 85, unit: 'guess'}}})).length);
});

test('budget currency is never inferred and unfinished ranges do not enter the brief', () => {
  const item = items.find(item => item.id === 'Q43a')!;
  const draft = answers({Q02a: {country: 'Singapore', city: 'Singapore'}, Q43a: {comfortable: 10000, maximum: 15000}});
  assert.deepEqual(validation(draft), []);
  assert.equal(completeValue(item, draft.Q43a.value), false);
  assert.equal(brief(draft).some(entry => entry.id === 'Q43a'), false);
  draft.Q43a.value = {currency: 'SGD', comfortable: 10000, maximum: 15000};
  assert.equal(completeValue(item, draft.Q43a.value), true);
  assert.deepEqual(brief(draft).find(entry => entry.id === 'Q43a')?.value, draft.Q43a.value);
  assert.equal(completeValue(item, {currency: 'SGD', comfortable: 15000, maximum: 10000}), false);
  assert.equal(completeValue(item, {currency: 'Other', currencyCode: '', comfortable: 1, maximum: 2}), false);
  assert.equal(completeValue(item, {choice: 'Q43a.rather_not_say'}), true);
});

test('hidden nested property details are retained but excluded from effective answers', () => {
  const draft = answers({Q03a: 'Q03a.house', Q03b: {'Q03b.floor': 'Fourth floor', 'Q03b.bedrooms': 2}});
  assert.deepEqual(activeAnswers(draft).Q03b.value, {'Q03b.bedrooms': 2});
  assert.equal((draft.Q03b.value as Record<string, Value>)['Q03b.floor'], 'Fourth floor');
});

test('per-room scope excludes removed rooms and hidden options without deleting the draft', () => {
  const draft=answers({Q05a:['Q05a.bedroom','Q05a.bathroom'],Q34a:'Q34a.rent',
    Q35b:{'Q05a.bedroom':'Q35a.furnish','Q05a.bathroom':'Q35a.remodel','Q05a.kitchen':'Q35a.renovation'}});
  const original=structuredClone(draft);
  assert.deepEqual(activeAnswers(draft).Q35b.value,{'Q05a.bedroom':'Q35a.furnish'});
  assert.deepEqual(draft,original);
});

test('explicit unknown controls trigger source rules while unfinished budgets stay unknown', () => {
  const draft=answers({Q35a:'Q35a.renovation',Q43a:{comfortable:10000,maximum:15000}});
  draft.Q39a={state:'unknown',value:null};
  assert.equal(condition('selected(Q39a.not_sure)',draft,flags(draft)),true);
  assert.equal(condition('answered(Q39a)',draft,flags(draft)),false);
  assert(priorities(draft,[]).some(rule=>rule.id==='R01'));
  assert(priorities(draft,[]).some(rule=>rule.id==='R02'));
  draft.Q39a={state:'skipped',value:null};
  assert.equal(condition('selected(Q39a.skip)',draft,flags(draft)),true);
  assert.equal(condition('selected(Q39a.not_sure)',draft,flags(draft)),false);
});

test('inactive room answers cannot create follow-up priorities', () => {
  const draft=answers({Q01a:'Q01a.one_room',Q05a:'Q05a.bedroom',Q38a:{text:'Old structural note'}});
  assert(!priorities(draft,[]).some(rule=>rule.id==='R06'));
  assert.deepEqual(draft.Q38a.value,{text:'Old structural note'});
});

test('same multi-selections in different orders do not manufacture a disagreement', () => {
  const first=answers({Q48a:'Q48a.together',Q06a:['Q06a.cozy','Q06a.calm']});
  const second=answers({Q48a:'Q48a.together',Q06a:['Q06a.calm','Q06a.cozy']});
  const people=[first,second].map((a,index)=>({id:String(index),name:String(index),answers:a,cursor:'Q48',updatedAt:'',version:1}));
  assert(!priorities(first,people).some(rule=>rule.id==='R07'));
  second.Q06a.value=['Q06a.bold'];
  assert(priorities(first,people).some(rule=>rule.id==='R07'));
});

test('invalid selection shapes, duplicate options and disabled other choices are rejected', () => {
  assert(validation(answers({Q01a: 7})).length);
  assert(validation(answers({Q05a: ['Q05a.kitchen', 'Q05a.kitchen']})).length);
  const withoutOther = items.find(item => ['single', 'multi'].includes(item.type) && item.other === false)!;
  assert(withoutOther);
  assert(validation(answers({[withoutOther.id]: {choice: `${withoutOther.id}.other`, text: 'Not allowed'}})).length);
});

test('reference removal never transfers another image annotation to the next image', () => {
  const references = [{url: 'https://example.com/first'}, {url: 'https://example.com/second'}];
  const draft = answers({Q09a: references, Q09b: {'0-0': 'First image only', '1-0': 'Second image only', '1-1': 'Avoid its rug'}});
  const next = updateReferences(draft, [references[1]]);
  assert.deepEqual(next.Q09b.value, {'0-0': 'Second image only', '0-1': 'Avoid its rug'});
  assert.deepEqual(draft.Q09b.value, {'0-0': 'First image only', '1-0': 'Second image only', '1-1': 'Avoid its rug'});
});

test('manual snapshots preserve the new versioned questionnaire and its explicit budget', () => {
  const project = emptyProject('Synthetic versioned questionnaire');
  project.homeVision = {version: 'home-vision-v4', responses: [{id: randomUUID(), name: 'Alex', version: 1,
    cursor: 'Q43', updatedAt: new Date().toISOString(), answers: answers({Q43a: {currency: 'SGD', comfortable: 10, maximum: 20}})}]};
  const copy = snapshotProject(project);
  assert.deepEqual(copy.homeVision, project.homeVision);
  assert.notEqual(copy.homeVision, project.homeVision);
  assert.equal(project.savedVersion, 0);
});

test('consultation includes valid references but not uploaded bytes or an unfinished currency', () => {
  const vision = {version: 'home-vision-v4' as const, responses: [{id: randomUUID(), name: 'Alex', version: 1,
    cursor: 'Q09', updatedAt: '', answers: answers({Q09a: [{name: 'reference.png', mime: 'image/png', data: 'secret-image-bytes'}],
      Q43a: {comfortable: 10, maximum: 20}})}]};
  const result = consultationVision(vision)!;
  assert.equal(JSON.stringify(result).includes('secret-image-bytes'), false);
  assert.equal(result.responses[0].answers.some(item => item.id === 'Q43a'), false);
  assert.equal(JSON.stringify(result).includes('reference.png'), true);
});

test('real API enforces read-only access and preserves respondent isolation during conflict and replay', async () => {
  process.env.ALVA_ACCESS_CODE = 'alva057-isolated-recovery-code';
  const store = new AlvaStore();
  await store.init();
  const {project} = await store.create('Synthetic recovery API');
  await store.ensureAccessCode(project.id);
  const owner = await store.issueInternalSession(project.id);
  const invite = await store.invite(project.id, 'designer');
  const designer = await store.exchangeAccessCode(process.env.ALVA_ACCESS_CODE, invite.token);
  const app = await buildAlva(store, {assets: false});
  const body = {requestId: randomUUID(), id: randomUUID(), name: 'Alex', expectedVersion: 0, cursor: 'Q05',
    answers: answers({Q05a: ['Q05a.bedroom'], Q05b: 'Q05a.kitchen'})};
  const send = (token: string, payload = body) => app.inject({method: 'POST', url: '/api/intake/vision',
    headers: {cookie: `alva_session=${token}`}, payload});
  try {
    assert.equal((await send(designer.token)).statusCode, 403);
    assert.equal((await send(owner.token)).statusCode, 200);
    const after = await store.get(project.id);
    assert.equal((await send(owner.token)).statusCode, 200);
    assert.equal((await store.get(project.id)).revision, after.revision);
    assert.equal((await send(owner.token, {...body, requestId: randomUUID()})).statusCode, 409);
    assert.equal((await send(owner.token, {...body, requestId: randomUUID(), id: randomUUID(), name: 'Sam'})).statusCode, 200);
    assert.equal((await send(owner.token, {...body, requestId: randomUUID(), expectedVersion: 1})).statusCode, 200);
    assert.equal((await send(owner.token, {...body, requestId: randomUUID(), expectedVersion: 2, cursor: 'summary:invalid'})).statusCode, 422);
    const result = await store.get(project.id);
    assert.equal(result.homeVision?.responses.length, 2);
    assert.equal(result.homeVision?.responses[0].id,body.id);
    assert.deepEqual(result.homeVision?.responses[0].answers, body.answers);
    assert.deepEqual(result.answers, []);
    assert.equal(result.savedVersion, 0);
    assert.equal((await store.versions(project.id)).length, 0);
    const briefResponse = await app.inject({method: 'GET', url: '/api/intake/vision/brief', headers: {cookie: `alva_session=${owner.token}`}});
    assert.equal(briefResponse.statusCode, 200);
    assert.equal(briefResponse.json().responses[0].answers.some((item: {id: string}) => item.id === 'Q05b'), false);
  } finally {await app.close(); await store.close()}
});
