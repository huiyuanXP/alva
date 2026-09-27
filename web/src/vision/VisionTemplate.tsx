import React,{useEffect,useRef} from 'react';
import '../intake/vision.css';
import './vision-template.css';
export function VisionShell({children}:{children:React.ReactNode}){return <div className="hv-shell">{children}</div>}
export function VisionChoiceButton({selected,className='',children,...props}:React.ButtonHTMLAttributes<HTMLButtonElement>&{selected:boolean}){return <button type="button" {...props} className={'hv-opt '+(selected?'on ':'')+className}>{children}</button>}
/** Shared Home / Room Vision surface. Business decisions remain in their callers. */
export function VisionTemplate({children,title='Your Home Vision',className='',modal=false,onDismiss}:{children:React.ReactNode;title?:string;className?:string;modal?:boolean;onDismiss?:()=>void}){
 const ref=useRef<HTMLDialogElement>(null);
 useEffect(()=>{if(modal&&!ref.current?.open)ref.current?.showModal()},[modal]);
 const content=<VisionShell><span className="hv-stage">{title}</span>{children}</VisionShell>;
 return modal?<dialog ref={ref} className={'hv-dialog vision-template vision-popup '+className} aria-label={title} onCancel={e=>{e.preventDefault();onDismiss?.()}}>{content}</dialog>:<section className={'hv-dialog vision-template '+className} aria-label={title}>{content}</section>;
}
export function VisionOption({selected,children,onClick,disabled=false,icon}:{selected:boolean;children:React.ReactNode;onClick:()=>void;disabled?:boolean;icon?:React.ReactNode}){
 return <VisionChoiceButton selected={selected} aria-pressed={selected} disabled={disabled} onClick={onClick}>{icon&&<span className="hv-icon">{icon}</span>}<span className="hv-opt-label">{children}</span><span className="hv-check" aria-hidden="true">{selected?'✓':''}</span></VisionChoiceButton>;
}

export function VisionToggle({selected,onChange,disabled=false,children,testId}:{selected:boolean;onChange?:(checked:boolean)=>void;disabled?:boolean;children:React.ReactNode;testId?:string}){
 return <label className={'hv-opt vision-toggle '+(selected?'on':'')} data-testid={testId}><span className="hv-opt-label">{children}</span><input type="checkbox" checked={selected} disabled={disabled} onChange={e=>onChange?.(e.target.checked)}/></label>;
}
