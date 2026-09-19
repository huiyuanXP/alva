import {test,expect} from '@playwright/test';import {resolve} from 'node:path';import {login} from './helpers.js';import {evidencePath} from './evidence.js';
test('actual image pixels and public speech upload, editable transcript and explicit image adoption',async({page})=>{
 test.setTimeout(150000);const dir=process.env.RENOVATION_MEDIA_FIXTURES!;expect(dir).toBeTruthy();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await login(page);await page.getByRole('button',{name:/聊聊你的家/}).click();const chat=page.getByRole('region',{name:'客厅咨询聊天',exact:true});await chat.getByRole('button',{name:'添加图片或附件',exact:true}).click();await page.getByRole('menuitem',{name:'语音与参考图片',exact:true}).click();const media=chat.locator('.media-input');
 const jpeg=await page.evaluate(()=>{const c=document.createElement('canvas');c.width=c.height=64;c.getContext('2d')!.fillStyle='#009900';c.getContext('2d')!.fillRect(0,0,64,64);return c.toDataURL('image/jpeg').split(',')[1];});
 // The unified composer now analyzes a selected image automatically. Preserve
 // the real-pixel, no-implicit-adoption and source assertions below.
 await media.getByLabel('上传图片或音频').setInputFiles({name:'synthetic-green.jpg',mimeType:'image/jpeg',buffer:Buffer.from(jpeg,'base64')});await expect(media.getByRole('button',{name:'读取图片偏好候选'})).toBeVisible();await expect(media.getByText(/未采用偏好/).first()).toBeVisible({timeout:60000});await expect(media.getByText(/全图；不代表你喜欢全部内容/).first()).toBeVisible();
 const projectId=new URL(page.url()).searchParams.get('project');
 const analyzed=await (await page.request.get(`/api/projects/${projectId}`)).json();
 const imagePreference=analyzed.suggestions.find((s:any)=>s.field_key==='tone'&&s.room_id==='living'&&s.status==='proposed'&&s.evidence_ids.includes(analyzed.attachments[0].id));
 expect(imagePreference,'actual green pixels must produce an evidence-backed tone candidate').toBeTruthy();
 expect(String(imagePreference.value)).toMatch(/绿/);
 expect(analyzed.requirements.some((r:any)=>r.room_id==='living'&&r.field_key==='tone')).toBe(false);
 const candidate=media.locator('article > div').filter({has:page.getByText(`未采用偏好：${imagePreference.value}`,{exact:true})});
 await candidate.getByRole('button',{name:'采用此图片偏好'}).click();
 // An input's current value is not its parent's textContent. Check the actual
 // form property AND persisted source/value instead of unrelated label text.
 await expect(page.locator('#living-tone')).toHaveValue(String(imagePreference.value));
 const adopted=await (await page.request.get(`/api/projects/${projectId}`)).json();
 const confirmedTone=adopted.requirements.find((r:any)=>r.room_id==='living'&&r.field_key==='tone');
 expect(confirmedTone.value).toBe(imagePreference.value);expect(confirmedTone.source).toBe('accepted');
 expect(confirmedTone.evidence_ids).toContain(analyzed.attachments[0].id);
 await media.getByLabel('上传图片或音频').setInputFiles(resolve(dir,'public-speech.wav'));await media.getByRole('button',{name:'转写音频'}).click();await expect(media.getByLabel('纠正转写')).toBeVisible({timeout:60000});await expect(media.getByLabel('纠正转写')).toHaveValue(/Brooklyn Bridge/i);await media.getByLabel('纠正转写').fill('我想讨论客厅的绿色搭配');await media.getByRole('button',{name:'确认转写并咨询'}).click();await expect(chat.locator('.chat-message.user')).toContainText('我想讨论客厅的绿色搭配');const id=new URL(page.url()).searchParams.get('project');await expect.poll(async()=>{const p=await (await page.request.get(`/api/projects/${id}`)).json();return p.messages.find((m:any)=>m.role==='assistant')?.status;},{timeout:90000}).toBe('complete');const p=await (await page.request.get(`/api/projects/${id}`)).json();expect(p.evidence.some((e:any)=>e.attachment_id&&e.source==='user_corrected_transcript')).toBeTruthy();const original=await page.request.get(`/api/projects/${id}/media/${p.attachments[0].id}?original=1`);expect((await original.body()).equals(Buffer.from(jpeg,'base64'))).toBeTruthy();await page.screenshot({path:evidencePath('09-media-desktop.png')});await page.setViewportSize({width:375,height:812});await media.getByLabel('纠正转写').scrollIntoViewIfNeeded();await page.screenshot({path:evidencePath('09-media-mobile.png')});expect(errors).toEqual([]);
 await page.reload();
 await page.getByRole('button',{name:/聊聊你的家/}).click();
 await chat.getByRole('button',{name:'添加图片或附件',exact:true}).click();await page.getByRole('menuitem',{name:'语音与参考图片',exact:true}).click();
 await expect(media.getByLabel('纠正转写')).toHaveValue('我想讨论客厅的绿色搭配');
 await media.getByLabel('纠正转写').scrollIntoViewIfNeeded();
 await page.screenshot({path:evidencePath('09-corrected-transcript-reloaded.png')});
 expect(errors).toEqual([]);
});
