import { Worker } from 'node:worker_threads';
import { HttpError } from './store.js';
export const documentMimes = ['application/pdf','application/vnd.openxmlformats-officedocument.wordprocessingml.document','text/plain','text/markdown','text/csv','application/json'] as const;
let activeWorkers=0;
export function isDocument(mime:string) { return (documentMimes as readonly string[]).includes(mime); }
export function validateDocument(mime:string,bytes:Buffer) {
  if(!isDocument(mime))throw new HttpError(400,'不支持的文档类型');
  if(mime==='application/pdf'&&bytes.subarray(0,5).toString()!=='%PDF-')throw new HttpError(400,'文件内容与PDF类型不符');
  if(mime.includes('wordprocessingml')&&(bytes.length<4||bytes.subarray(0,4).toString('hex')!=='504b0304'))throw new HttpError(400,'文件内容与DOCX类型不符');
  if(mime.startsWith('text/')||mime==='application/json')try{const text=new TextDecoder('utf-8',{fatal:true}).decode(bytes);if(text.includes('\0'))throw Error();if(mime==='application/json')JSON.parse(text);}catch{throw new HttpError(400,'文本须为有效UTF-8；JSON须具有合法结构。HTML、SVG和二进制文件不支持');}
}
export async function extractDocument(mime:string,bytes:Buffer):Promise<{text:string;note:string}> {
  if(activeWorkers>=2)throw new HttpError(429,'文档处理正忙，请保留文件稍后重试');
  activeWorkers++;
  try{return await new Promise((resolve)=>{
    const worker=new Worker(new URL('./document-worker.mjs',import.meta.url),{workerData:{mime,bytes:new Uint8Array(bytes)},resourceLimits:{maxOldGenerationSizeMb:256,maxYoungGenerationSizeMb:32}});
    let done=false;
    const finish=(result:{text:string;note:string})=>{if(done)return;done=true;clearTimeout(timer);void worker.terminate();resolve(result);};
    const timer=setTimeout(()=>finish({text:'',note:'文字提取超过12秒上限，原件保留。请拆分文档或上传重点页图片。'}),12000);
    worker.on('message',data=>finish({text:typeof data?.text==='string'?data.text.slice(0,40000):'',note:typeof data?.note==='string'?data.note:'文字提取未完成'}));
    worker.on('error',()=>finish({text:'',note:'文档解析失败，原件保留；可改用重点页图片或文字。'}));
    worker.on('exit',()=>{if(!done)finish({text:'',note:'文档解析中断，原件保留；请重试或上传重点页。'});});
  });}finally{activeWorkers--;}
}
