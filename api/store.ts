import type {ChatAction} from '../packages/contracts/alva/chat-actions.js';
import {initialChatState,type StageChatState} from './mcp/sessions.js';
import {PGlite} from '@electric-sql/pglite';
import {createHash,randomBytes,randomUUID,timingSafeEqual} from 'node:crypto';
import {mkdir,readFile,writeFile,chmod} from 'node:fs/promises';
import {emptyProject,DomainError,type ImportState,type Project} from './model.js';
import {snapshotProject} from './snapshots/state.js';
import type {SaveReceipt} from '../packages/contracts/alva/snapshots.js';
type CommandReceipt={kind:'command-receipt-v1';revision:number;savedVersion?:number};
export type Role='owner'|'designer'|'professional';
export type Session={projectId:string;role:Role;linkId?:string;authGeneration:number};
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
export class AlvaStore{
 db:PGlite;failNextSave=false;
 constructor(path?:string){this.db=new PGlite(path)}
 async init(){await this.db.exec(`CREATE TABLE IF NOT EXISTS alva_projects(id text PRIMARY KEY,state jsonb NOT NULL);
 CREATE TABLE IF NOT EXISTS alva_links(id text PRIMARY KEY,project_id text NOT NULL,token_hash text UNIQUE NOT NULL,role text NOT NULL,revoked boolean NOT NULL DEFAULT false);
 CREATE TABLE IF NOT EXISTS alva_sessions(token_hash text PRIMARY KEY,link_id text,project_id text,role text,auth_generation integer,expires_at timestamptz NOT NULL);
 CREATE TABLE IF NOT EXISTS alva_access_config(id integer PRIMARY KEY CHECK(id=1),project_id text,code_hash text NOT NULL,generation integer NOT NULL DEFAULT 1,updated_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS alva_chat_actions(id text PRIMARY KEY,project_id text NOT NULL,state jsonb NOT NULL);
 CREATE TABLE IF NOT EXISTS alva_chat_stages(project_id text PRIMARY KEY,state jsonb NOT NULL);
 CREATE TABLE IF NOT EXISTS alva_commands(project_id text NOT NULL,request_id text NOT NULL,fingerprint text NOT NULL,response jsonb NOT NULL,PRIMARY KEY(project_id,request_id));
 CREATE TABLE IF NOT EXISTS alva_versions(project_id text NOT NULL,version integer NOT NULL,summary text NOT NULL,state jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(project_id,version));
 CREATE TABLE IF NOT EXISTS alva_failures(id text PRIMARY KEY,project_id text,operation text NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());
 CREATE TABLE IF NOT EXISTS alva_reference_batches(id text PRIMARY KEY,project_id text NOT NULL,request_id text NOT NULL,room_id text,filename text NOT NULL,mime text NOT NULL,image_data text NOT NULL,source_text text NOT NULL,status text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),UNIQUE(project_id,request_id));
 CREATE TABLE IF NOT EXISTS alva_reference_annotations(id text PRIMARY KEY,batch_id text NOT NULL,project_id text NOT NULL,origin text NOT NULL,preference text NOT NULL,feature text NOT NULL,status text NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),confirmed_at timestamptz);
 ALTER TABLE alva_sessions ALTER COLUMN link_id DROP NOT NULL;
 ALTER TABLE alva_sessions ADD COLUMN IF NOT EXISTS project_id text;
 ALTER TABLE alva_sessions ADD COLUMN IF NOT EXISTS role text;
 ALTER TABLE alva_sessions ADD COLUMN IF NOT EXISTS auth_generation integer;`)}
 async create(name:string){const p=emptyProject(name);await this.db.query('INSERT INTO alva_projects VALUES($1,$2)',[p.id,JSON.stringify(p)]);return {project:p,...await this.invite(p.id,'owner')}}
 async invite(projectId:string,role:Role){const token=randomBytes(32).toString('base64url'),id=randomUUID();await this.db.query('INSERT INTO alva_links(id,project_id,token_hash,role) VALUES($1,$2,$3,$4)',[id,projectId,hash(token),role]);return {token,linkId:id}}
 private accessCodePath(){return process.env.ALVA_ACCESS_CODE_FILE||'.runtime/alva-access-code'}
 private async readOrCreateAccessCode(){const path=this.accessCodePath();try{const code=(await readFile(path,'utf8')).trim();if(code.length>=16)return code}catch(error){if((error as NodeJS.ErrnoException).code!=='ENOENT')throw error}const code=randomBytes(24).toString('base64url');await mkdir(path.slice(0,path.lastIndexOf('/'))||'.runtime',{recursive:true,mode:0o700});await writeFile(path,`${code}\n`,{mode:0o600});await chmod(path,0o600);return code}
 async ensureAccessCode(projectId:string){const current=(await this.db.query<{project_id:string}>('SELECT project_id FROM alva_access_config WHERE id=1')).rows[0];if(current){if(!current.project_id)await this.db.query('UPDATE alva_access_config SET project_id=$1 WHERE id=1',[projectId]);return}const code=(process.env.ALVA_ACCESS_CODE||'').trim()||await this.readOrCreateAccessCode();if(code.length<16)throw new Error('ALVA_ACCESS_CODE 至少需要16个字符');await this.db.query('INSERT INTO alva_access_config(id,project_id,code_hash,generation) VALUES(1,$1,$2,1)',[projectId,hash(code)])}
 private async config(){const row=(await this.db.query<{project_id:string;code_hash:string;generation:number}>('SELECT project_id,code_hash,generation FROM alva_access_config WHERE id=1')).rows[0];if(!row?.project_id)throw new DomainError(503,'授权项目尚未配置');return row}
 sessionMaxAgeSeconds(){const hours=Math.min(168,Math.max(1,Number(process.env.ALVA_SESSION_TTL_HOURS||8)));return Math.floor(hours*3600)}
 private async createSession(projectId:string,role:Role,linkId?:string){const config=await this.config(),token=randomBytes(32).toString('base64url'),expiresAt=new Date(Date.now()+this.sessionMaxAgeSeconds()*1000).toISOString();await this.db.query('INSERT INTO alva_sessions(token_hash,link_id,project_id,role,auth_generation,expires_at) VALUES($1,$2,$3,$4,$5,$6)',[hash(token),linkId||null,projectId,role,config.generation,expiresAt]);return {token,projectId,role}}
 async exchangeAccessCode(input:string,inviteToken?:string){const config=await this.config(),candidate=hash(input.trim());if(candidate.length!==config.code_hash.length||!timingSafeEqual(Buffer.from(candidate),Buffer.from(config.code_hash)))throw new DomainError(401,'验证码错误或已失效');let role:Role='owner',linkId:string|undefined;if(inviteToken){const link=(await this.db.query<{id:string;project_id:string;role:Role}>('SELECT id,project_id,role FROM alva_links WHERE token_hash=$1 AND revoked=false',[hash(inviteToken)])).rows[0];if(!link||link.project_id!==config.project_id)throw new DomainError(401,'只读邀请无效或已撤销');role=link.role;linkId=link.id}return this.createSession(config.project_id,role,linkId)}
 async issueInternalSession(projectId:string){return this.createSession(projectId,'owner')}
 async session(token:string):Promise<Session>{const row=(await this.db.query<{project_id:string;role:Role;link_id:string|null;auth_generation:number}>(`SELECT COALESCE(s.project_id,l.project_id) AS project_id,COALESCE(s.role,l.role) AS role,s.link_id,s.auth_generation FROM alva_sessions s LEFT JOIN alva_links l ON l.id=s.link_id CROSS JOIN alva_access_config c WHERE s.token_hash=$1 AND s.expires_at>now() AND s.auth_generation=c.generation AND COALESCE(s.project_id,l.project_id)=c.project_id AND (s.link_id IS NULL OR l.revoked=false)`,[hash(token)])).rows[0];if(!row)throw new DomainError(401,'会话已过期或验证码已更换');return {projectId:row.project_id,role:row.role,linkId:row.link_id||undefined,authGeneration:row.auth_generation}}
 async logout(token:string){await this.db.query('DELETE FROM alva_sessions WHERE token_hash=$1',[hash(token)])}
 async rotateAccessCode(next?:string){const code=(next||'').trim()||randomBytes(24).toString('base64url');if(code.length<16)throw new Error('验证码至少需要16个字符');const config=await this.config();await this.db.query('UPDATE alva_access_config SET code_hash=$1,generation=generation+1,updated_at=now() WHERE id=1',[hash(code)]);await this.db.query('DELETE FROM alva_sessions');const path=this.accessCodePath();await mkdir(path.slice(0,path.lastIndexOf('/'))||'.runtime',{recursive:true,mode:0o700});await writeFile(path,`${code}\n`,{mode:0o600});await chmod(path,0o600);return code}
 async revoke(projectId:string,linkId:string){await this.db.query('UPDATE alva_links SET revoked=true WHERE id=$1 AND project_id=$2',[linkId,projectId])}
 private normalizeProject(project:Project):Project{if(!project.buildingState)project.buildingState={status:'idle',attempts:0,updatedAt:new Date().toISOString()};if(!project.roomLabelPositions)project.roomLabelPositions={};if(!project.zones)project.zones=[];if(!project.scopeRequests)project.scopeRequests=[];if(!project.archivedFurniture)project.archivedFurniture=[];return project}
 async get(id:string):Promise<Project>{const row=(await this.db.query<{state:Project}>('SELECT state FROM alva_projects WHERE id=$1',[id])).rows[0];if(!row)throw new DomainError(404,'项目不存在');return this.normalizeProject(row.state)}
 async versions(id:string){return (await this.db.query<{version:number;summary:string;created_at:string}>('SELECT version,summary,created_at FROM alva_versions WHERE project_id=$1 ORDER BY version DESC',[id])).rows}
 async snapshot(id:string,version:number):Promise<Project>{const row=(await this.db.query<{state:Project}>('SELECT state FROM alva_versions WHERE project_id=$1 AND version=$2',[id,version])).rows[0];if(!row)throw new DomainError(404,'保存版本不存在');return row.state}
 async failure(id:string,operation:string,reason:string){await this.db.query('INSERT INTO alva_failures(id,project_id,operation,reason) VALUES($1,$2,$3,$4)',[randomUUID(),id,operation,reason.slice(0,300)])}
 async setImportState(id:string,state:ImportState){await this.db.query(`UPDATE alva_projects SET state=jsonb_set(state,'{importState}',$2::jsonb,true) WHERE id=$1`,[id,JSON.stringify(state)])}
 async replay(id:string,requestId:string,operation:string,input:unknown):Promise<Project|null>{const row=(await this.db.query<{fingerprint:string}>('SELECT fingerprint FROM alva_commands WHERE project_id=$1 AND request_id=$2',[id,requestId])).rows[0];if(!row)return null;const fingerprint=hash(JSON.stringify({operation,input}));if(row.fingerprint!==fingerprint)throw new DomainError(409,'同一请求ID不能用于不同内容');return this.get(id)}
 async saveReceipt(id:string,requestId:string):Promise<SaveReceipt>{
  // Legacy receipts stored a full Project. Reading only savedVersion keeps
  // already committed saves retryable without migrating historical records.
  const row=(await this.db.query<{version:number;revision:number;created_at:Date|string}>(`SELECT v.version,(v.state->>'revision')::integer AS revision,v.created_at FROM alva_commands c JOIN alva_versions v ON v.project_id=c.project_id AND v.version=(c.response->>'savedVersion')::integer WHERE c.project_id=$1 AND c.request_id=$2`,[id,requestId])).rows[0];
  if(!row)throw new DomainError(404,'该保存请求尚无已提交快照');
  return {requestId,version:row.version,revision:row.revision,createdAt:new Date(row.created_at).toISOString()};
 }
 async mutate(id:string,requestId:string,expectedRevision:number|null,operation:string,input:unknown,fn:(p:Project)=>void|Promise<void>,chatActionId?:string,expectedStage?:Pick<StageChatState,'active'|'generation'>):Promise<Project>{
  const fingerprint=hash(JSON.stringify({operation,input}));
  try{return await this.db.transaction(async tx=>{
   const row=(await tx.query<{state:Project}>('SELECT state FROM alva_projects WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!row)throw new DomainError(404,'项目不存在');
   const p=this.normalizeProject(row.state);
   const prior=(await tx.query<{fingerprint:string}>('SELECT fingerprint FROM alva_commands WHERE project_id=$1 AND request_id=$2',[id,requestId])).rows[0];
   if(prior){if(prior.fingerprint!==fingerprint)throw new DomainError(409,'同一请求ID不能用于不同内容');return p}
   if(expectedStage){
    const stage=(await tx.query<{state:StageChatState}>('SELECT state FROM alva_chat_stages WHERE project_id=$1',[id])).rows[0]?.state||initialChatState(p);
    if(stage.active!==expectedStage.active||stage.generation!==expectedStage.generation)throw new DomainError(409,'阶段已变化，请重新发起请求');
   }
   if(chatActionId){
    const action=(await tx.query<{state:ChatAction}>('SELECT state FROM alva_chat_actions WHERE project_id=$1 AND id=$2',[id,chatActionId])).rows[0]?.state;
    if(!action||action.status!=='pending')throw new DomainError(409,'确认请求已处理或不存在');
    const stage=(await tx.query<{state:StageChatState}>('SELECT state FROM alva_chat_stages WHERE project_id=$1',[id])).rows[0]?.state||initialChatState(p);
    if(stage.active!==action.stage)throw new DomainError(409,'请切回此确认请求所属的阶段');
    if(action.stage==='living'&&!p.confirmedBuilding)throw new DomainError(422,'请先确认建筑');
   }
   if(expectedRevision!==null&&p.revision!==expectedRevision)throw new DomainError(409,'项目已更新，请重新读取后确认');
   const before=JSON.stringify(p);
   await fn(p);p.revision++;
   if(chatActionId)await tx.query("UPDATE alva_chat_actions SET state=state || $3::jsonb WHERE project_id=$1 AND id=$2",[id,chatActionId,JSON.stringify({status:'confirmed',finishedAt:new Date().toISOString()})]);
   if(operation==='save'){
    p.savedVersion++;p.dirty=false;
    const snapshot=snapshotProject(p),summary=`手动全局快照 · ${snapshot.scene?.rooms.length||0} 个空间 · ${snapshot.answers.length} 条需求`;
    await tx.query('INSERT INTO alva_versions(project_id,version,summary,state) VALUES($1,$2,$3,$4)',[id,p.savedVersion,summary,JSON.stringify(snapshot)]);
    // Inject after an actual write, so failure tests exercise transaction rollback.
    if(this.failNextSave){this.failNextSave=false;throw new Error('isolated_save_fault')}
   }else if(JSON.stringify({...p,revision:p.revision-1})!==before)p.dirty=true;
   await tx.query('UPDATE alva_projects SET state=$2 WHERE id=$1',[id,JSON.stringify(p)]);
   const receipt:CommandReceipt={kind:'command-receipt-v1',revision:p.revision,...(operation==='save'?{savedVersion:p.savedVersion}:{})};
   await tx.query('INSERT INTO alva_commands VALUES($1,$2,$3,$4)',[id,requestId,fingerprint,JSON.stringify(receipt)]);return p;
  })}catch(error){try{await this.failure(id,operation,error instanceof DomainError?error.message:'保存或处理失败')}catch{console.error('[alva failure log unavailable]',operation)}throw error}
 }
 async chatActions(projectId:string):Promise<ChatAction[]>{return (await this.db.query<{state:ChatAction}>('SELECT state FROM alva_chat_actions WHERE project_id=$1 ORDER BY id',[projectId])).rows.map(r=>r.state)}
 async putChatAction(action:ChatAction){await this.db.query('INSERT INTO alva_chat_actions(id,project_id,state) VALUES($1,$2,$3)',[action.id,action.projectId,JSON.stringify(action)])}
 async rejectChatAction(projectId:string,id:string){
  await this.db.transaction(async tx=>{
   await tx.query('SELECT id FROM alva_projects WHERE id=$1 FOR UPDATE',[projectId]);
   const action=(await tx.query<{state:ChatAction}>('SELECT state FROM alva_chat_actions WHERE project_id=$1 AND id=$2',[projectId,id])).rows[0]?.state;
   if(!action||action.status!=='pending')throw new DomainError(409,'请求已处理或不存在');
   await tx.query("UPDATE alva_chat_actions SET state=state || $3::jsonb WHERE project_id=$1 AND id=$2",[projectId,id,JSON.stringify({status:'rejected',finishedAt:new Date().toISOString()})]);
  });
 }

 async chatState(id:string):Promise<StageChatState>{
  const project=await this.get(id);
  const row=(await this.db.query<{state:StageChatState}>('SELECT state FROM alva_chat_stages WHERE project_id=$1',[id])).rows[0];
  return row?.state||initialChatState(project);
 }
 async updateChatState(id:string,update:(state:StageChatState,project:Project)=>void):Promise<StageChatState>{
  return this.db.transaction(async tx=>{
   const project=(await tx.query<{state:Project}>('SELECT state FROM alva_projects WHERE id=$1 FOR UPDATE',[id])).rows[0]?.state;
   if(!project)throw new DomainError(404,'项目不存在');
   const state=(await tx.query<{state:StageChatState}>('SELECT state FROM alva_chat_stages WHERE project_id=$1',[id])).rows[0]?.state||initialChatState(project);
   update(state,this.normalizeProject(project));
   await tx.query('INSERT INTO alva_chat_stages(project_id,state) VALUES($1,$2) ON CONFLICT(project_id) DO UPDATE SET state=EXCLUDED.state',[id,JSON.stringify(state)]);
   return state;
  });
 }
 async close(){await this.db.close()}
}
