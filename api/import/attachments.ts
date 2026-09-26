import {mkdir,readFile,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {createHash,randomUUID} from 'node:crypto';
import {z} from 'zod';
import {imageData} from './image-data.js';
import {McpError} from '../mcp/contracts.js';

const Metadata=z.object({id:z.string().uuid(),projectId:z.string(),mime:z.enum(['image/png','image/jpeg','application/pdf']),filename:z.string(),sha256:z.string(),bytes:z.number(),createdAt:z.string()});
export type Attachment=z.infer<typeof Metadata>;
const root=()=>resolve(process.env.ALVA_UPLOAD_DIR||'.runtime/alva-uploads');
const dir=(projectId:string)=>resolve(root(),createHash('sha256').update(projectId).digest('hex'));
const invalid=()=>new McpError({code:'ATTACHMENT_UNAVAILABLE',message:'附件不存在、已损坏或不属于当前项目',retryable:false,repairActions:[{action:'upload_attachment',message:'请在当前项目重新上传清晰的 PNG、JPEG 或 PDF 原文件'}]});
export async function saveFloorplanAttachment(projectId:string,input:{mime:string;filename:string;data:string}):Promise<Attachment>{
 const mime=z.enum(['image/png','image/jpeg','application/pdf']).parse(input.mime);
 await imageData(mime,input.data,input.filename);
 const bytes=Buffer.from(input.data,'base64'),metadata:Attachment={id:randomUUID(),projectId,mime,filename:input.filename.slice(0,255),bytes:bytes.length,sha256:createHash('sha256').update(bytes).digest('hex'),createdAt:new Date().toISOString()};
 await mkdir(dir(projectId),{recursive:true,mode:0o700});
 await writeFile(resolve(dir(projectId),metadata.id+'.bin'),bytes,{mode:0o600,flag:'wx'});
 await writeFile(resolve(dir(projectId),metadata.id+'.json'),JSON.stringify(metadata),{mode:0o600,flag:'wx'});
 return metadata;
}
export async function readFloorplanAttachment(projectId:string,id:string){
 if(!z.string().uuid().safeParse(id).success)throw invalid();
 try{
  const metadata=Metadata.parse(JSON.parse(await readFile(resolve(dir(projectId),id+'.json'),'utf8')));
  if(metadata.projectId!==projectId||metadata.id!==id)throw invalid();
  const bytes=await readFile(resolve(dir(projectId),id+'.bin'));
  if(bytes.length!==metadata.bytes||createHash('sha256').update(bytes).digest('hex')!==metadata.sha256)throw invalid();
  return {metadata,data:bytes.toString('base64')};
 }catch{throw invalid()}
}
