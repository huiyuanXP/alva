import * as THREE from 'three';
/** Original procedural surface relief, shared by every part using the same material in an assembly. */
export function furnitureSurface(kind:string){
 if(!['wood','fabric','metal','leaf'].includes(kind))return undefined;
 const size=128,data=new Uint8Array(size*size*4);
 for(let y=0;y<size;y++)for(let x=0;x<size;x++){
  const grain=Math.sin(x*.43+Math.sin(y*.028)*2+Math.sin(y*.13)*.3),fine=Math.sin(x*2.13+y*.021),weave=((x%4<2?1:-1)+(y%4<2?1:-1))*.5;
  const value=kind==='wood'?.89+grain*.055+fine*.025:kind==='fabric'?.9+weave*.07:kind==='leaf'?.9+.06*Math.cos(x*.13+y*.6):.96+fine*.015;
  const i=(y*size+x)*4,c=Math.round(value*255);data[i]=data[i+1]=data[i+2]=c;data[i+3]=255;
 }
 const texture=new THREE.DataTexture(data,size,size,THREE.RGBAFormat);texture.wrapS=texture.wrapT=THREE.RepeatWrapping;texture.magFilter=THREE.LinearFilter;texture.minFilter=THREE.LinearMipmapLinearFilter;texture.generateMipmaps=true;texture.needsUpdate=true;return texture;
}
