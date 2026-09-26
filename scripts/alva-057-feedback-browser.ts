import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
const dir='evidence/'+new Date().toISOString().replace(/[:.]/g,'')+'-ALVA057-feedback';await mkdir(dir,{recursive:true});
process.env.ALVA_ACCESS_CODE='alva057-feedback-synthetic-code';
const store=new AlvaStore();await store.init();const {project}=await store.create('Feedback acceptance');await store.ensureAccessCode(project.id);
const app=await buildAlva(store,{origin:'http://127.0.0.1:4287'});await app.listen({host:'127.0.0.1',port:4287});
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});const context=await browser.newContext({viewport:{width:1440,height:900}});const token=(await store.issueInternalSession(project.id)).token;await context.addCookies([{name:'alva_session',value:token,domain:'127.0.0.1',path:'/'}]);const page=await context.newPage(),errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));
try{
 await page.goto('http://127.0.0.1:4287');const entry=page.getByRole('button',{name:'Your Home Vision'});await expect(entry).toBeVisible();
 const heading=page.locator('.chat>.panel-heading');const rect=await entry.boundingBox(),h=await heading.boundingBox(),bg=await entry.evaluate(e=>getComputedStyle(e).backgroundColor);if(!rect||!h||rect.width>210||rect.height>50||rect.x<h.x+h.width/2||bg==='rgb(0, 113, 227)')throw new Error('Entry is not a compact sage button in the heading');
 await page.screenshot({path:dir+'/entry.png'});await entry.click();const dialog=page.getByRole('dialog');await expect(dialog.getByRole('heading').first()).toHaveText('What brings you here?');
 await dialog.getByRole('radio',{name:/Moving into a new home/}).click();await dialog.getByRole('button',{name:'Continue',exact:true}).click();await expect(dialog.getByRole('heading').first()).toHaveText('What kind of home is it?');await expect(dialog.locator('.hv-stage')).toContainText('2 of 4');
 await expect(dialog.getByRole('button',{name:'Skip',exact:true})).toHaveCount(0);await expect(dialog.getByRole('button',{name:'Skip for now'})).toBeVisible();
 const home=dialog.getByRole('radio',{name:'Single-family house',exact:true});await expect(home.locator('.hv-icon svg')).toBeVisible();await expect(dialog.locator('.hv-icon svg.lucide-grid-2-x-2')).toHaveCount(0);
 await dialog.getByText('Something else? Add your own answer').click();const other=dialog.getByPlaceholder('Type your answer here');await expect(other).toBeVisible();await other.fill('Loft over workshop');await expect(dialog.getByRole('button',{name:'Continue',exact:true})).toBeEnabled();await page.screenshot({path:dir+'/home-type.png'});
 await dialog.getByRole('button',{name:'Skip for now'}).click();await expect(dialog.getByRole('heading').first()).not.toHaveText('What kind of home is it?');await expect(dialog.getByRole('button',{name:'Skip',exact:true})).toHaveCount(0);
 await dialog.getByRole('button',{name:'Save and close questionnaire'}).click();await expect(dialog).toBeHidden();
 if(errors.length)throw new Error(errors.join('; '));await writeFile(dir+'/result.json',JSON.stringify({ok:true,checks:['compact sage entry','Q02 removed and progress updated','home type icons without square fallback','inline Skip removed, footer advances','clear custom input and save/close','zero page errors']},null,2));console.log(dir+' passed');
}catch(e){await page.screenshot({path:dir+'/failure.png'});await writeFile(dir+'/result.json',JSON.stringify({ok:false,error:String(e),pageErrors:errors},null,2));throw e}finally{await browser.close();await app.close();await store.close()}
