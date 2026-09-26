import {furnitureSurface} from './surfaces.js';
import * as THREE from 'three';
import {RoundedBoxGeometry} from 'three/examples/jsm/geometries/RoundedBoxGeometry.js';
import type {FurnitureModelData,FurniturePartData} from '../../../../packages/contracts/alva/furniture-model.js';
import {catalogueFurniture} from './catalogue.js';
import type {ItemData} from '../../../../api/model.js';
function geometry(p:FurniturePartData){
 switch(p.shape){
  case 'roundedBox':return new RoundedBoxGeometry(1,1,1,5,p.radius);
  case 'ellipsoid':return new THREE.SphereGeometry(.5,40,24);
  case 'cylinder':return new THREE.CylinderGeometry(.5,.5,1,48,4);
  case 'torus':return new THREE.TorusGeometry(.36,p.radius,16,64);
  case 'lathe':return new THREE.LatheGeometry(p.profile.map(v=>new THREE.Vector2(...v)),64);
  case 'tube':return new THREE.TubeGeometry(new THREE.CatmullRomCurve3(p.path.map(v=>new THREE.Vector3(...v))),64,p.radius,12,false);
 }
}
export function furnitureAssembly(model:FurnitureModelData){
 const root=new THREE.Group(),textures=new Map<string,THREE.Texture|undefined>();
 for(const p of model.parts){
  const geo=geometry(p);geo.computeBoundingBox();const bounds=geo.boundingBox!,extent=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());geo.translate(-center.x,-center.y,-center.z);geo.scale(p.size[0]/Math.max(extent.x,.0001),p.size[1]/Math.max(extent.y,.0001),p.size[2]/Math.max(extent.z,.0001));
  if(!textures.has(p.material))textures.set(p.material,furnitureSurface(p.material));const surface=textures.get(p.material);
  const mat=new THREE.MeshStandardMaterial({color:p.color,...(surface?{map:surface,bumpMap:surface,bumpScale:p.material==='fabric'?.002:.001}:{}),roughness:p.material==='metal'?.25:p.material==='glass'?.08:p.material==='fabric'?.92:.65,metalness:p.material==='metal'?.8:0,transparent:p.material==='glass',opacity:p.material==='glass'?.35:1});
  const mesh=new THREE.Mesh(geo,mat);mesh.name=p.label;mesh.userData.partId=p.id;mesh.position.fromArray(p.position);mesh.rotation.set(...p.rotation);mesh.castShadow=p.material!=='glass';mesh.receiveShadow=true;root.add(mesh);
 }
 // Authoritative collision dimensions remain unchanged; normalize the assembled visual to its footprint.
 root.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(root),size=bounds.getSize(new THREE.Vector3()),center=bounds.getCenter(new THREE.Vector3());
 const normalized=new THREE.Group(),result=new THREE.Group();root.position.set(-center.x,-bounds.min.y,-center.z);normalized.add(root);normalized.scale.set(1/size.x,1/size.y,1/size.z);result.add(normalized);result.updateMatrixWorld(true);return result;
}
export function furnitureObject(item:ItemData){
 let model=item.visualModel?.model||catalogueFurniture(item.assetId,item.color,item.material);
 if(item.visualModel){const base=item.visualModel.baseAppearance;model={...model,parts:model.parts.map(p=>p.role==='body'?{...p,color:item.color!==base.color?item.color:p.color,material:(item.material!==base.material?item.material:p.material)}:p)}}
 const root=furnitureAssembly(model);root.position.set(item.x,0,item.y);root.rotation.y=-item.rotation*Math.PI/180;root.scale.set(item.width,item.height,item.depth);root.userData={id:item.id,topologyId:item.id,kind:'furniture'};
 root.traverse(o=>{o.userData.id=item.id;o.userData.topologyId=item.id;o.userData.kind='furniture'});return root;
}
export function furnitureStats(root:THREE.Object3D){let triangles=0,meshes=0;root.traverse(o=>{if(o instanceof THREE.Mesh){meshes++;triangles+=(o.geometry.index?.count||o.geometry.attributes.position.count)/3}});return {meshes,triangles}}
export function disposeFurniture(root:THREE.Object3D){const geometries=new Set<THREE.BufferGeometry>(),materials=new Set<THREE.Material>(),textures=new Set<THREE.Texture>();root.traverse(o=>{if(o instanceof THREE.Mesh||o instanceof THREE.LineSegments){geometries.add(o.geometry);for(const m of Array.isArray(o.material)?o.material:[o.material])materials.add(m)}});for(const m of materials){for(const key of ['map','bumpMap','normalMap','roughnessMap'] as const){const t=(m as THREE.MeshStandardMaterial)[key];if(t)textures.add(t)}m.dispose()}for(const g of geometries)g.dispose();for(const t of textures)t.dispose()}
