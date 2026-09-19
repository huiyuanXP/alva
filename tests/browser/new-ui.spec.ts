import {test,expect,devices} from '@playwright/test';
import {login,bridge} from './helpers.js';
import {evidencePath} from './evidence.js';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';

async function openPaper(page:import('@playwright/test').Page) {
  await login(page); const id=new URL(page.url()).searchParams.get('project')!;
  await page.goto(`/new-ui?project=${encodeURIComponent(id)}`);
  await expect(page.getByRole('button',{name:'保存项目',exact:true})).toBeEnabled();
  await expect.poll(async()=>{try{return (await bridge(page,'inspect',{})).camera?.ready;}catch{return false;}}).toBe(true);
  return id;
}

test('paper workspace: live scene, model catalogue, keyboard menus, IME, inline confirmation and two themes',async({page})=>{
  test.setTimeout(150000);const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  const id=await openPaper(page),chat=page.getByRole('region',{name:'客厅咨询聊天',exact:true}),input=chat.getByLabel('咨询消息',{exact:true});
  await expect(page.locator('.paper-ui')).toBeVisible();await expect(chat).toBeVisible();
  const before=await (await page.request.get(`/api/projects/${id}`)).json();
  await expect(chat.getByRole('button',{name:'选择咨询模型',exact:true})).toBeEnabled();
  const catalogue=await (await page.request.get('/api/chat/models')).json();expect(catalogue.models.length).toBeGreaterThan(0);
  await expect(chat.getByRole('button',{name:'选择咨询模型',exact:true})).toContainText(catalogue.default_id);
  await page.screenshot({path:evidencePath('paper-desktop-light.png'),fullPage:true});
  const add=chat.getByRole('button',{name:'添加图片或附件',exact:true});await add.focus();await page.keyboard.press('Enter');
  await expect(page.getByRole('menuitem',{name:'文档 / 户型资料',exact:true})).toBeVisible();
  await page.keyboard.press('ArrowDown');await page.screenshot({path:evidencePath('paper-add-menu.png'),fullPage:true});await page.keyboard.press('Escape');await expect(add).toBeFocused();
  await chat.getByRole('button',{name:'选择咨询模型',exact:true}).click();await expect(page.getByRole('menuitemradio').first()).toBeVisible();
  await page.getByRole('menuitemradio').filter({hasText:catalogue.default_id}).first().click();
  await input.fill('输入法确认这几个字，不应发送');
  await input.dispatchEvent('compositionstart');await input.dispatchEvent('keydown',{key:'Enter',code:'Enter',keyCode:229,isComposing:true});await input.dispatchEvent('compositionend');
  expect((await (await page.request.get(`/api/projects/${id}`)).json()).messages.length).toBe(before.messages.length);
  await input.press('Shift+Enter');await expect(input).toHaveValue(/\n/);await input.fill('客厅的草稿保留');
  await page.getByRole('navigation',{name:'空间与设计资料'}).getByRole('button',{name:/房间 2/}).click();
  const other=page.getByRole('region',{name:'房间 2咨询聊天',exact:true});await expect(other.getByLabel('咨询消息',{exact:true})).toHaveValue('');
  await page.getByRole('navigation',{name:'空间与设计资料'}).getByRole('button',{name:/客厅/}).click();await expect(input).toHaveValue('客厅的草稿保留');
  await expect(chat.locator('.inline-questions')).toHaveCount(0);
  await chat.getByRole('button',{name:'完整问卷 · 60题',exact:true}).click();const questionnaire=page.getByRole('dialog',{name:'完整需求问卷',exact:true});
  await questionnaire.getByRole('navigation').getByRole('button',{name:/Q01/}).click();
  const card=questionnaire.locator('.intake-card');await expect(card.locator('input:checked')).toHaveCount(0);
  const qid=(await card.getAttribute('data-question-id'))!.split(':').at(-1);
  await card.getByLabel('自由填写问卷答案').fill('先梳理一家人的日常习惯，再和设计师讨论空间安排。');
  await page.screenshot({path:evidencePath('paper-question-draft.png'),fullPage:true});
  await card.getByRole('button',{name:'确认此回答',exact:true}).click();
  await expect.poll(async()=>{const p=await (await page.request.get(`/api/projects/${id}`)).json();return p.intake_answers?.find((a:any)=>a.question_id===qid)?.answer_text;}).toBe('先梳理一家人的日常习惯，再和设计师讨论空间安排。');
  const after=await (await page.request.get(`/api/projects/${id}`)).json();expect(after.scene).toEqual(before.scene);
  await questionnaire.getByRole('button',{name:'关闭完整问卷',exact:true}).click();
  await expect(chat.getByLabel('已确认的问卷回答')).toContainText('先梳理一家人的日常习惯');
  await page.getByRole('button',{name:'切换为深色',exact:true}).click();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');
  await page.screenshot({path:evidencePath('paper-desktop-dark.png'),fullPage:true});
  await expect(input).toHaveValue('客厅的草稿保留');
  const geometry=await chat.locator('.chat-composer').evaluate(el=>({radius:getComputedStyle(el).borderRadius,bottom:el.getBoundingClientRect().bottom,width:el.getBoundingClientRect().width}));expect(geometry.radius).toBe('16px');expect(geometry.bottom).toBeLessThanOrEqual(960);
  expect(errors).toEqual([]);
});

test('paper phone emulation: touch composer, files, model controls, scene tabs and reload deep link',async({browser,baseURL})=>{
  test.setTimeout(150000);const context=await browser.newContext({...devices['iPhone 13'],baseURL,colorScheme:'light'});const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    const id=await openPaper(page),chat=page.getByRole('region',{name:'客厅咨询聊天',exact:true}),input=chat.getByLabel('咨询消息',{exact:true});
    await input.fill('手机上输入的草稿');await input.press('Enter');await expect(input).toHaveValue(/\n/);
    expect((await (await page.request.get(`/api/projects/${id}`)).json()).messages).toHaveLength(0);
    await chat.getByLabel('上传文档附件').setInputFiles({name:'日常习惯.txt',mimeType:'text/plain',buffer:Buffer.from('希望保留家中的书，傍晚有安静的阅读位置。')});
    await expect(chat.locator('.composer-file[data-state=ready]')).toHaveCount(1);
    await expect(chat.getByRole('button',{name:'选择咨询模型',exact:true})).toBeEnabled();
    for(const name of ['添加图片或附件','选择咨询模型','开始录音','发送咨询消息']){const r=await chat.getByRole('button',{name,exact:true}).boundingBox();expect(r!.x).toBeGreaterThanOrEqual(0);expect(r!.x+r!.width).toBeLessThanOrEqual(390);expect(r!.y+r!.height).toBeLessThanOrEqual(844);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:evidencePath('paper-phone-light.png'),fullPage:true});
    await page.getByRole('navigation',{name:'工作区视图'}).getByRole('button',{name:'空间预览',exact:true}).click();await expect(chat).toBeHidden();await expect(page.getByRole('heading',{level:1})).toBeVisible();
    await page.screenshot({path:evidencePath('paper-phone-scene.png'),fullPage:true});
    await page.getByRole('navigation',{name:'工作区视图'}).getByRole('button',{name:'咨询对话',exact:true}).click();await expect(input).toHaveValue(/手机上输入的草稿/);await expect(chat.locator('.composer-file')).toHaveCount(1);
    await page.getByRole('button',{name:'切换为深色',exact:true}).click();await page.screenshot({path:evidencePath('paper-phone-dark.png'),fullPage:true});
    await page.reload();await expect(chat).toBeVisible();await expect(page.locator('html')).toHaveAttribute('data-theme','dark');expect(new URL(page.url()).pathname).toBe('/new-ui');
    expect(errors).toEqual([]);
  }finally{await context.close();}
});

test('paper live provider: selected model is sent, persisted, streamed and cancellable',async({page})=>{
  test.setTimeout(150000);const id=await openPaper(page),chat=page.getByRole('region',{name:'客厅咨询聊天',exact:true});
  const catalogue=await (await page.request.get('/api/chat/models')).json();
  const before=await (await page.request.get(`/api/projects/${id}`)).json();
  const rejected=await page.request.post(`/api/projects/${id}/chat`,{data:{request_id:crypto.randomUUID(),expected_version:before.version,room_id:'living',text:'不应创建消息',model_id:'unlisted-model-for-negative-test'}});
  expect(rejected.status()).toBe(400);expect((await (await page.request.get(`/api/projects/${id}`)).json()).messages).toHaveLength(0);
  await expect(chat.getByRole('button',{name:'选择咨询模型',exact:true})).toBeEnabled();
  await chat.getByLabel('咨询消息',{exact:true}).fill('我喜欢在客厅阅读。请简短确认收到，先这样，不要再问。');
  const request=page.waitForRequest(r=>r.url().endsWith(`/api/projects/${id}/chat`)&&r.method()==='POST');
  await chat.getByRole('button',{name:'发送咨询消息',exact:true}).click();expect((await request).postDataJSON().model_id).toBe(catalogue.default_id);
  await expect(chat.getByRole('button',{name:'停止本轮',exact:true})).toBeVisible();
  await expect(chat.getByRole('button',{name:'选择咨询模型',exact:true})).toBeDisabled();
  await expect.poll(async()=>{const p=await (await page.request.get(`/api/projects/${id}`)).json();return p.messages.findLast((m:any)=>m.role==='assistant')?.status;},{timeout:100000}).toBe('complete');
  let p=await (await page.request.get(`/api/projects/${id}`)).json();expect(p.messages.every((m:any)=>m.model_id===catalogue.default_id)).toBe(true);expect(p.messages.at(-1).content.length).toBeGreaterThan(0);
  await expect(chat.locator('.question-fold[open]')).toHaveCount(0);
  const userColor=await chat.locator('.chat-message.user').last().evaluate(el=>getComputedStyle(el).backgroundColor);
  const assistantColor=await chat.locator('.chat-message.assistant').last().evaluate(el=>getComputedStyle(el).backgroundColor);
  expect(userColor).not.toBe(assistantColor);
  await chat.locator('.chat-message.assistant').last().scrollIntoViewIfNeeded();
  await page.screenshot({path:evidencePath('paper-live-response.png'),fullPage:true});
  await chat.getByLabel('咨询消息',{exact:true}).fill('请详细说说如何记录阅读习惯，先不要生成问题。');await chat.getByRole('button',{name:'发送咨询消息',exact:true}).click();await chat.getByRole('button',{name:'停止本轮',exact:true}).click();
  await expect.poll(async()=>{const p=await (await page.request.get(`/api/projects/${id}`)).json();return p.messages.findLast((m:any)=>m.role==='assistant')?.status;},{timeout:30000}).toBe('cancelled');
  p=await (await page.request.get(`/api/projects/${id}`)).json();expect(p.messages.at(-2).content).toContain('请详细说说');
});

test('paper request failure keeps both the sent text and a newer draft, with attachment references',async({page})=>{
  test.setTimeout(90000);const id=await openPaper(page),chat=page.getByRole('region',{name:'客厅咨询聊天',exact:true}),input=chat.getByLabel('咨询消息',{exact:true});
  await chat.getByLabel('上传文档附件').setInputFiles({name:'保留清单.txt',mimeType:'text/plain',buffer:Buffer.from('保留旧书架。')});await expect(chat.locator('.composer-file[data-state=ready]')).toHaveCount(1);
  let release:()=>void=()=>{};const gate=new Promise<void>(resolve=>{release=resolve;});
  // Explicit transport-failure fixture. The server project must remain unchanged.
  await page.route(`**/api/projects/${id}/chat`,async route=>{await gate;await route.fulfill({status:503,contentType:'application/json',body:JSON.stringify({error:'测试网络暂不可用'})});});
  await input.fill('先发送的内容');const request=page.waitForRequest(r=>r.url().endsWith(`/api/projects/${id}/chat`));await chat.getByRole('button',{name:'发送咨询消息',exact:true}).click();await request;
  await input.fill('等待时又补充的草稿');release();await expect(page.getByRole('alert')).toContainText('测试网络暂不可用');await expect(input).toHaveValue('先发送的内容\n\n等待时又补充的草稿');await expect(chat.locator('.composer-file')).toHaveCount(1);
  const p=await (await page.request.get(`/api/projects/${id}`)).json();expect(p.messages).toHaveLength(0);expect(p.attachments).toHaveLength(1);
  await page.screenshot({path:evidencePath('paper-network-recovery.png'),fullPage:true});
});

test('paper dictation: real speech through MediaRecorder and provider ASR appends editable text, never auto-sends',async({page})=>{
  test.setTimeout(120000);const dir=process.env.RENOVATION_MEDIA_FIXTURES;expect(dir).toBeTruthy();const speech=readFileSync(resolve(dir!,'public-speech.wav')).toString('base64');
  await page.addInitScript(({speech})=>{
    // Only the physical microphone is substituted with the existing public speech fixture.
    navigator.mediaDevices.getUserMedia=async()=>{
      const audio=new AudioContext();await audio.resume();const destination=audio.createMediaStreamDestination(),source=audio.createBufferSource();
      const bytes=Uint8Array.from(atob(speech),c=>c.charCodeAt(0));source.buffer=await audio.decodeAudioData(bytes.buffer);source.connect(destination);source.onended=()=>{(window as any).speechFinished=true;};setTimeout(()=>source.start(),150);return destination.stream;
    };
  },{speech});
  const id=await openPaper(page),chat=page.getByRole('region',{name:'客厅咨询聊天',exact:true}),input=chat.getByLabel('咨询消息',{exact:true});
  await input.fill('这里是我先写的内容。');await chat.getByRole('button',{name:'开始录音',exact:true}).click();await expect(chat.getByRole('button',{name:'停止录音',exact:true})).toBeEnabled();
  await expect.poll(()=>page.evaluate(()=>(window as any).speechFinished),{timeout:15000}).toBe(true);await chat.getByRole('button',{name:'停止录音',exact:true}).click();
  await expect(input).toHaveValue(/Brooklyn Bridge/i,{timeout:60000});await expect(input).toHaveValue(/^这里是我先写的内容。\n/);
  await expect(chat.locator('.composer-file[data-state=ready]')).toHaveCount(1);const p=await (await page.request.get(`/api/projects/${id}`)).json();expect(p.messages).toHaveLength(0);expect(p.attachments).toHaveLength(1);expect(p.attachments[0].mime).toBe('audio/wav');
  await input.fill('我手动修正了这段转写，现在还不发送。');expect((await (await page.request.get(`/api/projects/${id}`)).json()).messages).toHaveLength(0);
  await page.screenshot({path:evidencePath('paper-dictation-editable.png'),fullPage:true});
});
