import { build } from 'vite';
import { chromium } from '@playwright/test';
import { mkdir, writeFile, readFile } from 'node:fs/promises';
import { createServer } from 'node:http';
import { resolve, extname } from 'node:path';
import assert from 'node:assert/strict';

// Isolated component fixture: no production API, access code or project data; dedicated browser port 4175.
const root=resolve('.runtime/intake-ui');
await mkdir(root,{recursive:true});await mkdir('docs/evidence/intake-v1',{recursive:true});
await writeFile(resolve(root,'index.html'),'<html lang="zh"><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1"><title>Intake component fixture</title><div id="root"></div><script type="module" src="/fixture.tsx"></script></html>');
await writeFile(resolve(root,'fixture.tsx'),`import React,{useState} from 'react';
import {createRoot} from 'react-dom/client';
import {QuestionCard} from '../../apps/web/src/QuestionCard.tsx';
import {withQuestionOptions} from '../../apps/api/question-options.ts';
import {sampleProject} from '../../apps/api/sample.ts';
const original=sampleProject('isolated-intake-fixture');
const question=withQuestionOptions(original,{id:'living:functions',field_key:'functions',room_id:'living',group:'test',text:'这个房间希望兼顾哪些功能？'});
window.intakeCalls=[];
function Fixture(){const [version,setVersion]=useState(0),[result,setResult]=useState(''),[current,setCurrent]=useState(undefined);
return <main style={{maxWidth:440,margin:'16px auto',padding:12,fontFamily:'sans-serif'}}><h2>ROOMNOTE · 提问组件测试</h2><p>虚构测试资料，不连接真实项目。</p><button onClick={()=>{setVersion(v=>v+1);setCurrent({value:'另一位用户刚更新的值',answer_state:'answered'});}}>模拟其他窗口更新</button><div data-testid="result">{result}</div>
<QuestionCard question={question} projectVersion={version} current={current} keyboard={locked=>document.body.dataset.locked=String(locked)} onDirty={()=>{}} onError={setResult} onAnswered={()=>setResult('saved')}
commit={async(path,body)=>{window.intakeCalls.push({path,body});if(body.expected_version!==version)throw new Error('version conflict');setVersion(v=>v+1);return {...original,version:version+1};}}/></main>}
createRoot(document.getElementById('root')).render(<Fixture/>);`);
await build({root,configFile:false,logLevel:'warn',build:{outDir:resolve(root,'dist'),emptyOutDir:true}});
const dist=resolve(root,'dist'),types={'.html':'text/html; charset=utf-8','.js':'text/javascript','.css':'text/css'};
const server=createServer(async(req,res)=>{try{const url=new URL(req.url,'http://127.0.0.1'),file=resolve(dist,'.'+(url.pathname==='/'?'/index.html':url.pathname));if(!file.startsWith(dist+'/')){res.writeHead(403);res.end();return;}const bytes=await readFile(file);res.writeHead(200,{'Content-Type':types[extname(file)]||'application/octet-stream'});res.end(bytes);}catch{res.writeHead(404);res.end();}});
await new Promise(r=>server.listen(4175,'127.0.0.1',r));const origin='http://127.0.0.1:'+server.address().port;
let browser;const results=[];
try {
 browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});const page=await browser.newPage({viewport:{width:980,height:1100}});
 const load=async()=>{await page.goto(origin);await page.locator('.ask-card').waitFor();};
 const calls=()=>page.evaluate(()=>window.intakeCalls);
 await load();assert.equal(await page.locator('input[type=radio]').count(),5);assert.equal(await page.locator('input:checked').count(),0);assert.equal(await page.getByRole('button',{name:'确认此回答',exact:true}).isDisabled(),true);assert.equal((await calls()).length,0);
 await page.locator('input[value=B]').check();assert.equal((await calls()).length,0);await page.getByRole('button',{name:'确认此回答',exact:true}).click();await page.getByTestId('result').filter({hasText:'saved'}).waitFor();assert.equal((await calls())[0].body.value,'阅读或居家办公优先');results.push('PASS: five choices, no preselection, selection alone does not save, explicit B saves one field');
 await load();await page.getByRole('textbox',{name:'自由填写答案'}).fill('我要音乐室，而不是任何预设方案');await page.getByRole('button',{name:'确认此回答',exact:true}).click();await page.getByTestId('result').filter({hasText:'saved'}).waitFor();assert.equal((await calls())[0].body.value,'我要音乐室，而不是任何预设方案');results.push('PASS: free text uses E and is persisted unchanged');
 await load();const input=page.getByRole('textbox',{name:'自由填写答案'});await input.fill('保留我的草稿');await page.getByRole('button',{name:'模拟其他窗口更新'}).click();assert.equal(await input.inputValue(),'保留我的草稿');assert.equal(await page.getByRole('button',{name:'确认此回答',exact:true}).isDisabled(),true);assert.equal((await calls()).length,0);await page.getByRole('button',{name:'我已核对最新值，保留草稿再确认'}).click();await page.getByRole('button',{name:'确认此回答',exact:true}).click();await page.getByTestId('result').filter({hasText:'saved'}).waitFor();assert.equal((await calls())[0].body.expected_version,1);results.push('PASS: stale version blocks saving and keeps draft until explicit re-review');
 await load();await page.getByRole('button',{name:'暂不确定',exact:true}).click();await page.getByTestId('result').filter({hasText:'saved'}).waitFor();assert.equal((await calls())[0].body.answer_state,'unknown');assert.equal((await calls())[0].body.value,null);results.push('PASS: unknown remains null, not a guessed answer');
 await load();await page.screenshot({path:'docs/evidence/intake-v1/question-card-desktop.png',fullPage:true});
 await page.setViewportSize({width:375,height:812});await load();assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1));await page.getByRole('textbox',{name:'自由填写答案'}).focus();assert.equal(await page.locator('body').getAttribute('data-locked'),'true');await page.screenshot({path:'docs/evidence/intake-v1/question-card-mobile.png',fullPage:true});results.push('PASS: 375px layout has no horizontal overflow; text focus locks scene keyboard');
 console.log(results.join('\n'));await writeFile('docs/evidence/intake-v1/component-tests.log',results.join('\n')+'\n');
} finally {if(browser)await browser.close();await new Promise(r=>server.close(r));}
