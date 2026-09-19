import {test,expect,devices} from '@playwright/test';
import {login} from './helpers.js';
import {evidencePath} from './evidence.js';

for(const mobile of [false,true])test(`canvas chat ${mobile?'phone':'desktop'}: popup, expand, outside close and draft`,async({browser,baseURL})=>{
 test.setTimeout(120000);const context=await browser.newContext({baseURL,...(mobile?devices['iPhone 13']:{viewport:{width:1440,height:960}})});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
 try{
  await login(page);const id=new URL(page.url()).searchParams.get('project');await page.goto(`/new-ui?project=${id}`);
  const chat=page.getByRole('region',{name:'客厅咨询聊天',exact:true});await expect(chat).toBeVisible();await expect(page.locator('.paper-chat-stage')).toHaveCount(0);await expect(chat.locator('.inline-questions')).toHaveCount(0);
  await chat.getByLabel('咨询消息',{exact:true}).fill('缩小、展开、关闭后保留草稿');
  const canvas=(await page.locator('.scene iframe').boundingBox())!,popup=(await chat.boundingBox())!;
  expect(Math.abs(popup.x-canvas.x)).toBeLessThan(2);expect(popup.y).toBeGreaterThanOrEqual(canvas.y);expect(popup.y+popup.height).toBeLessThan(canvas.y+canvas.height);
  await page.screenshot({path:evidencePath(`popup-${mobile?'phone':'desktop'}-light.png`)});
  await chat.getByRole('button',{name:'展开聊天',exact:true}).click();const expanded=(await chat.boundingBox())!;
  expect(Math.abs(expanded.width-canvas.width*(mobile?1:.5))).toBeLessThan(2);expect(Math.abs(expanded.height-canvas.height)).toBeLessThan(2);expect(Math.abs(expanded.y-canvas.y)).toBeLessThan(2);
  await page.getByRole('button',{name:'切换为深色',exact:true}).click();await page.screenshot({path:evidencePath(`popup-${mobile?'phone':'desktop'}-expanded-dark.png`),animations:'disabled'});
  await chat.getByRole('button',{name:'缩小聊天',exact:true}).click();await page.locator('.paper-scene-heading h1').click();await expect(chat).toBeHidden();
  await page.getByRole('button',{name:/聊聊你的家/}).click();await expect(chat.getByLabel('咨询消息',{exact:true})).toHaveValue('缩小、展开、关闭后保留草稿');
  expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
 }finally{await context.close();}
});

test('agent questions use official OptionList inside the real assistant message; explicit confirmation yields a folded receipt',async({page})=>{
 test.setTimeout(180000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await login(page);const id=new URL(page.url()).searchParams.get('project')!;
 await page.goto(`/new-ui?project=${id}`);const chat=page.getByRole('region',{name:'客厅咨询聊天',exact:true});await expect(chat).toBeVisible();
 await chat.getByRole('button',{name:'展开聊天',exact:true}).click();await expect(chat.getByRole('button',{name:'选择咨询模型',exact:true})).toBeEnabled();
 await chat.getByLabel('咨询消息',{exact:true}).fill('我在家经常读书，希望以后可以调整房间。请先读取已有资料，再对尚未回答的Q38使用ask_intake_question生成一个有依据的推荐和三个实质不同的替代选项；目前只比较方向，不要替我填写或采用。');
 await chat.getByRole('button',{name:'发送咨询消息',exact:true}).click();
 await expect.poll(async()=>{const p=await(await page.request.get(`/api/projects/${id}`)).json();return p.messages.findLast((m:any)=>m.role==='assistant')?.status;},{timeout:120000}).toBe('complete');
  const tool=chat.locator('.chat-message.assistant .agent-intake').first();await expect(tool).toBeVisible();await tool.scrollIntoViewIfNeeded();
  const questionId=(await tool.locator('[data-question-id]').getAttribute('data-question-id'))!.split(':').at(-1)!;
 await expect(tool).toContainText('我想先和你确认一下');const options=tool.getByRole('option');await expect(options).toHaveCount(5);await expect(tool.locator('[data-slot="option-list"]')).toHaveCount(1);await expect(tool.locator('[aria-selected="true"]')).toHaveCount(0);
 await options.first().focus();await page.keyboard.press('ArrowDown');await page.keyboard.press('Space');await expect(options.nth(1)).toHaveAttribute('aria-selected','true');
  const before=await(await page.request.get(`/api/projects/${id}`)).json();expect(before.intake_answers?.some((a:any)=>a.question_id===questionId&&a.confirmation_state==='confirmed')).toBeFalsy();
  const proposed=before.intake_questions.find((p:any)=>p.question.questionnaire_id===questionId).question;
  if(proposed.options[1].requires_input)await tool.getByLabel('自由填写问卷答案').fill('目前资料还不完整，我会补充实际情况后再进一步确认。');
 await page.screenshot({path:evidencePath('popup-agent-official-options.png')});await tool.getByRole('button',{name:'确认此回答',exact:true}).click();
  await expect.poll(async()=>{const p=await(await page.request.get(`/api/projects/${id}`)).json();return p.intake_answers?.find((a:any)=>a.question_id===questionId)?.confirmation_state;}).toBe('confirmed');
  const receipts=chat.locator('details.answer-receipts');await expect(receipts).toBeVisible();await expect(receipts).not.toHaveAttribute('open','');await receipts.locator('summary').click();await expect(receipts).toHaveAttribute('open','');await expect(receipts).toContainText(proposed.text);
 await page.screenshot({path:evidencePath('popup-recorded-choices.png')});await page.reload();await expect(chat.locator('details.answer-receipts')).toBeVisible();await expect(chat.locator('details.answer-receipts')).not.toHaveAttribute('open','');expect(errors).toEqual([]);
});
