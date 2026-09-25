import {chromium,expect} from '@playwright/test';
import {mkdir,writeFile} from 'node:fs/promises';
import {randomUUID,randomBytes} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import type {SceneData} from '../api/model.js';

const runId=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA024-browser-'+randomUUID().slice(0,6);
const dir='evidence/'+runId,origin='http://127.0.0.1:4198';
await mkdir(dir,{recursive:true});
const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE=randomBytes(24).toString('hex');
const store=new AlvaStore();await store.init();
const fixture:SceneData={walls:[{id:'wall-1',a:{x:0,y:0},b:{x:8,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'room-1',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:8,y:0},{x:8,y:5},{x:0,y:5}],locked:false}],openings:[],items:[
 {id:'chair-1',assetId:'alva-chair',roomId:'room-1',name:'椅子',x:1.5,y:2,width:.5,depth:.5,height:.85,rotation:0,color:'#9a7957',material:'wood',clearance:0,locked:false},
 {id:'table-1',assetId:'alva-table',roomId:'room-1',name:'操作台 / 书桌',x:6,y:3,width:1.4,depth:.65,height:.75,rotation:0,color:'#b49a75',material:'wood',clearance:0,locked:false}
],calibration:null,geography:{latitude:31,north:0,assumption:'ALVA-024 真实浏览器合成布局'}};
const created=await store.create('ALVA-024 家具移动旋转真实交互');await store.ensureAccessCode(created.project.id);
const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=fixture});
const app=await buildAlva(store,{origin,assets:true});await app.listen({host:'127.0.0.1',port:4198});
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']});
const context=await browser.newContext({viewport:{width:1440,height:1000}});
const session=await store.issueInternalSession(created.project.id);await context.addCookies([{name:'alva_session',value:session.token,domain:'127.0.0.1',path:'/'}]);
const page=await context.newPage();const errors:string[]=[],checks:string[]=[];
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()!=='error'||m.text().includes('favicon'))return;if(m.text().includes('422')&&m.location().url.includes('/api/commands'))return;errors.push(m.text())});
const getProject=async()=>await (await page.request.get(origin+'/api/project')).json();
const waitItem=async(id:string,field:string,value:number)=>{await expect.poll(async()=>{const p=await getProject();return p.scene.items.find((i:any)=>i.id===id)?.[field]}).toBeCloseTo(value,6);return getProject()};
const svgPoint=async(x:number,y:number)=>await page.getByLabel('可校正二维户型图').evaluate((svg:SVGSVGElement,args)=>{const point=new DOMPoint(args.x,args.y).matrixTransform(svg.getScreenCTM()!);return {x:point.x,y:point.y}},{x,y});
try{
  await page.goto(origin);await page.getByRole('button',{name:'家具',exact:true}).click();await page.getByTestId('furniture-selection').selectOption('chair-1');
  const from=await svgPoint(1.5,2),to=await svgPoint(2.05,2.05);await page.mouse.move(from.x,from.y);await page.mouse.down();await page.mouse.move(to.x,to.y,{steps:5});await page.mouse.up();await waitItem('chair-1','x',2.05);const moved2d=await getProject();if(moved2d.scene.items.find((i:any)=>i.id==='chair-1').y>2.05+1e-6||moved2d.scene.items.find((i:any)=>i.id==='chair-1').y<2.05-1e-6)throw new Error('2D drag did not persist snapped position');
  checks.push('真实2D拖动使用服务端5cm网格吸附并持久化位置');
  await page.getByLabel('旋转（°）').fill('22');await page.getByTestId('furniture-confirm').click();await expect.poll(async()=>((await getProject()).scene.items.find((i:any)=>i.id==='chair-1').rotation)).toBe(15);checks.push('手动旋转经服务端统一归一化为15度吸附');
  await page.getByRole('button',{name:'全屋',exact:true}).click();const canvas=page.locator('canvas[aria-label="全屋三维场景"]');await expect(canvas).toBeVisible();
  const point3d=async(x:number,y:number,worldY?:number)=>await page.locator('[data-testid="scene-view"]').evaluate((host:any,args)=>{const obj=host.alvaView.world.children.find((v:any)=>v.userData?.id===args.id);const canvas=host.querySelector('canvas');const p=obj.position.clone();p.x=args.x;p.z=args.y;if(args.worldY!==undefined)p.y=args.worldY;p.project(host.alvaView.camera);const rect=canvas.getBoundingClientRect();return {x:rect.left+(p.x+1)*canvas.clientWidth/2,y:rect.top+(1-p.y)*canvas.clientHeight/2}}, {id:'chair-1',x,y,worldY});
  const a=await point3d(2.05,2.05),b=await point3d(2.55,2.05,0);const hits=await page.locator('[data-testid="scene-view"]').evaluate((host:any,args)=>host.alvaView.pick(args.x,args.y),a);if(!hits.includes('chair-1'))throw new Error('3D raycast missed selected chair: '+JSON.stringify({point:a,hits}));await page.mouse.move(a.x,a.y);await page.mouse.down();await page.mouse.move(b.x,b.y,{steps:6});await page.mouse.up();await waitItem('chair-1','x',2.55);checks.push('真实Three.js三维拖动复用同一服务端吸附规则');
  await page.getByLabel('横向位置（m）').fill('6');await page.getByLabel('纵向位置（m）').fill('3');await page.getByTestId('furniture-confirm').click();await expect(page.getByRole('alert')).toContainText('占地重叠');const afterCollision=await getProject();if(afterCollision.scene.items.find((i:any)=>i.id==='chair-1').x>2.55+1e-6||afterCollision.scene.items.find((i:any)=>i.id==='chair-1').x<2.55-1e-6)throw new Error('collision rejection changed the furniture position');checks.push('家具碰撞被服务端拒绝且没有部分坐标写入');
  await page.getByLabel('横向位置（m）').fill('7.9');await page.getByLabel('纵向位置（m）').fill('4.9');await page.getByTestId('furniture-confirm').click();await expect(page.getByRole('alert')).toContainText('超出所属房间边界');const afterBoundary=await getProject();const boundaryX=afterBoundary.scene.items.find((i:any)=>i.id==='chair-1').x;if(Math.abs(boundaryX-2.55)>1e-6)throw new Error('boundary rejection changed the furniture position');checks.push('家具越界被服务端拒绝并给出可理解反馈');
  await page.getByTestId('furniture-lock').click();await expect(page.getByTestId('furniture-lock')).toHaveText('解除家具锁定');const locked=await getProject();const bypass=await page.request.post(origin+'/api/commands',{data:{requestId:randomUUID(),expectedRevision:locked.revision,changes:[{action:'update',targetId:'chair-1',values:{x:2,y:2}}],confirmed:true}});if(bypass.status()!==422)throw new Error('locked furniture update bypassed server restriction');checks.push('锁定家具无法通过界面或直接命令绕过');
  await page.reload();const reloaded=await getProject();const finalItem=reloaded.scene.items.find((i:any)=>i.id==='chair-1');if(Math.abs(finalItem.x-2.55)>1e-6||Math.abs(finalItem.y-2.05)>1e-6||finalItem.rotation!==15||!finalItem.locked)throw new Error('refresh did not preserve transform or lock');checks.push('刷新后位置、方向和锁定状态保持一致');
  await page.screenshot({path:dir+'/furniture-transform.png',fullPage:true});
  if(errors.length)throw new Error(errors.join('\n'));
  const report={ticket:'ALVA-024',runId,pass:true,finishedAt:new Date().toISOString(),checks,errors,fixture:'synthetic scene used for deterministic browser regression; Chat rule parity covered by API test'};
  await writeFile(dir+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2));
}catch(error){await page.screenshot({path:dir+'/failure.png',fullPage:true});await writeFile(dir+'/result.json',JSON.stringify({ticket:'ALVA-024',runId,pass:false,checks,error:String(error),errors},null,2));throw error}
finally{await browser.close();await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
