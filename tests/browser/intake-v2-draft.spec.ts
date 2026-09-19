import {test,expect} from '@playwright/test';
import {login} from './helpers.js';
import {evidencePath} from './evidence.js';

test('v2 questionnaire protects unsaved navigation drafts and requires explicit conflict review before replacement',async({page})=>{
 test.setTimeout(90000);await login(page);const id=new URL(page.url()).searchParams.get('project');
 await page.getByRole('button',{name:/聊聊你的家/}).click();const chat=page.getByRole('region',{name:'客厅咨询聊天',exact:true});await chat.getByRole('button',{name:'完整问卷 · 60题'}).click();
 const form=page.getByRole('dialog',{name:'完整需求问卷'});await form.getByRole('navigation').getByRole('button',{name:/Q38/}).click();
 const draft='先保留现有家具，未来方便重新安排';await form.getByLabel('自由填写问卷答案').fill(draft);
 page.once('dialog',dialog=>dialog.dismiss());await form.getByRole('navigation').getByRole('button',{name:/Q31/}).click();await expect(form.getByLabel('自由填写问卷答案')).toHaveValue(draft);await expect(form.locator('[data-question-id="living:Q38"]')).toBeVisible();
 const before=await (await page.request.get(`/api/projects/${id}`)).json();const external=await page.request.post(`/api/projects/${id}/intake/answer`,{data:{expected_version:before.version,request_id:crypto.randomUUID(),question_id:'Q38',room_id:'living',choice:'E',text:'另一个窗口保存的新答案'}});expect(external.status()).toBe(200);
 const review=form.getByRole('button',{name:'我已核对最新资料，保留草稿再确认'});await expect(review).toBeVisible();await expect(form.getByRole('button',{name:'确认此回答',exact:true})).toBeDisabled();await expect(form.getByLabel('自由填写问卷答案')).toHaveValue(draft);await expect(form.getByText(/最新回答：另一个窗口保存的新答案/)).toBeVisible();
 await page.screenshot({path:evidencePath('17-questionnaire-conflict.png')});
 const unchanged=await (await page.request.get(`/api/projects/${id}`)).json();expect(unchanged.intake_answers.find((a:any)=>a.question_id==='Q38').answer_text).toBe('另一个窗口保存的新答案');
 await review.click();await form.getByRole('button',{name:'确认此回答',exact:true}).click();await expect.poll(async()=>{const saved=await (await page.request.get(`/api/projects/${id}`)).json();return saved.intake_answers.find((a:any)=>a.question_id==='Q38')?.answer_text;}).toBe(draft);
 const saved=await (await page.request.get(`/api/projects/${id}`)).json();expect(saved.scene).toEqual(before.scene);expect(saved.intake_answers).toHaveLength(1);await form.getByRole('button',{name:'关闭完整问卷'}).click();await expect(form).toHaveCount(0);
});
