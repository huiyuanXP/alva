import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
import {furnitureAssembly,furnitureStats,disposeFurniture} from './geometry.js';
import {validateFurnitureModel,type FurnitureModelData} from '../../../../packages/contracts/alva/furniture-model.js';
/** Internal blank render surface. The server supplies only its current validated candidate. */
export function FurnitureStudio(){
 const host=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setSize(800,800);renderer.setPixelRatio(1);renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.toneMapping=THREE.ACESFilmicToneMapping;renderer.shadowMap.enabled=true;renderer.shadowMap.type=THREE.PCFSoftShadowMap;host.current!.appendChild(renderer.domElement);
  const render=(raw:FurnitureModelData,dimensions:{width:number;height:number;depth:number})=>{
   const model=validateFurnitureModel(raw),world=new THREE.Scene();world.background=new THREE.Color('#e7e9ed');const object=furnitureAssembly(model);object.scale.set(dimensions.width,dimensions.height,dimensions.depth);world.add(object);world.add(new THREE.HemisphereLight('#fff8ed','#8b9cad',2));
   const light=new THREE.DirectionalLight('#fff6e8',3);light.position.set(4,7,5);world.add(light);const fill=new THREE.DirectionalLight('#e5efff',1.5);fill.position.set(-4,3,-4);world.add(fill);
   world.updateMatrixWorld(true);const bounds=new THREE.Box3().setFromObject(object),center=bounds.getCenter(new THREE.Vector3()),radius=bounds.getBoundingSphere(new THREE.Sphere()).radius;const camera=new THREE.PerspectiveCamera(35,1,.01,100);const distance=radius/Math.sin(35*Math.PI/360)*1.16;
   const images:string[]=[];for(const direction of [new THREE.Vector3(1,.65,1),new THREE.Vector3(-1,.55,-1),new THREE.Vector3(.1,.25,1)]){camera.position.copy(center).add(direction.normalize().multiplyScalar(distance));camera.lookAt(center);camera.updateMatrixWorld(true);renderer.render(world,camera);images.push(renderer.domElement.toDataURL('image/png'))}
   const stats=furnitureStats(object);disposeFurniture(object);return {images,stats,views:['front-right','back-left','front-detail'],bounds:{min:bounds.min.toArray(),max:bounds.max.toArray()}};
  };
  (window as any).alvaFurnitureRender=render;return()=>{delete (window as any).alvaFurnitureRender;renderer.dispose();renderer.forceContextLoss();renderer.domElement.remove()};
 },[]);
 return <div ref={host} data-testid="furniture-studio" style={{width:800,height:800}}/>;
}
