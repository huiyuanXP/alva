import React,{useEffect,useState} from 'react';
import type {SceneData} from '../../../../api/model.js';
import {canWalkAt,movementVector,roomWalkStart} from './collision.js';

type View={camera:any;controls?:{enabled:boolean;target?:{set:(x:number,y:number,z:number)=>void};update?:()=>void};renderer:{domElement:HTMLCanvasElement}};
const editable=(target:EventTarget|null)=>target instanceof HTMLElement&&!!target.closest('input,textarea,select,[contenteditable=true]');

export function WalkthroughController({active,scene,focusRoom}:{active:boolean;scene:SceneData;focusRoom:string}){
 const [locked,setLocked]=useState(false);
 useEffect(()=>{
  if(!active)return;
  let stopped=false,watchFrame=0,detach=()=>{};
  const attach=()=>{
   if(stopped)return;
   const host=document.querySelector<HTMLElement>('[data-testid="building-canvas"]'),view=(host as any)?.alvaView as View|undefined;
   if(!host||!view){watchFrame=requestAnimationFrame(attach);return}
   const canvas=view.renderer.domElement,keys=new Set<string>();let yaw=0,pitch=0,moveFrame=0,last=performance.now(),activeView=view;
   const currentView=()=>((document.querySelector('[data-testid="building-canvas"]') as any)?.alvaView as View|undefined)||activeView;
   const orient=(v:View)=>{const c=v.camera,cp=Math.cos(pitch),fx=-Math.sin(yaw)*cp,fy=Math.sin(pitch),fz=-Math.cos(yaw)*cp;c.rotation.order='YXZ';if(v.controls?.target){v.controls.enabled=false;v.controls.target.set(c.position.x+fx,c.position.y+fy,c.position.z+fz);v.controls.update?.()}else c.rotation.set(pitch,yaw,0,'YXZ')};
   const place=(v:View)=>{const start=roomWalkStart(scene,focusRoom);v.camera.position.set(start.x,1.62,start.z);orient(v)};
   place(view);
   const clear=()=>keys.clear();const pause=()=>{clear();setLocked(false);if(document.pointerLockElement)document.exitPointerLock()};
   const down=(e:KeyboardEvent)=>{if(e.key==='Escape'){pause();return}if(editable(e.target)){clear();return}const k=e.key.toLowerCase();if(['w','a','s','d','arrowup','arrowdown','arrowleft','arrowright'].includes(k)){e.preventDefault();keys.add(k)}};
   const up=(e:KeyboardEvent)=>keys.delete(e.key.toLowerCase());
   const mouse=(e:MouseEvent)=>{const v=currentView();if(document.pointerLockElement!==v.renderer.domElement||editable(document.activeElement))return;yaw-=e.movementX*.002;pitch=Math.max(-1.25,Math.min(1.25,pitch-e.movementY*.002));orient(v)};
   const lock=()=>{const yes=document.pointerLockElement===currentView().renderer.domElement;setLocked(yes);if(!yes)clear()};const focus=()=>{if(editable(document.activeElement))clear()};const blur=()=>pause();
   const swallowPick=(e:PointerEvent)=>e.stopImmediatePropagation();const click=()=>{const v=currentView();if(!editable(document.activeElement))void v.renderer.domElement.requestPointerLock()};
   canvas.addEventListener('pointerup',swallowPick,true);canvas.addEventListener('click',click);window.addEventListener('keydown',down);window.addEventListener('keyup',up);window.addEventListener('mousemove',mouse);window.addEventListener('blur',blur);document.addEventListener('focusin',focus);document.addEventListener('pointerlockchange',lock);
   const tick=(now:number)=>{const dt=Math.min((now-last)/1000,.04);last=now;const v=currentView();if(v!==activeView){activeView=v;place(v)}const c=v.camera;if(v.controls)v.controls.enabled=false;if(document.pointerLockElement===v.renderer.domElement&&!editable(document.activeElement)){const delta=movementVector(keys,yaw,2,dt),x=c.position.x+delta.dx,z=c.position.z+delta.dz;if(canWalkAt(scene,{x,z:c.position.z}))c.position.x=x;if(canWalkAt(scene,{x:c.position.x,z}))c.position.z=z}orient(v);moveFrame=requestAnimationFrame(tick)};moveFrame=requestAnimationFrame(tick);
   (host as any).alvaWalk={keys,canWalkAt:(x:number,z:number)=>canWalkAt(scene,{x,z}),pause,isLocked:()=>document.pointerLockElement===currentView().renderer.domElement};
   detach=()=>{cancelAnimationFrame(moveFrame);pause();canvas.removeEventListener('pointerup',swallowPick,true);canvas.removeEventListener('click',click);window.removeEventListener('keydown',down);window.removeEventListener('keyup',up);window.removeEventListener('mousemove',mouse);window.removeEventListener('blur',blur);document.removeEventListener('focusin',focus);document.removeEventListener('pointerlockchange',lock);if(view.controls)view.controls.enabled=true;if((host as any).alvaWalk)delete (host as any).alvaWalk};
   const watch=()=>{if(stopped)return;const currentHost=document.querySelector<HTMLElement>('[data-testid="building-canvas"]'),currentView=(currentHost as any)?.alvaView as View|undefined;if(currentHost!==host||(currentView&&currentView!==view)){detach();attach();return}watchFrame=requestAnimationFrame(watch)};watchFrame=requestAnimationFrame(watch);
  };
  attach();return()=>{stopped=true;cancelAnimationFrame(watchFrame);detach()}
 },[active,scene,focusRoom]);
 if(!active)return null;
 return <div className="walkthrough-status" role="status" data-testid="walkthrough-status"><b>{locked?'漫游中':'漫游已暂停'}</b><span>{locked?'WASD / 方向键移动 · 鼠标环顾 · Esc 暂停':'点击场景继续；输入框、Esc 或窗口失焦会立即停止移动'}</span></div>
}
