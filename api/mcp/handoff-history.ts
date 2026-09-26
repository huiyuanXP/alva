import {createReadStream} from 'node:fs';
import {createInterface} from 'node:readline';
import {resolve,sep} from 'node:path';
/** thread/read omits raw injected items; consult this thread's own durable rollout for recovery. */
export async function persistedHandoffs(path:string,home:string,threadId:string,ids:string[]){
 const file=resolve(path);if(!file.startsWith(resolve(home)+sep))throw new Error('阶段历史路径不属于当前会话');
 const found=new Set<string>();let identified=false;
 const stream=createReadStream(file,{encoding:'utf8'}),lines=createInterface({input:stream,crlfDelay:Infinity});
 try{for await(const line of lines){if(!line.trim())continue;const record=JSON.parse(line);if(record.type==='session_meta'){if(record.payload?.id!==threadId)throw new Error('阶段历史与原thread不匹配');identified=true}
  if(record.type==='response_item'&&record.payload?.type==='message'&&record.payload?.role==='user'){
   const text=(record.payload.content||[]).filter((c:any)=>c.type==='input_text').map((c:any)=>c.text).join('\n');for(const id of ids)if(text.includes(`[ALVA_HANDOFF:${id}]`))found.add(id);
  }
 }}finally{lines.close();stream.destroy()}
 if(!identified)throw new Error('阶段历史缺少原thread身份');return found;
}
