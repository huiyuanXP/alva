import React,{useEffect,useState} from 'react';

type Invite={id:string;role:'designer';revoked:boolean;active_sessions:number};
async function call(path:string,body?:unknown){const response=await fetch('/api'+path,{method:body===undefined?'GET':'POST',headers:{'Content-Type':'application/json'},...(body===undefined?{}:{body:JSON.stringify(body)})});const data=await response.json();if(!response.ok)throw new Error(data.error||'请求失败');return data}
export function DesignerAccessPanel({readOnly}:{readOnly:boolean}){
 const [invites,setInvites]=useState<Invite[]>([]),[newLink,setNewLink]=useState(''),[busy,setBusy]=useState(false),[error,setError]=useState('');
 const load=async()=>{if(readOnly)return;try{const data=await call('/invites');setInvites(data.invites||[])}catch(e){setError((e as Error).message)}};
 useEffect(()=>{void load()},[readOnly]);
 if(readOnly)return <section className="designer-access-panel"><h3>设计师只读访问</h3><p>你正在通过只读授权查看这个项目。可以查看当前项目内容，但不能编辑、采用方案、保存或恢复版本。</p></section>;
 const create=async()=>{setBusy(true);setError('');try{const r=await call('/invites',{});setNewLink(`${location.origin}/#access=${r.token}`);await load()}catch(e){setError((e as Error).message)}finally{setBusy(false)}};
 const revoke=async(id:string)=>{setBusy(true);setError('');try{await call(`/invites/${id}/revoke`,{});await load()}catch(e){setError((e as Error).message)}finally{setBusy(false)}};
 return <section className="designer-access-panel"><h3>设计师只读访问</h3><p>设计师仍需输入与你相同的统一验证码。邀请只增加当前项目的只读角色，不会升级为业主权限。</p><button disabled={busy} onClick={()=>void create()}>生成新的只读邀请</button>{newLink&&<div className="designer-access-link"><label>新邀请链接<textarea readOnly value={newLink}/></label><button onClick={()=>void navigator.clipboard.writeText(newLink)}>复制链接</button><small>邀请 token 只在生成时显示；之后可在下方撤销。</small></div>}{error&&<p className="error" role="alert">{error}</p>}<div className="designer-access-list">{invites.length===0?<small>还没有设计师只读邀请。</small>:invites.map(invite=><article key={invite.id}><div><b>只读邀请 · {invite.id.slice(0,8)}</b><small>{invite.revoked?'已撤销':`有效 · ${invite.active_sessions} 个活跃会话`}</small></div><button disabled={busy||invite.revoked} onClick={()=>void revoke(invite.id)}>{invite.revoked?'已撤销':'撤销访问'}</button></article>)}</div></section>
}
