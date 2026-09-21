import React,{useEffect,useRef} from 'react';
import * as THREE from 'three';
import {OrbitControls} from 'three/examples/jsm/controls/OrbitControls.js';
import type {BuildingSceneData} from '../../api/building/types.js';

export function BuildingView({building}:{building:BuildingSceneData}){
 const root=useRef<HTMLDivElement>(null);
 useEffect(()=>{
  const host=root.current!;const world=new THREE.Scene();world.background=new THREE.Color('#e7e5da');
  const renderer=new THREE.WebGLRenderer({antialias:true,preserveDrawingBuffer:true});renderer.setPixelRatio(Math.min(devicePixelRatio,2));renderer.shadowMap.enabled=true;host.appendChild(renderer.domElement);renderer.domElement.setAttribute('aria-label','Codex建筑三维场景');
  const camera=new THREE.PerspectiveCamera(45,1,.05,200);camera.position.set(building.camera.position.x,building.camera.position.y,building.camera.position.z);const controls=new OrbitControls(camera,renderer.domElement);controls.target.set(building.camera.target.x,building.camera.target.y,building.camera.target.z);controls.enableDamping=true;
  world.add(new THREE.HemisphereLight('#fff9e8','#6f7168',2));const sun=new THREE.DirectionalLight('#fff0ca',3);sun.position.set(12,18,10);sun.castShadow=true;world.add(sun);
  const selectable:THREE.Object3D[]=[];
  for(const component of building.components){const material=new THREE.MeshStandardMaterial({color:component.color,roughness:component.material==='glass'?.1:.75,metalness:component.material==='metal'?.65:0,transparent:component.material==='glass',opacity:component.material==='glass'?.38:1});const mesh=new THREE.Mesh(new THREE.BoxGeometry(component.size.x,component.size.y,component.size.z),material);mesh.position.set(component.position.x,component.position.y,component.position.z);mesh.rotation.y=-component.rotation;mesh.castShadow=component.kind!=='floor';mesh.receiveShadow=true;mesh.userData={id:component.id,topologyId:component.topologyId,kind:component.kind};world.add(mesh);selectable.push(mesh)}
  const resize=()=>{const rect=host.getBoundingClientRect();renderer.setSize(rect.width,rect.height);camera.aspect=rect.width/Math.max(rect.height,1);camera.updateProjectionMatrix()};const observer=new ResizeObserver(resize);observer.observe(host);resize();
  const ray=new THREE.Raycaster(),pointer=new THREE.Vector2();const click=(event:PointerEvent)=>{const rect=renderer.domElement.getBoundingClientRect();pointer.set((event.clientX-rect.left)/rect.width*2-1,-(event.clientY-rect.top)/rect.height*2+1);ray.setFromCamera(pointer,camera);const hit=ray.intersectObjects(selectable,false)[0];if(hit)renderer.domElement.dispatchEvent(new CustomEvent('building-select',{detail:hit.object.userData}))};renderer.domElement.addEventListener('pointerup',click);
  let frame=0;const animate=()=>{controls.update();renderer.render(world,camera);frame=requestAnimationFrame(animate)};frame=requestAnimationFrame(animate);
  return()=>{cancelAnimationFrame(frame);observer.disconnect();controls.dispose();renderer.domElement.removeEventListener('pointerup',click);world.traverse(object=>{if(object instanceof THREE.Mesh){object.geometry.dispose();object.material.dispose()}});renderer.dispose();host.removeChild(renderer.domElement)};
 },[building]);
 return <div className="scene-host" ref={root} data-testid="building-view"/>;
}
