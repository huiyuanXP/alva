import {chromium,expect} from '@playwright/test'
import {mkdir,writeFile} from 'node:fs/promises'
import {randomUUID,randomBytes} from 'node:crypto'
import {AlvaStore} from '../api/store.js'
import {buildAlva} from '../api/api.js'
import {itemFromAsset,type SceneData} from '../api/model.js'

const runId=new Date().toISOString().replace(/[-:.]/g,'')+'-ALVA025-browser-'+randomUUID().slice(0,6)
const dir='evidence/'+runId,origin='http://127.0.0.1:4199'
await mkdir(dir,{recursive:true})
const previous=process.env.ALVA_ACCESS_CODE;process.env.ALVA_ACCESS_CODE=randomBytes(24).toString('hex')
const store=new AlvaStore();await store.init()
const fixture:SceneData={walls:[{id:'wall-1',a:{x:0,y:0},b:{x:8,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'room-1',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:8,y:0},{x:8,y:5},{x:0,y:5}],locked:false}],openings:[],items:[
 {id:'chair-1',assetId:'alva-chair',roomId:'room-1',name:'椅子',x:1.5,y:2,width:.5,depth:.5,height:.85,rotation:0,color:'#9a7957',material:'wood',clearance:0,locked:false},
 {id:'table-1',assetId:'alva-table',roomId:'room-1',name:'操作台 / 书桌',x:6,y:3,width:1.4,depth:.65,height:.75,rotation:0,color:'#b49a75',material:'wood',clearance:0,locked:false}
],calibration:null,geography:{latitude:31,north:0,assumption:'ALVA-025 真实浏览器属性与款式布局'}}
const created=await store.create('ALVA-025 家具属性与款式真实交互');await store.ensureAccessCode(created.project.id)
await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{p.scene=fixture})
const app=await buildAlva(store,{origin,assets:true});await app.listen({host:'127.0.0.1',port:4199})
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']})
const context=await browser.newContext({viewport:{width:1440,height:1000}})
const session=await store.issueInternalSession(created.project.id);await context.addCookies([{name:'alva_session',value:session.token,domain:'127.0.0.1',path:'/'}])
const page=await context.newPage();const errors:string[]=[],checks:string[]=[]
page.on('pageerror',e=>errors.push(e.message));page.on('console',m=>{if(m.type()!=='error'||m.text().includes('favicon'))return;if(m.text().includes('422')&&m.location().url.includes('/api/commands'))return;errors.push(m.text())})
const getProject=async()=>await (await page.request.get(origin+'/api/project')).json()
const waitItem=async(id:string,predicate:(item:any)=>boolean)=>{await expect.poll(async()=>predicate((await getProject()).scene.items.find((i:any)=>i.id===id))).toBe(true)}
const setColor=async(value:string)=>await page.locator('input[type=color]').evaluate((element,value)=>{const input=element as HTMLInputElement;const setter=Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value')!.set!;setter.call(input,value);input.dispatchEvent(new Event('input',{bubbles:true}));input.dispatchEvent(new Event('change',{bubbles:true}))},value)
try{
 await page.goto(origin);await page.getByRole('button',{name:'家具',exact:true}).click();await page.getByTestId('furniture-selection').selectOption('chair-1')
 await expect(page.getByTestId('furniture-license')).toContainText('CC0 · alva程序几何');checks.push('家具面板展示许可款式与可查询的资产来源')
 const before2d=await page.getByTestId('plan-item-chair-1').getAttribute('fill');if(before2d!=='#9a7957')throw new Error('2D initial color mismatch: '+before2d)
 await page.getByTestId('furniture-style').selectOption('alva-sofa');await page.getByLabel('宽度（m）').fill('1.8');await page.getByLabel('深度（m）').fill('0.8');await page.getByLabel('高度（m）').fill('0.9');await setColor('#112233');await page.getByLabel('材质').selectOption('metal');await page.getByTestId('furniture-confirm').click()
 await waitItem('chair-1',item=>item.assetId==='alva-sofa'&&item.width===1.8&&item.depth===.8&&item.height===.9&&item.color==='#112233'&&item.material==='metal')
 const changed=await getProject(),changedItem=changed.scene.items.find((i:any)=>i.id==='chair-1');if(changedItem.id!=='chair-1'||changedItem.roomId!=='room-1')throw new Error('style replacement changed instance or room identity')
 if(await page.getByTestId('plan-item-chair-1').getAttribute('fill')!=='#112233')throw new Error('2D color did not follow persisted style')
 checks.push('真实网页确认许可款式、尺寸、颜色、材质并在2D立即反映')
 await page.getByRole('button',{name:'全屋',exact:true}).click();await expect(page.locator('canvas[aria-label="全屋三维场景"]')).toBeVisible()
 await expect.poll(async()=>await page.locator('[data-testid="scene-view"]').evaluate((host:any)=>{const mesh=host.alvaView.world.children.find((v:any)=>v.userData?.id==='chair-1');const material=mesh?.material;return material?.color?.getHexString()==='112233'&&material?.metalness===.65})).toBe(true)
 checks.push('真实Three.js场景材质颜色与金属参数跟随更新')
 await page.reload();await page.getByRole('button',{name:'家具',exact:true}).click();await page.getByTestId('furniture-selection').selectOption('chair-1');await expect(page.getByTestId('furniture-style')).toHaveValue('alva-sofa');await expect(page.getByLabel('宽度（m）')).toHaveValue('1.8');await expect(page.getByTestId('furniture-license')).toContainText('CC0');checks.push('刷新后实例身份、款式、尺寸和许可来源保持一致')
 await page.getByLabel('宽度（m）').fill('20');await page.getByTestId('furniture-confirm').click();await expect(page.getByRole('alert')).toContainText('宽度需在0.05–10米之间');const afterInvalid=await getProject();if(afterInvalid.scene.items.find((i:any)=>i.id==='chair-1').width!==1.8)throw new Error('invalid width changed persisted scene');checks.push('非法尺寸被服务端拒绝且原尺寸保持不变')
 await page.getByLabel('宽度（m）').fill('1.8');await page.getByTestId('furniture-lock').click();await expect(page.getByTestId('furniture-lock')).toHaveText('解除家具锁定');await expect(page.getByTestId('furniture-confirm')).toBeDisabled();checks.push('锁定实例禁用属性提交并保留服务端防绕过')
 const locked=await getProject();const bypass=await page.request.post(origin+'/api/commands',{data:{requestId:randomUUID(),expectedRevision:locked.revision,changes:[{action:'update',targetId:'chair-1',values:{assetId:'alva-bed'}}],confirmed:true}});if(bypass.status()!==422)throw new Error('locked style bypass returned '+bypass.status());checks.push('直接请求不能绕过锁定限制')
 await page.screenshot({path:dir+'/furniture-properties.png',fullPage:true})
 if(errors.length)throw new Error(errors.join('\n'))
 const report={ticket:'ALVA-025',runId,pass:true,finishedAt:new Date().toISOString(),checks,errors,fixture:'synthetic two-item room; API test covers Chat parity, atomicity and stale revision'}
 await writeFile(dir+'/result.json',JSON.stringify(report,null,2));console.log(JSON.stringify(report,null,2))
}catch(error){await page.screenshot({path:dir+'/failure.png',fullPage:true});await writeFile(dir+'/result.json',JSON.stringify({ticket:'ALVA-025',runId,pass:false,checks,error:String(error),errors},null,2));throw error}
finally{await browser.close();await app.close();await store.close();if(previous===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=previous}
