import {createServer} from 'node:http';
import {readFile,mkdir,writeFile} from 'node:fs/promises';
import {resolve,extname} from 'node:path';
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {assets} from '../api/model.js';
import {catalogueFurniture} from '../web/src/scene/furniture/catalogue.js';
const out=resolve('evidence',new Date().toISOString().replace(/[:.]/g,'')+'-ALVA082-fixtures');await mkdir(out,{recursive:true});
const server=createServer(async(req,res)=>{try{const path=req.url?.startsWith('/assets/')?resolve('web/dist','.'+req.url):resolve('web/dist/index.html');const body=await readFile(path);res.setHeader('Content-Type',extname(path)==='.js'?'application/javascript':extname(path)==='.css'?'text/css':'text/html');res.end(body)}catch{res.writeHead(404);res.end()}});await new Promise<void>(done=>server.listen(0,'127.0.0.1',done));const port=(server.address() as {port:number}).port;
const browser=await chromium.launch({headless:true,executablePath:'/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome',args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage','--single-process','--no-zygote']});const page=await browser.newPage();const errors:string[]=[];page.on('pageerror',e=>errors.push(e.message));await page.addInitScript('globalThis.__name=(v)=>v');const results=[];
try{await page.goto('http://127.0.0.1:'+port+'/furniture-render');await page.waitForFunction(()=>typeof (window as any).alvaFurnitureRender==='function');for(const asset of assets.slice(7)){
 const model=catalogueFurniture(asset.id,asset.color,asset.material),dimensions={width:asset.width,depth:asset.depth,height:asset.height};
 const r=await page.evaluate(({model,dimensions})=>(window as any).alvaFurnitureRender(model,dimensions),{model,dimensions});assert.equal(r.images.length,3);assert.ok(r.stats.meshes>=8);
 for(let i=0;i<3;i++)await writeFile(resolve(out,asset.id+'-'+i+'.png'),Buffer.from(r.images[i].split(',')[1],'base64'));
 results.push({id:asset.id,parts:r.stats.meshes,views:r.views});}
 assert.deepEqual(errors,[]);await writeFile(resolve(out,'result.json'),JSON.stringify({pass:true,results,errors},null,2));console.log(JSON.stringify({out,assets:results.length,errors}));
}finally{await browser.close();server.close()}
