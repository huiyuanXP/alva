import {test,expect,devices} from '@playwright/test';
import {login} from './helpers.js';
import {evidencePath} from './evidence.js';

for(const mobile of [false,true])test(`paper ${mobile?'phone':'desktop'} sheets: readable questionnaire and delivery in light and dark`,async({browser,baseURL})=>{
  test.setTimeout(120000);
  const context=await browser.newContext({...(mobile?devices['iPhone 13']:{viewport:{width:1440,height:960}}),baseURL,colorScheme:'light'}),page=await context.newPage();
  const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
  try{
    await login(page);const id=new URL(page.url()).searchParams.get('project');await page.goto(`/new-ui?project=${id}`);const chat=page.getByRole('region',{name:'客厅咨询聊天',exact:true});await expect(chat).toBeVisible();
    for(const theme of ['light','dark']){
      if(theme==='dark')await page.getByRole('button',{name:'切换为深色',exact:true}).click();
      await chat.getByRole('button',{name:'完整问卷 · 60题',exact:true}).click();const q=page.getByRole('dialog',{name:'完整需求问卷',exact:true});
      await expect(q.getByRole('navigation').getByRole('button')).toHaveCount(60);await q.getByRole('navigation').getByRole('button',{name:/Q38/}).click();
      await expect(q.getByLabel('自由填写问卷答案')).toBeVisible();
      await q.getByLabel('自由填写问卷答案').focus();
      expect(await q.getByLabel('自由填写问卷答案').evaluate(el=>getComputedStyle(el).outlineColor)).toBe(await q.evaluate(el=>getComputedStyle(el).color));
      const styles=await q.evaluate(el=>({background:getComputedStyle(el).backgroundColor,radius:getComputedStyle(el).borderRadius,token:getComputedStyle(document.documentElement).getPropertyValue('--card')}));expect(styles.radius).toBe('12px');expect(styles.background).toContain('oklch');
      await page.screenshot({path:evidencePath(`paper-${mobile?'phone':'desktop'}-questionnaire-${theme}.png`),fullPage:true});await page.keyboard.press('Escape');await expect(q).toBeHidden();
      await chat.getByRole('button',{name:'交付清单',exact:true}).click();const d=page.getByRole('dialog',{name:'问卷交付清单',exact:true});await expect(d.getByText(/初访内容不等于施工批准/)).toBeVisible();
      await page.screenshot({path:evidencePath(`paper-${mobile?'phone':'desktop'}-delivery-${theme}.png`),fullPage:true});await d.getByRole('button',{name:'关闭交付清单',exact:true}).click();
    }
    expect(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth)).toBe(true);expect(errors).toEqual([]);
  }finally{await context.close();}
});
