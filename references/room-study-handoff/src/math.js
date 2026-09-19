'use strict';
const RS=Math; // namespace anchor replaced below
window.RSMath=(()=>{
 const V={
  add:(a,b)=>[a[0]+b[0],a[1]+b[1],a[2]+b[2]],
  sub:(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]],
  scale:(a,s)=>[a[0]*s,a[1]*s,a[2]*s],
  dot:(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2],
  cross:(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]],
  len:a=>Math.hypot(a[0],a[1],a[2]),
  norm:a=>{const l=Math.hypot(a[0],a[1],a[2])||1;return[a[0]/l,a[1]/l,a[2]/l]},
  clamp:(v,a,b)=>Math.max(a,Math.min(b,v)),
  mix:(a,b,t)=>a+(b-a)*t,
 };
 const M={
  id:()=>[1,0,0,0,0,1,0,0,0,0,1,0,0,0,0,1],
  mul:(a,b)=>{const o=new Array(16).fill(0);for(let c=0;c<4;c++)for(let r=0;r<4;r++)for(let k=0;k<4;k++)o[c*4+r]+=a[k*4+r]*b[c*4+k];return o},
  trs:(p=[0,0,0],s=[1,1,1],yaw=0)=>{const c=Math.cos(yaw),q=Math.sin(yaw);return[c*s[0],0,-q*s[0],0,0,s[1],0,0,q*s[2],0,c*s[2],0,p[0],p[1],p[2],1]},
  perspective:(fovy,aspect,n,f)=>{const t=1/Math.tan(fovy/2),nf=1/(n-f);return[t/aspect,0,0,0,0,t,0,0,0,0,(f+n)*nf,-1,0,0,2*f*n*nf,0]},
  ortho:(l,r,b,t,n,f)=>[2/(r-l),0,0,0,0,2/(t-b),0,0,0,0,-2/(f-n),0,-(r+l)/(r-l),-(t+b)/(t-b),-(f+n)/(f-n),1],
  lookAt:(e,t,u=[0,1,0])=>{const z=V.norm(V.sub(e,t)),x=V.norm(V.cross(u,z)),y=V.cross(z,x);return[x[0],y[0],z[0],0,x[1],y[1],z[1],0,x[2],y[2],z[2],0,-V.dot(x,e),-V.dot(y,e),-V.dot(z,e),1]},
 };
 return{V,M};
})();
