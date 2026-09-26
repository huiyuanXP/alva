import {chromium, expect} from '@playwright/test';
import {mkdir, writeFile} from 'node:fs/promises';
import {randomUUID} from 'node:crypto';
import assert from 'node:assert/strict';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import type {Answers, Response, Value} from '../packages/contracts/alva/home-vision/flow.js';

const origin = 'http://127.0.0.1:4287';
const dir = `evidence/${new Date().toISOString().replace(/[:.]/g, '')}-ALVA057-recovery-browser`;
await mkdir(dir, {recursive: true});
process.env.ALVA_ACCESS_CODE = 'alva057-isolated-browser-code';
const store = new AlvaStore();
await store.init();
const {project} = await store.create('Synthetic Home Vision recovery acceptance');
await store.ensureAccessCode(project.id);
const session = await store.issueInternalSession(project.id);
let snapshotCalls=0;
const app = await buildAlva(store, {origin,chatCodex:async input=>{
  // Isolate only the external model; exercise the registered production tool and SSE path.
  assert(input.text.includes('home-vision-v4'));
  const tool=input.tools?.find(tool=>tool.name==='get_snapshot');
  assert(tool,'The real main Chat snapshot tool must be registered');
  const snapshot=await tool.run({}) as {project:{homeVision:{responses:{name:string;answers:{id:string;value:Value}[]}[]}}};
  snapshotCalls++;
  const people=snapshot.project.homeVision.responses;
  assert.deepEqual(people.map(person=>person.name),['Alex','Sam']);
  assert.equal(people[0].answers.some(item=>item.id==='Q43a'),false);
  assert.deepEqual(people[1].answers.find(item=>item.id==='Q43a')?.value,{choice:'',comfortable:10000,maximum:15000,currency:'SGD'});
  assert(JSON.stringify(snapshot).includes('reference.png'));
  assert(!JSON.stringify(snapshot).includes('secret-image-bytes'));
  const text='已分别读取 Alex 和 Sam 的 Home Vision。Sam 的预算为 SGD 10,000–15,000。点击咨询栏的 Your Home Vision 继续填写，系统不会合并两人的回答。';
  input.onDelta?.(text);return text;
}});
await app.listen({host: '127.0.0.1', port: 4287});
const makeAnswers = (values: Record<string, Value>): Answers => Object.fromEntries(
  Object.entries(values).map(([key, value]) => [key, {state: 'answered', value}]),
);
const save = async (id: string, name: string, expectedVersion: number, cursor: string, answers: Answers) => {
  const result = await app.inject({method: 'POST', url: '/api/intake/vision',
    headers: {cookie: `alva_session=${session.token}`},
    payload: {requestId: randomUUID(), id, name, expectedVersion, cursor, answers}});
  assert.equal(result.statusCode, 200, result.body);
};
const alex = randomUUID(), sam = randomUUID();
await save(alex, 'Alex', 0, 'Q03', makeAnswers({Q02a: {country: 'Singapore', city: 'Singapore'}, Q03a: 'Q03a.hdb',
  Q43a:{comfortable:10,maximum:20},Q09a:[{name:'reference.png',mime:'image/png',data:'secret-image-bytes'}]}));
await save(sam, 'Sam', 0, 'Q07', makeAnswers({Q07a: 'Q07a.earthy'}));
const browser = await chromium.launch({headless: true, args: ['--disable-dev-shm-usage']});
const context = await browser.newContext({viewport: {width: 1440, height: 900}});
await context.addCookies([{name: 'alva_session', value: session.token, domain: '127.0.0.1', path: '/'}]);
const page = await context.newPage();
const errors: string[] = [], checks: string[] = [];
page.on('pageerror', error => errors.push(error.message));
const modal = page.getByRole('dialog', {name: 'Your Home Vision'});
const current = async (id: string): Promise<Response> => (await store.get(project.id)).homeVision!.responses.find(response => response.id === id)!;
try {
  // No form data or UI is mocked: seed via the real API, then operate real controls.
  await page.goto(`${origin}/#vision=${alex}`);
  await expect(modal).toBeVisible();
  await expect(modal.getByLabel('Respondent')).toHaveValue(alex);
  await modal.locator('summary').filter({hasText: 'Add more detail (optional)'}).click();
  const area = modal.getByLabel('Approximate size amount');
  await area.fill('85');
  await expect(modal.getByRole('button', {name: 'Continue', exact: true})).toBeDisabled();
  await modal.getByRole('button', {name: 'Save now', exact: true}).click();
  await expect(modal.getByRole('status')).toHaveText('All changes saved');
  const partial = await app.inject({method: 'GET', url: '/api/intake/vision/brief', headers: {cookie: `alva_session=${session.token}`}});
  assert.equal(partial.json().responses.find((response: {id: string}) => response.id === alex).answers.some((item: {id: string}) => item.id === 'Q03b'), false);
  await modal.getByLabel('Area unit').selectOption('sqm');
  await expect(modal.getByRole('button', {name: 'Continue', exact: true})).toBeEnabled();
  await modal.getByRole('button', {name: 'Save now', exact: true}).click();
  await expect(modal.getByRole('status')).toHaveText('All changes saved');
  await page.screenshot({path: `${dir}/confirmed-area.png`});
  checks.push('explicit area unit: partial draft saves, but does not enter the brief or enable Continue');

  await modal.getByLabel('Respondent').selectOption(sam);
  await expect(modal.getByRole('heading')).toHaveText('Which palette appeals most to you?');
  const colorNote = modal.getByLabel('Any colors you love, or would never have? (optional)');
  const beforeLoss = await current(sam);
  const requestIds: string[] = [];
  let loseFirstResponse = true;
  await page.route('**/api/intake/vision', async route => {
    if (route.request().method() !== 'POST') return route.continue();
    const payload = route.request().postDataJSON();
    requestIds.push(payload.requestId);
    if (loseFirstResponse) {
      loseFirstResponse = false;
      const committed = await route.fetch();
      assert.equal(committed.status(), 200);
      // Commit succeeded; deliberately drop only its delivery to the browser.
      return route.abort('failed');
    }
    return route.continue();
  });
  await colorNote.fill('Sage green after a lost response');
  await modal.getByRole('button', {name: 'Save now', exact: true}).click();
  await expect(modal.getByRole('alert')).toBeVisible();
  await expect(colorNote).toHaveValue('Sage green after a lost response');
  assert.equal((await current(sam)).version, beforeLoss.version + 1);
  await modal.getByRole('button', {name: 'Retry save', exact: true}).click();
  await expect(modal.getByRole('status')).toHaveText('All changes saved');
  assert.equal(requestIds.length, 2);
  assert.equal(requestIds[0], requestIds[1]);
  assert.equal((await current(sam)).version, beforeLoss.version + 1);
  await page.unroute('**/api/intake/vision');
  await page.screenshot({path: `${dir}/lost-response-recovered.png`});
  checks.push('a genuinely committed response can be lost and retried with the same request ID, without duplicate writes');

  const savedSam = await current(sam);
  await save(sam, 'Sam', savedSam.version, 'Q07', {...savedSam.answers,
    Q07b: {state: 'answered', value: 'Newer answer from a second window'}});
  await colorNote.fill('Unsaved local answer to keep');
  await modal.getByRole('button', {name: 'Save now', exact: true}).click();
  await expect(modal.getByRole('alert')).toContainText('Another window saved newer answers');
  await expect(colorNote).toHaveValue('Unsaved local answer to keep');
  await modal.getByRole('button', {name: 'Save and close questionnaire'}).click();
  await expect(modal).toBeVisible();
  await expect(colorNote).toHaveValue('Unsaved local answer to keep');
  await page.screenshot({path: `${dir}/version-conflict.png`});
  page.once('dialog', dialog => void dialog.dismiss());
  await modal.getByRole('button', {name: 'Load saved answers', exact: true}).click();
  await expect(colorNote).toHaveValue('Unsaved local answer to keep');
  page.once('dialog', dialog => void dialog.accept());
  await modal.getByRole('button', {name: 'Load saved answers', exact: true}).click();
  await expect(colorNote).toHaveValue('Newer answer from a second window');
  await expect(modal.getByRole('alert')).toHaveCount(0);
  checks.push('real concurrent update preserves local edits; cancel keeps them, explicit reload resolves the conflict');

  await modal.getByRole('button', {name: 'Save and close questionnaire'}).click();
  await expect(modal).toBeHidden();
  await page.goto(`${origin}/#vision=${sam}`);
  await page.reload();
  await expect(modal).toBeVisible();
  await expect(modal.getByLabel('Respondent')).toHaveValue(sam);
  await expect(colorNote).toHaveValue('Newer answer from a second window');
  assert.equal((await current(alex)).answers.Q07b, undefined);
  await page.screenshot({path: `${dir}/separate-respondent.png`});
  checks.push('respondent link opens the named response after reload, without merging another person’s answers');

  await modal.getByRole('button', {name: 'Save and close questionnaire'}).click();
  const latest = await current(sam);
  await save(sam, 'Sam', latest.version, 'Q43', latest.answers);
  await page.reload();
  await expect(modal.getByRole('heading')).toContainText('budget');
  await modal.getByLabel('Comfortable amount').fill('10000');
  await modal.getByLabel('Maximum amount').fill('15000');
  await expect(modal.getByRole('button', {name: 'Continue', exact: true})).toBeDisabled();
  await modal.getByLabel('Currency', {exact: true}).selectOption('SGD');
  await expect(modal.getByRole('button', {name: 'Continue', exact: true})).toBeEnabled();
  await modal.getByRole('button', {name: 'Save now', exact: true}).click();
  await expect(modal.getByRole('status')).toHaveText('All changes saved');
  await page.screenshot({path: `${dir}/confirmed-currency.png`});
  checks.push('budget amounts require an explicitly selected currency, and save without creating a global snapshot');

  await modal.getByRole('button', {name: 'Save and close questionnaire'}).click();
  let failLoad = true;
  await page.route('**/api/intake/vision', route => {
    if (route.request().method() === 'GET' && failLoad) {
      failLoad = false;
      return route.fulfill({status: 503, contentType: 'application/json', body: JSON.stringify({error: 'Synthetic read outage'})});
    }
    return route.continue();
  });
  await page.getByRole('button', {name: /Your Home Vision/}).click();
  await expect(modal.getByRole('button', {name: 'Retry loading'})).toBeVisible();
  await modal.getByRole('button', {name: 'Retry loading'}).click();
  await expect(modal.getByRole('heading')).toContainText('budget');
  await page.unroute('**/api/intake/vision');
  checks.push('initial read failure has a functioning reload action');
  await modal.getByRole('button',{name:'Save and close questionnaire'}).click();
  const beforeChat=structuredClone((await store.get(project.id)).homeVision);
  await page.locator('.composer textarea').fill('查看我们的 Your Home Vision，并告诉我怎样继续填写。');
  await page.getByRole('button',{name:'发送 ↑',exact:true}).click();
  await expect(page.locator('.message.assistant')).toContainText('已分别读取 Alex 和 Sam');
  await expect.poll(async()=>(await store.get(project.id)).messages.at(-1)?.status).toBe('completed');
  assert.equal(snapshotCalls,1);
  assert.deepEqual((await store.get(project.id)).homeVision,beforeChat);
  await page.getByRole('button',{name:/Your Home Vision/}).click();
  await expect(modal.getByRole('heading')).toContainText('budget');
  await expect(modal.getByLabel('Currency',{exact:true})).toHaveValue('SGD');
  await modal.getByRole('button',{name:'Save and close questionnaire'}).click();
  await page.screenshot({path:`${dir}/main-chat-home-vision.png`});
  checks.push('isolated-model main Chat: real get_snapshot tool, separate respondents, SSE reply, questionnaire resume without writes');
  assert.deepEqual(errors, []);
  assert.equal((await store.versions(project.id)).length, 0);
  assert.deepEqual((await store.get(project.id)).answers, []);
  await writeFile(`${dir}/result.json`, JSON.stringify({ok: true, checks, errors, requestIds}, null, 2));
  console.log(JSON.stringify({ok: true, dir, checks}, null, 2));
} catch (error) {
  await page.screenshot({path: `${dir}/failure.png`});
  await writeFile(`${dir}/result.json`, JSON.stringify({ok: false, checks, error: String(error), errors}, null, 2));
  console.error(dir);
  throw error;
} finally {await browser.close(); await app.close(); await store.close()}
