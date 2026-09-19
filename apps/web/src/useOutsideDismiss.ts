import {useEffect,useRef} from 'react';

export function useOutsideDismiss(open:boolean, inside:string, close:()=>void) {
  const latest=useRef(close);latest.current=close;
  useEffect(()=>{
    if(!open)return;
    const pointer=(event:PointerEvent)=>{const target=event.target as Element;if(!target.closest(inside)&&!target.closest('[role="menu"], [role="dialog"], dialog'))latest.current();};
    const escape=(event:KeyboardEvent)=>{if(event.key==='Escape')latest.current();};
    const blur=()=>{if(document.activeElement?.matches('.scene iframe'))latest.current();};
    document.addEventListener('pointerdown',pointer);document.addEventListener('keydown',escape);window.addEventListener('blur',blur);
    return()=>{document.removeEventListener('pointerdown',pointer);document.removeEventListener('keydown',escape);window.removeEventListener('blur',blur);};
  },[open,inside]);
}
