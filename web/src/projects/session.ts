let projectId='';
export function bindProject(id:string){projectId=id;}
/** Bind every page request to the project displayed in this tab. */
export function projectFetch(input:RequestInfo|URL,init?:RequestInit){
 const headers=new Headers(init?.headers);if(projectId)headers.set('X-Alva-Project',projectId);
 return globalThis.fetch(input,{...init,headers});
}
