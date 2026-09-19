import {chromium} from '@playwright/test';
import {readFileSync,mkdirSync,writeFileSync} from 'node:fs';
import {randomUUID} from 'node:crypto';
const run=`evidence/${new Date().toISOString().replace(/[-:.]/g,'')}-${randomUUID().slice(0,8)}`;
mkdirSync(run,{recursive:true});
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
const page=await browser.newPage({viewport:{width:1440,height:900}});
const errors=[];page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()==='error')errors.push(m.text())});
const results=[];
const check=(name,ok,detail)=>results.push({name,ok,detail});
try {
 await page.setContent(readFileSync('references/room-study-handoff/room-study-standalone.html','utf8'),{waitUntil:'load'});
 await page.waitForFunction(()=>!!window.roomStudy);
 check('WebGL2 context',await page.evaluate(()=>!!document.querySelector('#scene').getContext('webgl2')));
 const counts=await page.evaluate(()=>({objects:roomStudy.model.objects.length,rooms:roomStudy.model.rooms.length,colliders:roomStudy.model.colliders.length}));
 check('Scene objects exist',counts.objects>25,counts);
 check('Six room viewpoints',counts.rooms===6);
 const before=await page.evaluate(()=>roomStudy.sunCalc().dir);
 await page.locator('#time').fill('7.5');await page.locator('#time').dispatchEvent('input');
 const after=await page.evaluate(()=>roomStudy.sunCalc().dir);
 check('Time changes sun direction',before.reduce((s,v,i)=>s+(v-after[i])**2,0)>.05,{before,after});
 check('Bed collision active',await page.evaluate(()=>!roomStudy.canStand(1.9,2.25)));
 await page.evaluate(()=>roomStudy.gotoRoom('living'));
 check('Walk mode',await page.evaluate(()=>roomStudy.state.mode==='walk'));
 await page.screenshot({path:`${run}/reference.png`});
 check('No JavaScript or console errors',errors.length===0,errors);
} catch(e){check('Browser run',false,e.message)} finally {await browser.close()}
writeFileSync(`${run}/reference.json`,JSON.stringify({scope:'Supplied static reference, not alva product acceptance',results},null,2));
console.log(JSON.stringify({run,results}));process.exitCode=results.every(r=>r.ok)?0:1;
