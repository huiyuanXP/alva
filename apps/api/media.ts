import {ChatService} from './chat.js';
import {isChatModelId,resolveModel} from './provider.js';
import {canonical} from '../../packages/contracts/canonical.js';
import {z} from 'zod';import {randomUUID} from 'node:crypto';
import {Command,Id} from '../../packages/contracts/index.js';import {Store,HttpError} from './store.js';import {config} from './config.js';import {addSuggestion} from './requirements.js';
const MAX=5*1024*1024;
export function decodeMedia(mime:string,data:string){if(!/^[A-Za-z0-9+/]*={0,2}$/.test(data)||data.length>Math.ceil(MAX/3)*4)throw new HttpError(400,'附件编码或大小无效（上限5MB）');const b=Buffer.from(data,'base64');if(!b.length||b.length>MAX)throw new HttpError(400,'附件为空或超过5MB');
 if(mime==='image/png'){if(b.length<33||b.subarray(0,8).toString('hex')!=='89504e470d0a1a0a'||b.toString('ascii',12,16)!=='IHDR'||b.readUInt32BE(16)>4096||b.readUInt32BE(20)>4096||!b.readUInt32BE(16)||!b.readUInt32BE(20))throw new HttpError(400,'只支持最大4096像素的有效PNG图片');}
 else if(mime==='audio/wav'){if(b.length<44||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WAVE')throw new HttpError(400,'只支持WAV音频');let fmt=false,seconds=0;for(let at=12;at+8<=b.length;){const n=b.readUInt32LE(at+4);if(at+8+n>b.length)throw new HttpError(400,'WAV数据损坏');const key=b.toString('ascii',at,at+4);if(key==='fmt '){if(n<16||b.readUInt16LE(at+8)!==1||b.readUInt16LE(at+10)!==1||b.readUInt32LE(at+12)!==16000||b.readUInt16LE(at+22)!==16)throw new HttpError(400,'请上传16kHz单声道16位PCM WAV');fmt=true;}if(key==='data')seconds+=n/32000;at+=8+n+(n%2);}if(!fmt||seconds<=0||seconds>60)throw new HttpError(400,'录音须为1至60秒内的有效WAV');}
 else if(mime==='image/jpeg'){if(b.length<4||b.subarray(0,3).toString('hex')!=='ffd8ff'||b.subarray(-2).toString('hex')!=='ffd9')throw new HttpError(400,'JPEG原件格式无效');}
 else if(mime==='image/webp'){if(b.length<16||b.toString('ascii',0,4)!=='RIFF'||b.toString('ascii',8,12)!=='WEBP')throw new HttpError(400,'WebP原件格式无效');}
 else if(mime==='audio/webm'){if(b.subarray(0,4).toString('hex')!=='1a45dfa3')throw new HttpError(400,'原始录音格式无效');}
 else throw new HttpError(400,'仅支持PNG图片和WAV音频；禁止SVG/HTML');return b;}
export const Upload=Command.extend({room_id:Id,mime:z.enum(['image/png','audio/wav']),data:z.string().max(7000000),original:z.object({mime:z.enum(['audio/webm','image/jpeg','image/webp']),data:z.string().max(7000000)}).strict().optional()}).strict();
const Analyze=Command.extend({attachment_id:Id}).strict();
export class MediaService{
 private inflight=new Map<string,{input:string,promise:Promise<any>}>();
 constructor(private store:Store,private provider=fetch,private chat?:ChatService){}
 async get(id:string,owner:string,attachment:string){await this.store.get(id,owner);const row=(await this.store.db.query<any>('SELECT * FROM attachments WHERE id=$1 AND project_id=$2',[attachment,id])).rows[0];if(!row)throw new HttpError(404,'此项目附件不存在');return row;}
 async upload(id:string,owner:string,b:z.infer<typeof Upload>){const bytes=decodeMedia(b.mime,b.data),original=b.original?decodeMedia(b.original.mime,b.original.data):null;if(b.original&&((b.original.mime==='audio/webm')!==(b.mime==='audio/wav')))throw new HttpError(400,'原件类型与归一化附件不一致');
 return this.store.mutate(id,owner,b.request_id,b.expected_version,'attachment_uploaded',{...b,data:bytes.toString('base64')},async(p,tx)=>{if(!p.rooms.some(r=>r.id===b.room_id))throw new HttpError(404,'房间不存在');const quota=(await tx.query('SELECT count(*)::int AS count,coalesce(sum(byte_size),0)::int AS total FROM attachments WHERE project_id=$1',[id])).rows[0];if(quota.count>=10||quota.total+bytes.length+(original?.length??0)>20*1024*1024)throw new HttpError(413,'项目附件配额为10个、共20MB');const attachment=randomUUID();await tx.query('INSERT INTO attachments VALUES($1,$2,$3,$4,$5,$6,$7)',[attachment,id,b.mime,b.data,b.original?.mime??null,b.original?.data??null,bytes.length+(original?.length??0)]);
 (p.attachments??=[]).push({id:attachment,room_id:b.room_id,message_id:b.request_id,mime:b.mime,status:'uploaded'});p.evidence.push({id:attachment,attachment_id:attachment,message_id:b.request_id,room_id:b.room_id,region:b.mime==='image/png'?'whole_image':'whole_audio',source:'user_attachment',quote:b.original?`用户原件${b.original.mime}已保留，归一化为${b.mime}；未确认偏好`:'用户上传参考；未确认偏好',created_at:new Date().toISOString()});});}
 async analyze(id:string,owner:string,b:z.infer<typeof Analyze>){const key=`${owner}:${id}:${b.request_id}`,input=canonical(b);const active=this.inflight.get(key);if(active){if(active.input!==input)throw new HttpError(409,'request_id已用于不同分析');return active.promise;}const promise=this.performAnalysis(id,owner,b).finally(()=>this.inflight.delete(key));this.inflight.set(key,{input,promise});return promise;}
 private async performAnalysis(id:string,owner:string,b:z.infer<typeof Analyze>){const prior=await this.store.replay(id,owner,b.request_id,'media_analysis_started',b);if(prior){const current=await this.store.get(id,owner);const analysis=current.media_analyses?.find(a=>a.request_id===b.request_id&&a.attachment_id===b.attachment_id);if(analysis?.status!=='complete')throw new HttpError(409,'上一分析未完成，请使用新请求重试；原件已保留');return current;}
 const a=await this.get(id,owner,b.attachment_id);const p=await this.store.mutate(id,owner,b.request_id,b.expected_version,'media_analysis_started',b,q=>{const m=q.attachments?.find(m=>m.id===a.id);if(!m)throw new HttpError(404,'附件信息不存在');if(m.status==='analyzing'){const active=q.media_analyses?.find(r=>r.attachment_id===a.id&&r.status==='running');if(active?.started_at&&Date.now()-Date.parse(active.started_at)>60000)active.status='failed';else throw new HttpError(409,'此附件正在分析，请等待本轮完成');}m.status='analyzing';(q.media_analyses??=[]).push({request_id:b.request_id,attachment_id:a.id,status:'running',started_at:new Date().toISOString()});});const meta=p.attachments!.find(m=>m.id===a.id)!;
 try{
 if(a.mime==='audio/wav'&&config.audioApi!=='chat-input-audio')throw new HttpError(503,'当前仅验证chat-input-audio模式，请手动填写转写');
 const audio=a.mime==='audio/wav';const content:any[]=audio?[{type:'text',text:'Transcribe the attached audio exactly. Return only the transcript. Do not infer preferences.'},{type:'input_audio',input_audio:{data:a.data,format:'wav'}}]:[{type:'text',text:'读取图片像素，用中文返回JSON {"candidates":[{"field_key":"tone"或"functions","value":"简短候选","rationale":"仅描述图片依据，不代表用户喜欢"}]}。最多2项。不要认为用户喜欢全部内容。无依据则空数组。区域whole_image。'},{type:'image_url',image_url:{url:`data:image/png;base64,${a.data}`}}];
 let result:string;try{const response=await this.provider(config.baseUrl+'/chat/completions',{method:'POST',headers:{Authorization:`Bearer ${config.apiKey}`,'Content-Type':'application/json'},signal:AbortSignal.timeout(45000),body:JSON.stringify({model:audio?config.transcriptionModel:config.visionModel,messages:[{role:'user',content}],max_tokens:1000})});if(!response.ok)throw Error();const json=await response.json() as any;result=z.string().min(1).max(8000).parse(json.choices?.[0]?.message?.content);}catch{throw new HttpError(503,'媒体解读失败；原件已保留，请手动修正或重新上传');}
 let candidates:any[];try{candidates=audio?[]:z.object({candidates:z.array(z.object({field_key:z.enum(['tone','functions']),value:z.string().min(1).max(400),rationale:z.string().min(1).max(600)}).strict()).max(2)}).strict().parse(JSON.parse(result.replace(/^```(?:json)?\s*|\s*```$/g,''))).candidates;}catch{throw new HttpError(503,'媒体服务返回格式无效；原件已保留，请重试或手动修正');}
 return await this.store.mutate(id,owner,randomUUID(),p.version,'media_analyzed',{analysis_request_id:b.request_id},q=>{const m=q.attachments!.find(m=>m.id===a.id)!;m.status='analyzed';q.media_analyses!.find(r=>r.request_id===b.request_id)!.status='complete';if(audio)m.transcript=result;for(const candidate of candidates)addSuggestion(q,{...candidate,room_id:meta.room_id,evidence_ids:[a.id]},p.version);},'agent');
 }catch(error){
   await this.store.mutate(id,owner,randomUUID(),null,'media_analysis_failed',{analysis_request_id:b.request_id},q=>{
     const attachment=q.attachments!.find(m=>m.id===a.id)!;
     const analysis=q.media_analyses!.find(r=>r.request_id===b.request_id)!;
     const anotherOwner=q.media_analyses!.some(r=>r.attachment_id===a.id&&r.request_id!==b.request_id&&r.status==='running');
     // The asynchronous result must not undo a newer explicit user confirmation.
     if(attachment.status==='analyzing' && analysis.status==='running' && !anotherOwner){
       attachment.status=attachment.corrected_transcript!==undefined?'confirmed':'failed';
     }
     analysis.status='failed';
   },'agent');
   throw error;
 }
 }
 async confirm(id:string,owner:string,b:any){const body=Command.extend({attachment_id:Id,transcript:z.string().min(1).max(4000),confirmed:z.literal(true),model_id:z.string().min(1).max(200).refine(isChatModelId,'模型标识无效').optional()}).strict().parse(b);await this.get(id,owner,body.attachment_id);const p=await this.store.get(id,owner);const a=p.attachments?.find(a=>a.id===body.attachment_id&&a.mime==='audio/wav');if(!a)throw new HttpError(404,'音频附件不存在');if(!this.chat)throw new HttpError(503,'咨询服务未连接，原件与转写已保留');if(body.model_id)await resolveModel(body.model_id);const result=await this.chat.start(id,owner,{request_id:body.request_id,expected_version:body.expected_version,room_id:a.room_id,text:body.transcript,attachment_id:a.id,...(body.model_id?{model_id:body.model_id}:{})});return result.project;}

}
export function registerMedia(app:any,store:Store,chat:ChatService){const media=new MediaService(store,fetch,chat);const scope=(req:any)=>({id:Id.parse(req.params.id),owner:req.owner});
 app.post('/api/projects/:id/media',{bodyLimit:15000000},(req:any)=>{const s=scope(req);return media.upload(s.id,s.owner,Upload.parse(req.body));});
 app.post('/api/projects/:id/media/analyze',(req:any)=>{const s=scope(req);return media.analyze(s.id,s.owner,Analyze.parse(req.body));});
 app.post('/api/projects/:id/media/confirm',(req:any)=>{const s=scope(req);return media.confirm(s.id,s.owner,req.body);});
 app.post('/api/projects/:id/media/link',async(req:any)=>{const s=scope(req);await store.get(s.id,s.owner);throw new HttpError(422,'暂不抓取外部图片链接，请下载后上传PNG图片；不会访问该网址');});
 app.get('/api/projects/:id/media/:attachment',async(req:any,reply:any)=>{const s=scope(req);const a=await media.get(s.id,s.owner,Id.parse(req.params.attachment));const original=req.query.original==='1';return reply.type(original?a.original_mime||a.mime:a.mime).header('Content-Disposition','attachment').send(Buffer.from(original?a.original_data||a.data:a.data,'base64'));});
}
