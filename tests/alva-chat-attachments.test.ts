import {test} from 'node:test';
import assert from 'node:assert/strict';
import {mkdtemp,rm,writeFile} from 'node:fs/promises';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {createHash} from 'node:crypto';
import {saveFloorplanAttachment,readFloorplanAttachment} from '../api/import/attachments.js';
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
test('real private attachment bytes are scoped by project and corruption is explainable',async()=>{
 const root=await mkdtemp(join(tmpdir(),'alva066-attachments-')),previous=process.env.ALVA_UPLOAD_DIR;process.env.ALVA_UPLOAD_DIR=root;
 try{
  const meta=await saveFloorplanAttachment('a',{mime:'image/png',filename:'original.png',data:png});
  assert.equal((await readFloorplanAttachment('a',meta.id)).data,png);
  await assert.rejects(readFloorplanAttachment('b',meta.id),/不属于当前项目/);
  await assert.rejects(readFloorplanAttachment('a','../../anything'),/附件不存在/);
  await assert.rejects(saveFloorplanAttachment('a',{mime:'image/png',filename:'fake.png',data:Buffer.from('filename is not an image').toString('base64')}),/内容有效/);
  const folder=createHash('sha256').update('a').digest('hex');await writeFile(join(root,folder,meta.id+'.bin'),'corrupt');
  await assert.rejects(readFloorplanAttachment('a',meta.id),/已损坏/);
 }finally{if(previous===undefined)delete process.env.ALVA_UPLOAD_DIR;else process.env.ALVA_UPLOAD_DIR=previous;await rm(root,{recursive:true,force:true})}
});
