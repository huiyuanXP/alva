import {chromium,expect} from '@playwright/test'
import {randomUUID,randomBytes} from 'node:crypto'
import {AlvaStore} from '../api/store.js'
import {buildAlva} from '../api/api.js'
import {itemFromAsset,type SceneData} from '../api/model.js'
const origin='http://127.0.0.1:4200',store=new AlvaStore();await store.init()
const scene:SceneData={walls:[{id:'w',a:{x:0,y:0},b:{x:8,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'r',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:8,y:0},{x:8,y:5},{x:0,y:5}],locked:false}],openings:[],items:[{...itemFromAsset('alva-sofa','r',2,2),id:'sofa-1'}],calibration:null,geography:{latitude:31,north:0,assumption:'browser'}}
const c=await store.create('ALVA-026 浏览器');await store.ensureAccessCode(c.project.id);await store.mutate(c.project.id,randomUUID(),0,'seed',{},p=>{p.scene=scene})
const app=await buildAlva(store,{origin,assets:true});await app.listen({host:'127.0.0.1',port:4200})
const browser=await chromium.launch({headless:true,args:['--disable-dev-shm-usage']}),ctx=await browser.newContext({viewport:{width:1440,height:1000}});const ss=await store.issueInternalSession(c.project.id);await ctx.addCookies([{name:'alva_session',value:ss.token,domain:'127.0.0.1',path:'/'}]);const page=await ctx.newPage()
const get=async()=>await(await page.request.get(origin+'/api/project')).json()
try{await page.goto(origin);await page.getByRole('button',{name:'家具',exact:true}).click();await page.getByTestId('furniture-selection').selectOption('sofa-1');await page.getByText('移回家具库').click();await expect.poll(async()=>(await get()).scene.items.length).toBe(0);await expect.poll(async()=>(await get()).archivedFurniture.length).toBe(1);await page.getByTestId('furniture-source').selectOption('sofa-1');await page.getByTestId('furniture-add').click();await expect.poll(async()=>(await get()).scene.items.length).toBe(1);const item=(await get()).scene.items[0];if(item.id==='sofa-1'||item.sourceId!=='sofa-1')throw new Error('new instance provenance failed');console.log(JSON.stringify({pass:true,checks:['网页点击移回家具库','网页选择已移回来源并重新添加','新实例ID与sourceId可追溯']}))}finally{await browser.close();await app.close();await store.close()}
