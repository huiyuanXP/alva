import React, {useEffect, useRef, useState} from 'react';
import type {Project} from '../../../api/model.js';
import type {SaveCommand, SaveReceipt} from '../../../packages/contracts/alva/snapshots.js';
import './snapshots.css';

type Props = {
  project: Project;
  disabled: boolean;
  onBusyChange: (busy: boolean) => void;
  onProject: (project: Project) => void;
};
type Phase = 'ready' | 'saving' | 'saved' | 'error' | 'conflict' | 'reloading';
const pendingKey = (id: string) => `alva:pending-save:v1:${id}`;

function readPending(id: string): SaveCommand | null {
  try {
    const value = JSON.parse(sessionStorage.getItem(pendingKey(id)) || 'null');
    return value && typeof value.requestId === 'string' && /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value.requestId) &&
      Number.isInteger(value.expectedRevision) && value.expectedRevision >= 0 && value.confirmed === true
      ? {requestId: value.requestId, expectedRevision: value.expectedRevision, confirmed: true} : null;
  } catch { return null; }
}

export function SaveControls({project, disabled, onBusyChange, onProject}: Props) {
  const [initialPending] = useState(() => readPending(project.id));
  const pending = useRef<SaveCommand | null>(initialPending);
  const inFlight = useRef(false);
  const controller = useRef<AbortController | null>(null);
  const [phase, setPhase] = useState<Phase>(initialPending ? 'error' : 'ready');
  const [message, setMessage] = useState(initialPending ? '上次保存结果未确认。点击重试，不会重复生成快照。' : '');
  const [receipt, setReceipt] = useState<SaveReceipt | null>(null);
  useEffect(() => () => controller.current?.abort(), []);

  function remember(command: SaveCommand | null) {
    pending.current = command;
    // Only a request receipt is stored locally, never a copy of the design.
    try {
      if (command) sessionStorage.setItem(pendingKey(project.id), JSON.stringify(command));
      else sessionStorage.removeItem(pendingKey(project.id));
    } catch { /* Restricted storage still has in-memory retry protection. */ }
  }

  async function act(reload = false) {
    if (inFlight.current || disabled) return;
    inFlight.current = true;
    onBusyChange(true);
    setPhase(reload ? 'reloading' : 'saving');
    setMessage('');
    const abort = new AbortController();
    controller.current = abort;
    const timer = setTimeout(() => abort.abort(), 30_000);
    try {
      const command = pending.current || {requestId: crypto.randomUUID(), expectedRevision: project.revision, confirmed: true as const};
      if (!reload) remember(command);
      const response = await fetch(reload ? '/api/project' : '/api/save', {
        method: reload ? 'GET' : 'POST',
        signal: abort.signal,
        headers: {'Content-Type': 'application/json'},
        ...(reload ? {} : {body: JSON.stringify(command)}),
      });
      const data = await response.json();
      if (!response.ok) {
        setPhase(response.status === 409 ? 'conflict' : 'error');
        setMessage(response.status === 409
          ? `${data.error || '版本冲突'}。未覆盖服务器工作稿；请重新读取，再确认保存。`
          : `${data.error || '保存失败'}。本次未确认保存成功，可使用同一请求重试。`);
        return;
      }
      if (reload) {
        onProject(data as Project);
        remember(null);
        setReceipt(null);
        setPhase('ready');
        setMessage('已重新读取服务器工作稿，尚未创建新快照。检查后请再次点击保存。');
      } else {
        const result = data as Project & {saveReceipt: SaveReceipt};
        if (result.saveReceipt?.requestId !== command.requestId || !Number.isInteger(result.saveReceipt.version) ||
          !Number.isFinite(Date.parse(result.saveReceipt.createdAt))) throw new Error('保存回执不完整');
        const {saveReceipt, ...current} = result;
        onProject(current);
        remember(null);
        setReceipt(saveReceipt);
        setPhase('saved');
        setMessage(`全局快照 v${saveReceipt.version} 已保存。`);
      }
    } catch {
      setPhase(reload ? 'conflict' : 'error');
      setMessage(reload
        ? '重新读取失败，当前页面工作稿保持不变。请重试读取。'
        : '保存结果未确认，当前工作稿保持不变。请重试保存；同一请求不会重复生成快照。');
    } finally {
      clearTimeout(timer);
      controller.current = null;
      inFlight.current = false;
      onBusyChange(false);
    }
  }

  const working = phase === 'saving' || phase === 'reloading';
  const failed = phase === 'error' || phase === 'conflict';
  return <div className="snapshot-controls" aria-label="手动全局快照">
    <span className={`save-state ${project.dirty ? 'dirty' : ''}`} data-testid="snapshot-dirty">
      {project.dirty ? '未保存工作稿' : project.savedVersion ? `已保存 · v${project.savedVersion}` : '尚未保存'}
    </span>
    <button disabled={disabled || working || phase === 'conflict'} onClick={() => void act()}>
      {phase === 'saving' ? '正在保存…' : pending.current ? '重试保存' : '保存版本'}
    </button>
    {message && <div className={`snapshot-feedback ${failed ? 'snapshot-feedback-error' : ''}`}
      role={failed ? 'alert' : 'status'} data-testid="snapshot-feedback">
      <strong>{failed ? '尚未确认保存成功' : phase === 'saved' ? '全局快照已保存' : '工作稿已重读'}</strong>
      <p>{message}</p>
      {receipt && phase === 'saved' && <p><time dateTime={receipt.createdAt}>{new Date(receipt.createdAt).toLocaleString('zh-CN', {hour12: false})}</time>
        {(project.dirty || project.revision > receipt.revision) && ' · 当前工作稿已有新更改，尚未存入此快照。'}</p>}
      <small>只在手动保存时存档。普通编辑、确认、分析与生成不会新增快照。</small>
      <div className="snapshot-feedback-actions">
        {phase === 'conflict' && <button disabled={disabled || working} onClick={() => void act(true)}>重新读取工作稿</button>}
        {phase !== 'conflict' && <button aria-label="关闭保存提示" onClick={() => setMessage('')}>关闭</button>}
      </div>
    </div>}
  </div>;
}
