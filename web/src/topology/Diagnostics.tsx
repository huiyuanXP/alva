import {useEffect,useState} from 'react';
import type {Project,SceneData} from '../../../api/model.js';
import type {TopologyDiagnosticsResponse,TopologyWarning,TopologyWarningCode} from '../../../packages/contracts/alva/topology-diagnostics.js';
import './diagnostics.css';

const labels:Record<TopologyWarningCode,string>={internal_void:'内部空洞',unreasonable_skew:'不合理倾斜',isolated_component:'孤立墙体 / 门窗',invalid_opening:'门窗关联异常',open_boundary:'未连接端点',invalid_geometry:'无效几何'};
const stateLabel={complete:'已检查',partial:'部分完成',unavailable:'未能完成'};

export function useTopologyDiagnostics(project:Project|null){
 const [report,setReport]=useState<TopologyDiagnosticsResponse|null>(null),[error,setError]=useState(''),[loading,setLoading]=useState(false),[nonce,setNonce]=useState(0);
 const hasScene=!!(project?.candidate||project?.scene);
 useEffect(()=>{
  setReport(null);setError('');
  if(!project||!hasScene){setLoading(false);return}
  const controller=new AbortController();setLoading(true);
  void (async()=>{
   try{
    const response=await fetch('/api/topology/diagnostics',{credentials:'same-origin',cache:'no-store',signal:controller.signal});
    if(!response.ok)throw new Error('拓扑检查未完成，请重试。');
    const data=await response.json() as TopologyDiagnosticsResponse;
    if(data.projectId!==project.id||data.revision!==project.revision)throw new Error('项目版本已变化，请刷新工作稿后重新检查。');
    if(!controller.signal.aborted)setReport(data);
   }catch(e){if(!controller.signal.aborted)setError(e instanceof Error?e.message:'拓扑检查未完成。')}
   finally{if(!controller.signal.aborted)setLoading(false)}
  })();
  return ()=>controller.abort();
 },[project?.id,project?.revision,hasScene,nonce]);
 return {report,error,loading,retry:()=>setNonce(n=>n+1)};
}

export function TopologyWarnings({state,selected,onLocate,onReset}:{state:ReturnType<typeof useTopologyDiagnostics>;selected:string;onLocate:(issue:TopologyWarning)=>void;onReset:()=>void}){
 const {report,error,loading,retry}=state;
 return <section className="topology-diagnostics" aria-label="拓扑质量检查">
  <span className="eyebrow">平面核对</span><h3>核对墙、门窗与空间。</h3>
  {loading&&<p role="status">正在检查当前拓扑…</p>}
  {error&&<div role="alert"><p>{error}</p><button onClick={retry}>重新检查拓扑</button></div>}
  {report&&<>
   <p className="diagnostic-source">{report.source==='candidate'?'当前候选':'当前工作稿'} · <span>revision {report.revision}</span> · {report.analysis.calibrated?'已校准':'未校准，面积为估算'}</p>
   <dl className="diagnostic-checks">
    <div><dt>内部空洞</dt><dd>{stateLabel[report.analysis.checks.internalVoid]}</dd></div>
    <div><dt>不合理倾斜</dt><dd>{stateLabel[report.analysis.checks.orientation]}</dd></div>
    <div><dt>孤立墙体 / 门窗</dt><dd>{stateLabel[report.analysis.checks.connectivity]}</dd></div>
   </dl>
   <p role="status">{report.analysis.issues.length?`发现 ${report.analysis.issues.length} 处待核对问题。`:report.analysis.status==='complete'?'本次规则未发现问题，仍需对照原图核对。':'检查尚未完整完成，不能据此判定没有问题。'}</p>
   <div className="diagnostic-list">{report.analysis.issues.map((issue,index)=><button key={issue.id} data-warning-code={issue.code} aria-pressed={selected===issue.id} onClick={()=>onLocate(issue)}>
    <span className="diagnostic-title"><span>{String(index+1).padStart(2,'0')}</span> {labels[issue.code]}</span>
    <span className="diagnostic-message">{issue.message}</span>
    <span className="diagnostic-action">{issue.location?'定位到平面':'无有效坐标，请核对实体引用'}</span>
   </button>)}</div>
   {selected&&<button onClick={onReset}>显示完整平面</button>}
   <details className="diagnostic-notes"><summary>检查依据与边界</summary>
    <p>连接容差 {report.analysis.thresholds.connectionM} m；空洞阈值 {report.analysis.thresholds.minVoidM2} m²；倾斜阈值 {report.analysis.thresholds.skewDegrees}°。主方向 {report.analysis.measurements.dominantAngleDegrees===null?'无法确定':`${report.analysis.measurements.dominantAngleDegrees.toFixed(1)}°`}，不是强制对齐页面水平线。</p>
    {report.analysis.notes.map(note=><p key={note}>{note}</p>)}
   </details>
  </>}
 </section>;
}

export function DiagnosticOverlay({issues,active,scene}:{issues:TopologyWarning[];active:string;scene:SceneData}){
 return <g className="diagnostic-overlay" pointerEvents="none" aria-label="拓扑告警位置">{issues.map((issue,index)=>{
  if(!issue.location)return null;
  const selected=active===issue.id;
  return <g key={issue.id} data-diagnostic-marker={issue.code} data-active={selected?'true':'false'}>
   {issue.rings&&<path d={issue.rings.map(r=>'M '+r.map(p=>`${p.x} ${p.y}`).join(' L ')+' Z').join(' ')} fillRule="evenodd" className="diagnostic-region"/>}
   {selected&&scene.walls.filter(w=>issue.wallIds.includes(w.id)).map(w=><line key={w.id} x1={w.a.x} y1={w.a.y} x2={w.b.x} y2={w.b.y} className="diagnostic-wall"/>)}
   <circle cx={issue.location.x} cy={issue.location.y} r=".13" className="diagnostic-marker"/>
   <text x={issue.location.x} y={issue.location.y+.045} fontSize=".13" textAnchor="middle" className="diagnostic-number">{index+1}</text>
  </g>;
 })}</g>;
}
