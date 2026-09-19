import React, {useRef} from 'react';

/** Pointer capture keeps dragging reliable across the embedded scene. */
export function PanelResize({width, onChange, label, max = 720}: {width:number; onChange:(value:number)=>void; label:string; max?:number}) {
  const drag = useRef<{x:number; width:number}|null>(null);
  const clamp = (value:number) => Math.max(330, Math.min(max, value));
  return <div className="panel-resize-handle" role="separator" tabIndex={0}
    aria-orientation="vertical" aria-label={label} aria-valuemin={330} aria-valuemax={max} aria-valuenow={Math.round(width)}
    onPointerDown={event=>{drag.current={x:event.clientX,width:event.currentTarget.parentElement?.getBoundingClientRect().width??width};event.currentTarget.setPointerCapture(event.pointerId);event.preventDefault();}}
    onPointerMove={event=>{if(drag.current)onChange(clamp(drag.current.width+drag.current.x-event.clientX));}}
    onPointerUp={event=>{drag.current=null;event.currentTarget.releasePointerCapture(event.pointerId);}}
    onPointerCancel={()=>{drag.current=null;}} onLostPointerCapture={()=>{drag.current=null;}}
    onKeyDown={event=>{if(event.key==='ArrowLeft'||event.key==='ArrowRight'){event.preventDefault();onChange(clamp(width+(event.key==='ArrowLeft'?24:-24)));}}}
    title="左右拖动调整宽度，也可使用方向键" />;
}
