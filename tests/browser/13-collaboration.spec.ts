import { test, expect } from '@playwright/test';
import { login } from './helpers.js';

test('designer project invite opens scoped read-only board with source trace', async ({ page }) => {
  await login(page);
  const projectId = new URL(page.url()).searchParams.get('project')!;
  let project = await (await page.request.get(`/api/projects/${projectId}`)).json();
  let response = await page.request.post(`/api/projects/${projectId}/intake/answer`, { data: { request_id: crypto.randomUUID(), expected_version: project.version, room_id: 'living', question_id: 'Q13', choice: 'E', text: '温暖、安静，保留阅读角' } });
  expect(response.status()).toBe(200); project = await response.json();
  response = await page.request.post(`/api/projects/${projectId}/intake/answer`, { data: { request_id: crypto.randomUUID(), expected_version: project.version, room_id: 'living', question_id: 'Q06', choice: 'E', text: '仅共享必要需求', sharing: { mode: 'selected', question_ids: ['Q13'], attachment_ids: [] } } });
  expect(response.status()).toBe(200);
  const invite = await page.request.post(`/api/projects/${projectId}/collaboration/invite`, { data: {} }); expect(invite.status()).toBe(200); const code = (await invite.json()).code;
  await page.request.post('/api/session/logout');
  const designerLogin = await page.request.post('/api/session/login', { data: { code } }); expect(designerLogin.status()).toBe(200); expect((await designerLogin.json()).role).toBe('designer');
  await page.goto(`/?project=${projectId}`);
  await expect(page.getByText('设计师只读入口', { exact: true })).toBeVisible();
  await expect(page.getByRole('button', { name: '保存项目', exact: true })).not.toBeVisible();
  await page.getByRole('button', { name: '设计师看板', exact: true }).click();
  const board = page.getByRole('dialog', { name: '设计师看板' }); await expect(board).toBeVisible();
  await expect(board.getByRole('button', { name: /温暖、安静，保留阅读角/ })).toBeVisible();
  await board.getByText(/查看原话与来源/).click();
  await expect(board.getByRole('blockquote')).toContainText('温暖、安静，保留阅读角');
  await page.setViewportSize({ width: 375, height: 812 });
  await expect(board).toBeVisible(); await expect(board.getByRole('button', { name: '提交设计建议', exact: true })).toBeVisible();
  await page.screenshot({ path: test.info().outputPath('designer-board-mobile.png') });
});
