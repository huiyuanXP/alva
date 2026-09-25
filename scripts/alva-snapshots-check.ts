import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {mkdir, mkdtemp, rm, writeFile} from 'node:fs/promises';
import {createServer} from 'node:net';
import {chromium, expect} from '@playwright/test';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {seedSnapshotProject} from '../tests/fixtures/alva/snapshot.js';
import type {SaveCommand} from '../packages/contracts/alva/snapshots.js';

const run = new Date().toISOString().replace(/[:.]/g, '') + '-ALVA036-browser-' + randomUUID().slice(0, 6);
const dir = 'evidence/' + run;
await mkdir(dir, {recursive: true});
await mkdir('.runtime', {recursive: true});
const database = await mkdtemp('.runtime/alva036-browser-');
const oldCode = process.env.ALVA_ACCESS_CODE;
process.env.ALVA_ACCESS_CODE = 'ALVA036-browser-synthetic-code';
const store = new AlvaStore(database + '/db');
await store.init();
const {project} = await store.create('ALVA-036 · 手动快照验收');
await store.ensureAccessCode(project.id);
await store.mutate(project.id, randomUUID(), 0, 'synthetic-fixture', {}, seedSnapshotProject);

const portProbe = createServer();
await new Promise<void>(resolve => portProbe.listen(0, '127.0.0.1', resolve));
const port = (portProbe.address() as {port: number}).port;
await new Promise<void>((resolve, reject) => portProbe.close(e => e ? reject(e) : resolve()));
const origin = `http://127.0.0.1:${port}`;
const app = await buildAlva(store, {origin});
await app.listen({host: '127.0.0.1', port});
const browser = await chromium.launch({headless: true, args: ['--disable-dev-shm-usage', '--use-angle=swiftshader', '--enable-unsafe-swiftshader']});
const context = await browser.newContext({viewport: {width: 1440, height: 1000}});
const page = await context.newPage();
const requests: SaveCommand[] = [], checks: string[] = [], pageErrors: string[] = [];
const consoleErrors: {text: string; url: string}[] = [], expectedNetworkFailures: string[] = [];
page.on('request', request => {
  if (request.url() === origin + '/api/save' && request.method() === 'POST') requests.push(request.postDataJSON());
});
page.on('pageerror', error => pageErrors.push(error.message));
page.on('console', message => {if (message.type() === 'error') consoleErrors.push({text: message.text(), url: message.location().url});});
page.on('requestfailed', request => expectedNetworkFailures.push(request.url().replace(origin, '') + ': ' + request.failure()?.errorText));
const count = async () => (await store.versions(project.id)).length;
const notice = page.getByTestId('snapshot-feedback');
const closeNotice = async () => {
  const button = page.getByLabel('关闭保存提示');
  if (await button.isVisible()) await button.click();
};
try {
  await page.goto(origin);
  await page.getByPlaceholder('输入项目发起人提供的验证码').fill(process.env.ALVA_ACCESS_CODE);
  await page.getByRole('button', {name: '验证并进入 →', exact: true}).click();
  await expect(page.getByRole('button', {name: '保存版本', exact: true})).toBeEnabled();
  await expect(page.getByTestId('snapshot-dirty')).toContainText('未保存工作稿');
  assert.equal(await count(), 0);
  checks.push('real login; initial draft; no automatic snapshot');

  const beforeSave = await store.get(project.id);
  await page.getByRole('button', {name: '保存版本', exact: true}).click();
  await expect(notice).toContainText('全局快照 v1 已保存');
  assert.equal(await count(), 1);
  const first = await store.snapshot(project.id, 1);
  assert.deepEqual(first.findings, beforeSave.findings);
  assert.deepEqual(first.confirmedBuilding, beforeSave.confirmedBuilding);
  assert.ok(await notice.locator('time').getAttribute('datetime'));
  await page.screenshot({path: dir + '/saved.png', fullPage: true});
  checks.push('manual save exposes committed version/time; decisions and 3D retained');
  await closeNotice();

  await page.getByLabel('房间用途', {exact: true}).fill('保留在失败之后的阅读工作稿');
  await page.getByRole('button', {name: '只确认用途', exact: true}).click();
  await expect(page.getByTestId('snapshot-dirty')).toContainText('未保存工作稿');
  assert.equal(await count(), 1);
  const failedDraft = await store.get(project.id);
  store.failNextSave = true;
  await page.getByRole('button', {name: '保存版本', exact: true}).click();
  await expect(notice).toHaveAttribute('role', 'alert');
  await expect(notice).toContainText('尚未确认保存成功');
  await expect(notice).not.toContainText('全局快照已保存');
  await expect(notice.locator('time')).toHaveCount(0);
  assert.deepEqual(await store.get(project.id), failedDraft);
  assert.equal(await count(), 1);
  const failedId = requests.at(-1)!.requestId;
  await page.screenshot({path: dir + '/save-failed.png', fullPage: true});
  await page.getByRole('button', {name: '重试保存', exact: true}).click();
  await expect(notice).toContainText('全局快照 v2 已保存');
  assert.equal(requests.at(-1)!.requestId, failedId);
  assert.equal(await count(), 2);
  checks.push('real post-INSERT failure: no success, no snapshot, full draft retained; same-ID retry succeeds');
  await closeNotice();

  // Deliver the request to the real application/database, then lose ONLY the
  // response. The success path is not mocked and the snapshot really commits.
  await page.route('**/api/save', async route => {await route.fetch(); await route.abort('failed');}, {times: 1});
  await page.getByRole('button', {name: '保存版本', exact: true}).click();
  await expect(notice).toHaveAttribute('role', 'alert');
  await expect(notice).toContainText('保存结果未确认');
  assert.equal(await count(), 3);
  const lostId = requests.at(-1)!.requestId;
  await store.mutate(project.id, randomUUID(), null, 'edit-after-lost-response', {}, p => {p.name = '响应丢失后仍保留的较新工作稿';});
  await page.reload();
  await expect(page.getByRole('button', {name: '重试保存', exact: true})).toBeEnabled();
  await page.getByRole('button', {name: '重试保存', exact: true}).click();
  await expect(notice).toContainText('全局快照 v3 已保存');
  await expect(notice).toContainText('当前工作稿已有新更改');
  assert.equal(requests.at(-1)!.requestId, lostId);
  assert.equal(await count(), 3);
  assert.equal((await store.get(project.id)).name, '响应丢失后仍保留的较新工作稿');
  await page.screenshot({path: dir + '/lost-response-retry.png', fullPage: true});
  checks.push('committed response lost; reload keeps request ID; retry creates no duplicate or stale rollback');
  await closeNotice();

  const second = await browser.newContext();
  const secondSession = await store.issueInternalSession(project.id);
  await second.addCookies([{name: 'alva_session', value: secondSession.token, url: origin}]);
  const current = await store.get(project.id);
  const updated = await second.request.post(origin + '/api/purpose/confirm', {data: {requestId: randomUUID(),
    expectedRevision: current.revision, confirmed: true, roomId: 'room', purpose: '另一设备确认的用途'}});
  assert.equal(updated.status(), 200); await second.close();
  await page.getByRole('button', {name: '保存版本', exact: true}).click();
  await expect(notice).toHaveAttribute('role', 'alert');
  await expect(notice).toContainText('重新读取');
  await expect(notice.locator('time')).toHaveCount(0);
  assert.equal(await count(), 3);
  await page.screenshot({path: dir + '/version-conflict.png', fullPage: true});
  await page.getByRole('button', {name: '重新读取工作稿', exact: true}).click();
  await expect(notice).toContainText('尚未创建新快照');
  assert.equal(await count(), 3);
  await page.getByRole('button', {name: '保存版本', exact: true}).click();
  await expect(notice).toContainText('全局快照 v4 已保存');
  assert.equal(await count(), 4);
  assert.equal((await store.snapshot(project.id, 4)).scene!.rooms[0].purpose, '另一设备确认的用途');
  checks.push('two real sessions conflict: no overwrite; explicit reread does not save; fresh confirmation succeeds');
  await closeNotice();

  const beforeClicks = requests.length;
  await page.getByRole('button', {name: '保存版本', exact: true}).dblclick();
  await expect(notice).toContainText('全局快照 v5 已保存');
  assert.equal(requests.length, beforeClicks + 1); assert.equal(await count(), 5);
  checks.push('real browser double-click sends one request and produces one snapshot');
  await closeNotice();
  await page.reload();
  await expect(page.getByTestId('snapshot-dirty')).toContainText('已保存 · v5');
  assert.equal(await count(), 5);
  checks.push('refresh reads durable saved state and does not create snapshots');

  const invite = await store.invite(project.id, 'designer');
  const readOnlyContext = await browser.newContext({viewport: {width: 1440, height: 1000}});
  const access = await readOnlyContext.request.post(origin + '/api/access', {data: {code: process.env.ALVA_ACCESS_CODE, inviteToken: invite.token}});
  assert.equal(access.status(), 200);
  const readOnlyPage = await readOnlyContext.newPage();
  await readOnlyPage.goto(origin);
  await expect(readOnlyPage.getByRole('button', {name: '保存版本', exact: true})).toBeDisabled();
  await readOnlyContext.close();
  checks.push('designer entry cannot save');

  assert.deepEqual(pageErrors, []);
  const expectedConsole = consoleErrors.filter(e => /Failed to load resource/.test(e.text) &&
    (e.url === origin + '/api/save' || (e.url === origin + '/api/session' && /401/.test(e.text))));
  const unexpectedConsole = consoleErrors.filter(e => !expectedConsole.includes(e));
  assert.deepEqual(unexpectedConsole, []);
  assert.ok(expectedNetworkFailures.every(e => e.startsWith('/api/save:') && /ERR_FAILED/.test(e)));
  await writeFile(dir + '/result.json', JSON.stringify({ok: true, checks, requests, snapshotCount: await count(),
    pageErrors, unexpectedConsole, expectedConsole, expectedNetworkFailures, source: 'synthetic project; real Chromium + HTTP + PGlite; no model claim'}, null, 2));
  console.log(JSON.stringify({ok: true, dir, checks}, null, 2));
} catch (error) {
  await page.screenshot({path: dir + '/failure.png', fullPage: true}).catch(() => {});
  await writeFile(dir + '/result.json', JSON.stringify({ok: false, checks, error: String(error), pageErrors, consoleErrors, requests}, null, 2));
  console.error(dir); throw error;
} finally {
  await browser.close(); await app.close(); await store.close(); await rm(database, {recursive: true, force: true});
  if (oldCode === undefined) delete process.env.ALVA_ACCESS_CODE; else process.env.ALVA_ACCESS_CODE = oldCode;
}
