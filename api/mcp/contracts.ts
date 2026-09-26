/** Server-owned bindings; none of these permissions come from model arguments. */
export type ChatStage='floorplan'|'living';
export type McpBinding={projectId:string;role:'owner'|'designer'|'professional';stage:ChatStage};
export type RepairAction={action:string;message:string};
export type McpFailure={code:string;message:string;retryable:boolean;repairActions:RepairAction[];currentRevision?:number;confirmationRequired?:boolean};
export type McpResult={isError?:boolean;content:{type:'text';text:string}[];structuredContent:Record<string,unknown>};
export class McpError extends Error{
 constructor(public detail:McpFailure){super(detail.message)}
}
export function mcpFailure(error:unknown,revision?:number):McpResult{
 const e=error as {statusCode?:number;name?:string;message?:string;issues?:{path?:unknown[];message?:string}[]};
 const coded=error as Partial<McpFailure>&{detail?:Partial<McpFailure>};
 const candidate=error instanceof McpError?error.detail:coded?.detail||coded;
 const explicit=candidate&&typeof candidate.code==='string'&&typeof candidate.message==='string'&&typeof candidate.retryable==='boolean'&&Array.isArray(candidate.repairActions)&&candidate.repairActions.every(a=>a&&typeof a.action==='string'&&typeof a.message==='string')?candidate as McpFailure:undefined;
 const status=e?.statusCode;const argumentDetail=e?.name==='ZodError'&&Array.isArray(e.issues)?e.issues.slice(0,5).map(issue=>`${(issue.path||[]).join('.')||'参数'}: ${(issue.message||'格式无效').slice(0,240)}`).join('；'):'';
 const code=e?.name==='AbortError'?'CANCELLED':status===409?'REVISION_CONFLICT':status===401?'AUTH_EXPIRED':status===403?'FORBIDDEN':e?.name==='ZodError'||status===400?'INVALID_ARGUMENTS':status===422?'BUSINESS_RULE_REJECTED':'TOOL_FAILED';
 const detail:McpFailure=explicit||{code,message:status&&status<500?e.message||'操作被拒绝':code==='INVALID_ARGUMENTS'?'工具参数无效，请按当前工具schema修正：'+argumentDetail:code==='CANCELLED'?'操作已取消':'工具处理失败，请重读项目状态后重试',retryable:code==='TOOL_FAILED',repairActions:[{action:status===409?'reload_project':status===401?'login':status===403?'check_access':'review_input',message:status===409?'重新读取项目，核对变化后再提交':status===401?'请重新登录后发起操作':status===403?'请使用有权访问此项目的入口':code==='INVALID_ARGUMENTS'?'按错误中的字段路径修正参数，并读取现役工具输入结构；参数错误不代表工具未接入':'请核对输入与最新项目状态；需要确认时由用户明确确认'}]};
 const body={...detail,...(revision===undefined?{}:{currentRevision:revision})};
 return {isError:true,content:[{type:'text',text:JSON.stringify(body)}],structuredContent:{error:body}};
}
export function mcpSuccess(value:unknown):McpResult{
 const structuredContent=value&&typeof value==='object'&&!Array.isArray(value)?value as Record<string,unknown>:{result:value};
 return {content:[{type:'text',text:JSON.stringify(value??null)}],structuredContent};
}
