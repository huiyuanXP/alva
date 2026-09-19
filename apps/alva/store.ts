import {PGlite} from '@electric-sql/pglite';
import {createHash,randomBytes,randomUUID} from 'node:crypto';
import {emptyProject,DomainError,type Project} from './model.js';
export type Role='owner'|'designer'|'professional';
export type Session={projectId:string;role:Role;linkId:string};
const hash=(text:string)=>createHash('sha256').update(text).digest('hex');
export class AlvaStore{
 db:PGlite;failNextSave=false;
 constructor(path?:string){this.db=new PGlite(path)}
 async init(){await this.db.exec(`CREATE TABLE IF NOT EXISTS alva_projects(id text PRIMARY KEY,state jsonb NOT NULL);
 CREATE TABLE IF NOT EXISTS alva_links(id text PRIMARY KEY,project_id text NOT NULL,token_hash text UNIQUE NOT NULL,role text NOT NULL,revoked boolean NOT NULL DEFAULT false);
 CREATE TABLE IF NOT EXISTS alva_sessions(token_hash text PRIMARY KEY,link_id text NOT NULL,expires_at timestamptz NOT NULL);
 CREATE TABLE IF NOT EXISTS alva_commands(project_id text NOT NULL,request_id text NOT NULL,fingerprint text NOT NULL,response jsonb NOT NULL,PRIMARY KEY(project_id,request_id));
 CREATE TABLE IF NOT EXISTS alva_versions(project_id text NOT NULL,version integer NOT NULL,summary text NOT NULL,state jsonb NOT NULL,created_at timestamptz NOT NULL DEFAULT now(),PRIMARY KEY(project_id,version));
 CREATE TABLE IF NOT EXISTS alva_failures(id text PRIMARY KEY,project_id text,operation text NOT NULL,reason text NOT NULL,created_at timestamptz NOT NULL DEFAULT now());`)}
 async create(name:string){const p=emptyProject(name);await this.db.query('INSERT INTO alva_projects VALUES($1,$2)',[p.id,JSON.stringify(p)]);return {project:p,...await this.invite(p.id,'owner')}}
 async invite(projectId:string,role:Role){const token=randomBytes(32).toString('base64url'),id=randomUUID();await this.db.query('INSERT INTO alva_links(id,project_id,token_hash,role) VALUES($1,$2,$3,$4)',[id,projectId,hash(token),role]);return {token,linkId:id}}
 async exchange(token:string){const link=(await this.db.query<{id:string;project_id:string;role:Role}>('SELECT id,project_id,role FROM alva_links WHERE token_hash=$1 AND revoked=false',[hash(token)])).rows[0];if(!link)throw new DomainError(401,'链接无效或已撤销');const session=randomBytes(32).toString('base64url');await this.db.query("INSERT INTO alva_sessions VALUES($1,$2,now()+interval '7 days')",[hash(session),link.id]);return {token:session,projectId:link.project_id,role:link.role}}
 async session(token:string):Promise<Session>{const row=(await this.db.query<{project_id:string;role:Role;id:string}>(`SELECT l.project_id,l.role,l.id FROM alva_sessions s JOIN alva_links l ON l.id=s.link_id WHERE s.token_hash=$1 AND s.expires_at>now() AND l.revoked=false`,[hash(token)])).rows[0];if(!row)throw new DomainError(401,'会话已过期或链接已撤销');return {projectId:row.project_id,role:row.role,linkId:row.id}}
 async revoke(projectId:string,linkId:string){await this.db.query('UPDATE alva_links SET revoked=true WHERE id=$1 AND project_id=$2',[linkId,projectId])}
 async get(id:string):Promise<Project>{const row=(await this.db.query<{state:Project}>('SELECT state FROM alva_projects WHERE id=$1',[id])).rows[0];if(!row)throw new DomainError(404,'项目不存在');return row.state}
 async versions(id:string){return (await this.db.query<{version:number;summary:string;created_at:string}>('SELECT version,summary,created_at FROM alva_versions WHERE project_id=$1 ORDER BY version DESC',[id])).rows}
 async snapshot(id:string,version:number):Promise<Project>{const row=(await this.db.query<{state:Project}>('SELECT state FROM alva_versions WHERE project_id=$1 AND version=$2',[id,version])).rows[0];if(!row)throw new DomainError(404,'保存版本不存在');return row.state}
 async failure(id:string,operation:string,reason:string){await this.db.query('INSERT INTO alva_failures(id,project_id,operation,reason) VALUES($1,$2,$3,$4)',[randomUUID(),id,operation,reason.slice(0,300)])}
 async mutate(id:string,requestId:string,expectedRevision:number|null,operation:string,input:unknown,fn:(p:Project)=>void|Promise<void>):Promise<Project>{
  const fingerprint=hash(JSON.stringify({operation,input}));
  try{return await this.db.transaction(async tx=>{
   const prior=(await tx.query<{fingerprint:string;response:Project}>('SELECT fingerprint,response FROM alva_commands WHERE project_id=$1 AND request_id=$2',[id,requestId])).rows[0];
   if(prior){if(prior.fingerprint!==fingerprint)throw new DomainError(409,'同一请求ID不能用于不同内容');return prior.response}
   const row=(await tx.query<{state:Project}>('SELECT state FROM alva_projects WHERE id=$1 FOR UPDATE',[id])).rows[0];if(!row)throw new DomainError(404,'项目不存在');
   const p=row.state;if(expectedRevision!==null&&p.revision!==expectedRevision)throw new DomainError(409,'项目已更新，请重新读取后确认');
   await fn(p);p.revision++;
   if(operation==='save'){
    if(this.failNextSave){this.failNextSave=false;throw new Error('isolated_save_fault')}
    p.savedVersion++;p.dirty=false;
    const summary=Array.from(p.changes.at(-1)?.description||'保存当前房屋需求与方案').slice(0,49).join('');
    await tx.query('INSERT INTO alva_versions(project_id,version,summary,state) VALUES($1,$2,$3,$4)',[id,p.savedVersion,summary,JSON.stringify(p)]);
   }
   await tx.query('UPDATE alva_projects SET state=$2 WHERE id=$1',[id,JSON.stringify(p)]);
   await tx.query('INSERT INTO alva_commands VALUES($1,$2,$3,$4)',[id,requestId,fingerprint,JSON.stringify(p)]);return p;
  })}catch(error){await this.failure(id,operation,error instanceof DomainError?error.message:'保存或处理失败');throw error}
 }
 async close(){await this.db.close()}
}
