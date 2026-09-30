import {createHash} from 'node:crypto';
import {z} from 'zod';
import type {AlvaStore,Session} from '../store.js';
import {DomainError,emptyProject} from '../model.js';

export {ProjectNavigation} from '../../packages/contracts/alva/projects.js';
import {ProjectNavigation} from '../../packages/contracts/alva/projects.js';
export const NavigationCommand=z.object({requestId:z.string().uuid(),expectedProjectId:z.string().uuid(),navigation:ProjectNavigation}).strict();
const hash=(value:string)=>createHash('sha256').update(value).digest('hex');
function missingProject(){return Object.assign(new DomainError(404,'目标项目不存在或无权访问，请刷新项目列表'),{detail:{code:'PROJECT_NOT_FOUND',message:'目标项目不存在或无权访问，请刷新项目列表',retryable:false,repairActions:[{action:'list_projects',message:'重新读取项目列表，从列表中选择目标项目'}]}})}
export function requireOwner(session:Session){if(session.role!=='owner'||session.linkId)throw new DomainError(403,'仅业主可以新建或切换项目');}
export async function listProjects(store:AlvaStore,session:Session){
 requireOwner(session);
 return (await store.db.query<{id:string;name:string;createdAt:string;savedVersion:number;stage:string}>(`SELECT p.id,p.state->>'name' AS name,p.state->>'createdAt' AS "createdAt",(p.state->>'savedVersion')::int AS "savedVersion",CASE WHEN p.state->'confirmedTopology' IS NOT NULL AND p.state->'confirmedTopology'<>'null'::jsonb AND p.state->'scene' IS NOT NULL AND p.state->'scene'<>'null'::jsonb AND (p.state->'candidate' IS NULL OR p.state->'candidate'='null'::jsonb) THEN 'living' ELSE 'floorplan' END AS stage FROM alva_projects p JOIN alva_owner_projects a ON a.project_id=p.id ORDER BY p.state->>'createdAt' DESC,p.id`)).rows;
}
export async function prepareNavigation(store:AlvaStore,session:Session,value:unknown){
 requireOwner(session);const navigation=ProjectNavigation.parse(value);
 if(navigation.mode==='switch'&&!(await listProjects(store,session)).some(p=>p.id===navigation.targetProjectId))throw missingProject();
 return navigation;
}
/** Atomic, per-device navigation. Repeated requests return the same project. */
export async function navigateProject(store:AlvaStore,token:string,session:Session,value:unknown){
 requireOwner(session);const command=NavigationCommand.parse(value);
 return store.db.transaction(async tx=>{
  const live=(await tx.query<{project_id:string}>(`SELECT s.project_id FROM alva_sessions s JOIN alva_access_config c ON c.generation=s.auth_generation WHERE s.token_hash=$1 AND s.role='owner' AND s.link_id IS NULL AND s.expires_at>now() FOR UPDATE OF s`,[hash(token)])).rows[0];
  if(!live)throw new DomainError(401,'会话已过期，请重新登录');
  const fingerprint=JSON.stringify(command),prior=(await tx.query<{fingerprint:string;target_project_id:string}>('SELECT fingerprint,target_project_id FROM alva_project_navigation WHERE session_hash=$1 AND request_id=$2',[hash(token),command.requestId])).rows[0];
  if(prior){if(prior.fingerprint!==fingerprint)throw new DomainError(409,'请求编号已被其他操作使用');if(live.project_id!==prior.target_project_id)throw new DomainError(409,'已切换至其他项目，请刷新页面');return {projectId:prior.target_project_id};}
  if(live.project_id!==command.expectedProjectId)throw new DomainError(409,'当前项目已在其他标签页切换，请刷新页面');
  let target:string;
  if(command.navigation.mode==='create'){
   const p=emptyProject(command.navigation.name);target=p.id;
   await tx.query('INSERT INTO alva_projects VALUES($1,$2)',[p.id,JSON.stringify(p)]);
   await tx.query('INSERT INTO alva_owner_projects VALUES($1)',[p.id]);
  }else{
   target=command.navigation.targetProjectId;
   if(!(await tx.query('SELECT project_id FROM alva_owner_projects WHERE project_id=$1',[target])).rows.length)throw missingProject();
  }
  await tx.query('UPDATE alva_sessions SET project_id=$1 WHERE token_hash=$2',[target,hash(token)]);
  await tx.query('INSERT INTO alva_project_navigation VALUES($1,$2,$3,$4)',[hash(token),command.requestId,fingerprint,target]);
  return {projectId:target};
 });
}
