import {test,expect,devices} from '@playwright/test';
import {login} from './helpers.js';
import {evidencePath} from './evidence.js';

for(const mobile of [false,true]) test(`UI polish ${mobile?'phone':'desktop'}: resize, dismiss, layers and scene controls`,async({browser,baseURL})=>{
  test.setTimeout(90000);
  const context=await browser.newContext({...(mobile?devices['iPhone 13']:{viewport:{width:1440,height:960}}),baseURL});
  const page=await context.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try {
    await login(page);const id=new URL(page.url()).searchParams.get('project');await page.goto(`/new-ui?project=${id}`);
    const chat=page.getByRole('region',{name:'客厅咨询聊天',exact:true});await expect(chat).toBeVisible();
    await chat.getByLabel('咨询消息',{exact:true}).fill('关闭和调整宽度后保留这段草稿');
    if(!mobile){
      await chat.getByRole('button',{name:'展开聊天',exact:true}).click();
      expect(Math.abs((await chat.boundingBox())!.width-(await page.locator('.scene iframe').boundingBox())!.width/2)).toBeLessThan(2);
      await chat.getByRole('button',{name:'缩小聊天',exact:true}).click();
    }
    await chat.getByRole('button',{name:'完整问卷 · 60题',exact:true}).click();const dialog=page.getByRole('dialog',{name:'完整需求问卷',exact:true});
    await dialog.getByRole('navigation').getByRole('button',{name:/Q38/}).click();
    await dialog.getByLabel('自由填写问卷答案').fill('外部关闭专项检查');await expect(dialog).toBeVisible();
    page.once('dialog',d=>d.dismiss());await page.locator('.intake-backdrop').click({position:{x:2,y:2}});await expect(dialog).toBeVisible();
    page.once('dialog',d=>d.accept());await page.locator('.intake-backdrop').click({position:{x:2,y:2}});await expect(dialog).toBeHidden();await expect(chat).toBeVisible();
    const nav=page.getByRole('navigation',{name:mobile?'工作区视图':'空间与设计资料'});
    await nav.getByRole('button',{name:'需求记录',exact:true}).click();const panel=page.getByRole('complementary',{name:'需求收集面板'});await expect(panel).toBeVisible();
    if(!mobile){const before=(await panel.boundingBox())!.width;const handle=panel.getByRole('separator');const box=(await handle.boundingBox())!;
      await page.mouse.move(box.x+8,box.y+box.height/2);await page.mouse.down();await page.mouse.move(box.x-72,box.y+box.height/2,{steps:5});await page.mouse.up();expect((await panel.boundingBox())!.width).toBeGreaterThan(before+60);}
    await page.screenshot({path:evidencePath(`polish-${mobile?'phone':'desktop'}-requirements.png`)});
    await page.locator('.topbar').click({position:{x:2,y:2}});await expect(panel).toBeHidden();
    await expect(chat.getByLabel('咨询消息',{exact:true})).toHaveValue('关闭和调整宽度后保留这段草稿');
    await page.screenshot({path:evidencePath(`polish-${mobile?'phone':'desktop'}-chat-light.png`)});
    await page.getByRole('button',{name:'切换为深色',exact:true}).click();await page.screenshot({path:evidencePath(`polish-${mobile?'phone':'desktop'}-chat-dark.png`)});
    if(mobile)await nav.getByRole('button',{name:'空间预览',exact:true}).click();else await page.locator('.paper-scene-heading h1').click();
    await expect(chat).toBeHidden();
    await page.getByRole('button',{name:'几何问题与历史（0）',exact:true}).click();await expect(page.getByRole('dialog',{name:'几何问题详情'})).toBeVisible();
    await page.locator('.topbar').click({position:{x:2,y:2}});await expect(page.getByRole('dialog',{name:'几何问题详情'})).toBeHidden();
    await page.getByRole('button',{name:'选择示例沙发',exact:true}).click();const furniture=page.getByRole('dialog',{name:'家具属性',exact:true});await expect(furniture).toBeVisible();
    await page.mouse.click(2,2);await expect(furniture).toBeHidden();await expect(page.locator('.selection')).toBeVisible();
    const selectors=['.selection','.starter-actions','.geometry-index','.scene-footer','.scene-controls'];
    const boxes=await Promise.all(selectors.map(s=>page.locator(s).boundingBox()));
    for(let i=0;i<boxes.length;i++)for(let j=i+1;j<boxes.length;j++){const a=boxes[i]!,b=boxes[j]!;expect(Math.min(a.x+a.width,b.x+b.width)>Math.max(a.x,b.x)&&Math.min(a.y+a.height,b.y+b.height)>Math.max(a.y,b.y)).toBe(false);}
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);
    await page.screenshot({path:evidencePath(`polish-${mobile?'phone':'desktop'}-scene.png`)});expect(errors).toEqual([]);
  } finally {await context.close();}
});
