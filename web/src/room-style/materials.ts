import * as THREE from 'three';
import type {SurfaceStyle} from '../../../packages/contracts/alva/room-style.js';
import {surfaceRoughness} from './surfaces.js';
export function styledMaterial(base:THREE.MeshStandardMaterial,style?:SurfaceStyle){const material=base.clone();if(style){material.color.set(style.color);material.roughness=surfaceRoughness(style);material.userData.surfaceStyle=style}return material}
export function applyWallMaterials(mesh:THREE.Mesh,styles:(SurfaceStyle|undefined)[]){
 if(!styles.some(Boolean))return;
 const original=mesh.material as THREE.MeshStandardMaterial;
 mesh.material=Array.from({length:6},(_,i)=>styledMaterial(original,i===4?styles[0]:i===5?styles[1]:undefined));original.dispose();
}
