import assert from 'node:assert/strict';
import {readFile,writeFile} from 'node:fs/promises';
import {createHash} from 'node:crypto';
import {chromium} from '@playwright/test';
import {unzipSync,strFromU8} from 'fflate';

const url=process.env.ALVA045_URL;if(!url)throw new Error('ALVA045_URL must be provided');
const code=process.env.ALVA045_CODE;if(!code)throw new Error('ALVA045_CODE must be provided');
const browser=await chromium.launch({headless:true,args:['--use-angle=swiftshader','--enable-unsafe-swiftshader','--disable-dev-shm-usage']});
try{
 const page=await browser.newPage({acceptDownloads:true});await page.goto(url,{waitUntil:'networkidle'});await assertLogin(page);
 await page.getByPlaceholder('输入项目发起人提供的验证码').fill(code);await page.getByRole('button',{name:'验证并进入'}).click();await page.getByText('ALVA-045 完整交付包验收').waitFor();
 const delivery=page.getByRole('button',{name:'交付包'});assert.equal(await delivery.isEnabled(),true,'保存版本存在时交付包按钮应可用');
 const downloadPromise=page.waitForEvent('download');await delivery.click();const download=await downloadPromise;const path='/tmp/alva045-delivery.zip';await download.saveAs(path);await page.getByText('交付包已生成').waitFor();
 const zip=unzipSync(await readFile(path)),manifest=JSON.parse(strFromU8(zip['manifest.json']));assert.equal(manifest.version,1);assert.equal(manifest.sourceSnapshot.version,1);assert.ok(manifest.sourceSnapshot.snapshotFingerprint);for(const [name,entry] of Object.entries<any>(manifest.files)){assert.ok(zip[name],`缺少交付文件 ${name}`);assert.equal((zip[name] as Uint8Array).length,entry.bytes,`文件大小不一致 ${name}`);assert.equal(createHash('sha256').update(zip[name]).digest('hex'),entry.sha256,`校验和不一致 ${name}`)}assert.ok(zip['references.json']);assert.ok(zip['floorplan.svg']);assert.ok(zip['floorplan.png']);assert.ok(zip['whole-home.png']);assert.ok(zip['room-living-045.png']);assert.ok(zip['designer.docx']);assert.ok(zip['owner.pdf']);assert.equal(manifest.relations.roomSplitHistory[0].id,'split-045');assert.equal(manifest.relations.roomMergeHistory[0].id,'merge-045');
 await page.reload({waitUntil:'networkidle'});await page.getByText('ALVA-045 完整交付包验收').waitFor();assert.equal(await page.getByRole('button',{name:'交付包'}).isEnabled(),true,'刷新后仍可交付同一保存版本');await page.getByRole('button',{name:'退出'}).click();await assertLogin(page);await page.getByPlaceholder('输入项目发起人提供的验证码').fill(code);await page.getByRole('button',{name:'验证并进入'}).click();await page.getByText('ALVA-045 完整交付包验收').waitFor();console.log(JSON.stringify({ok:true,files:Object.keys(zip).sort(),version:manifest.version}));
}finally{await browser.close()}
async function assertLogin(page:any){await page.getByText('输入验证码').waitFor();assert.equal(await page.getByRole('button',{name:'验证并进入'}).isDisabled(),true,'空验证码必须禁用登录');}
