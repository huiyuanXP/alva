import React, { useCallback, useEffect, useRef, useState } from "react";
import type {
  ProjectData,
  ProjectEvent,
} from "../../../packages/contracts/index.js";
import { api } from "./api.js";
import { canonical } from "../../../packages/contracts/canonical.js";
import { useBridge } from "./bridge.js";
import { RequirementsPanel, type Commit } from "./RequirementsPanel.js";
import { ChatWindow } from "./ChatWindow.js";
import { BriefPanel } from "./BriefPanel.js";
import { ObjectEditor } from "./ObjectEditor.js";
import {GeometryWarnings} from "./GeometryWarnings.js";
import { QuestionnairePanel } from './QuestionnairePanel.js';
import { DeliveryPanel } from './DeliveryPanel.js';
import { ThemeToggle } from './ChatControls.js';
import { typeEyebrow, typePage, typePackage } from './components/shared/type.js';
import { DesignerBoard } from './DesignerBoard.js';
export type UserRole = 'owner'|'designer';
export function Workbench({ initial, paper = false, role = 'owner' }: { initial: ProjectData; paper?: boolean; role?: UserRole }) {
  const readOnly = role === 'designer';
  const [project, setProject] = useState(initial),
    [room, setRoom] = useState(initial.rooms[0].id),
    [selected, setSelected] = useState<string | null>(null),
    [editing, setEditing] = useState<string | null>(null),
    [mode, setMode] = useState("3d"),
    [panel, setPanel] = useState(!paper),
    [chat, setChat] = useState(paper&&!readOnly),
    [brief, setBrief] = useState(false),
    [questionnaire, setQuestionnaire] = useState(false),
    [delivery, setDelivery] = useState(false),
    [collaboration, setCollaboration] = useState(false),
    [busy, setBusy] = useState(false),
    [applying, setApplying] = useState(false),
    [error, setError] = useState(""),
    [sceneNotice, setSceneNotice] = useState(""),
    [saved, setSaved] = useState(true),
    [connected, setConnected] = useState(false),
    [toolStatus, setToolStatus] = useState("");
  const sceneClean=useRef(saved);sceneClean.current=saved;
  const editingCurrent=useRef(editing);editingCurrent.current=editing;
  const previewing = useRef<string|null>(null);
  const current = useRef(project);
  current.current = project;
  const loadedScene = useRef(canonical(initial.scene)),
    loaded = useRef(false);
  const bridge = useBridge(project.id, (id) => { setSelected(id); if (!readOnly && id && current.current.scene.floors.some(f => f.furniture.some(o => o.id === id))) setEditing(id); }, () => { if(!readOnly)setSaved(false); });
  const merge = useCallback(
    (incoming: ProjectData) =>
      setProject((p) => {
        if (incoming.id !== p.id || incoming.version < p.version) return p;
        return {
          ...incoming,
          messages: incoming.messages.map((m) => {
            const old = p.messages.find((o) => o.id === m.id);
            return m.status === "running" &&
              old?.status === "running" &&
              old.content.length > m.content.length
              ? { ...m, content: old.content }
              : m;
          }),
        };
      }),
    [],
  );
  const refresh = useCallback(async () => {
    const p = readOnly ? (await api<{project:ProjectData}>(`/api/projects/${initial.id}/collaboration/view`)).project : await api<ProjectData>(`/api/projects/${initial.id}`);
    merge(p);
    return p;
  }, [initial.id, merge, readOnly]);
  const run = useCallback(async (task: () => Promise<void>) => {
    setError("");
    try {
      await task();
    } catch (err) {
      setError((err as Error).message);
    }
  }, []);
  const commit: Commit = useCallback(
    async (path, body) => {
      if(readOnly) throw new Error('设计师入口为只读；请通过设计师看板提交独立建议');
      if(path.startsWith("/references")&&!sceneClean.current)throw new Error("场景存在未保存修改或预览，请先保存或取消预览");
      try {
        const p = await api<ProjectData>(`/api/projects/${initial.id}${path}`, {
          expected_version: current.current.version,
          request_id: crypto.randomUUID(),
          ...body,
        });
        // A following queued attachment command may begin before React renders.
        // Advance the acknowledged version immediately; explicit form baselines
        // in body still retain their own optimistic-concurrency protection.
        if(p.version>=current.current.version)current.current=p;
        merge(p);
        return p;
      } catch (err) {
        if ((err as any).status === 409) await refresh();
        throw err;
      }
    },
    [initial.id, merge, refresh],
  );
  useEffect(() => {
    if(readOnly)return;
    const key = `roomnote:last-event:${initial.id}`;
    let last = Number(sessionStorage.getItem(key) || 0);
    if (!Number.isSafeInteger(last) || last < 0) last = 0;
    let disposed = false;
    let events: EventSource;
    const connect = () => {
    events?.close();
    events = new EventSource(
      `/api/projects/${initial.id}/events?after=${last}`,
    );
    events.onopen = () => {
      setConnected(true);
      void refresh().catch(() => {});
    };
    events.onerror = () => setConnected(false);
    events.onmessage = (e) => {
      if (disposed) return;
      let event: ProjectEvent;
      try {
        event = JSON.parse(e.data);
      } catch {
        return;
      }
      if (
        event.project_id !== initial.id ||
        !Number.isSafeInteger(event.event_id) ||
        event.event_id <= last
      )
        return;
      last = event.event_id;
      sessionStorage.setItem(key, String(last));
      if (event.type === "message_progress") {
        const a = event.payload;
        setProject((p) => ({
          ...p,
          messages: p.messages.map((m) =>
            m.id === a.message_id &&
            m.run_id === a.run_id &&
            m.status === "running"
              ? { ...m, content: String(a.content) }
              : m,
          ),
        }));
      } else if (event.type === "tool_status") {
        const a = event.payload;
        setToolStatus(
          `${({read_consultation:'读取原话与需求',read_attachment_excerpt:'阅读附件片段',read_intake_detail:'核对问卷回答',record_intake_answer:'整理原话，等待你核对',ask_intake_question:'准备推荐与替代选择',record_answer:'提取字段，等待你核对',propose_field:'生成待确认建议'} as Record<string,string>)[String(a.name)]||'处理咨询资料'} · ${a.status === "running" ? "进行中" : a.status === "failed" ? "未通过校验" : "完成"}`,
        );
      } else void refresh().catch(() => {});
    };
    };
    const offline = () => { events?.close(); setConnected(false); };
    const online = () => { if (!disposed) connect(); };
    window.addEventListener("offline", offline);
    window.addEventListener("online", online);
    connect();
    return () => {
      disposed = true;
      events?.close();
      window.removeEventListener("offline", offline);
      window.removeEventListener("online", online);
    };
  }, [initial.id, refresh, readOnly]);
  useEffect(() => {
    if (bridge.ready)
      void run(async () => {
        await bridge.call("load", {
          scene: current.current.scene,
          version: current.current.version,
        });
        loadedScene.current = canonical(current.current.scene);
        loaded.current = true;
        setSaved(true);
        await bridge.call("focus", { room_id: room });
      });
  }, [bridge.ready]);
  useEffect(() => {
    if (bridge.ready && loaded.current)
      void run(async () => {
        const remoteScene = canonical(project.scene);
        if (remoteScene !== loadedScene.current && saved) {
          await bridge.call("load", {
            scene: project.scene,
            version: project.version,
          });
          loadedScene.current = remoteScene;
        } else await bridge.call("version", { version: project.version });
      });
  }, [project.version, bridge.ready]);
  const focus = async (id: string) => {
    await bridge.call("focus", { room_id: id });
    setRoom(id);
  };
  const keyboard = (locked: boolean) => {
    if (bridge.ready) void bridge.call("keyboard", { locked:locked||questionnaire||delivery||collaboration }).catch(() => {});
  };
  useEffect(()=>{keyboard(questionnaire||delivery||collaboration);},[questionnaire,delivery,collaboration,bridge.ready]);
  useEffect(() => {
    const closeChatWhenLeavingStage = (event: PointerEvent) => {
      if (!paper || !chat) return;
      const target = event.target as HTMLElement;
      if (target.closest('.scene') && !target.closest('.chat-window, .chat-launcher, [role="dialog"]')) setChat(false);
      document.querySelectorAll<HTMLDetailsElement>('.question-fold[open]').forEach(fold=>{if(!fold.contains(target))fold.open=false;});
    };
    const frame=document.querySelector<HTMLIFrameElement>('.scene iframe');
    let canvasDocument:Document|null=null;
    const closeOnCanvasPointer=()=>{if(paper&&chat)setChat(false);};
    const attachCanvas=()=>{canvasDocument?.removeEventListener('pointerdown',closeOnCanvasPointer);canvasDocument=frame?.contentDocument??null;canvasDocument?.addEventListener('pointerdown',closeOnCanvasPointer);};
    attachCanvas();frame?.addEventListener('load',attachCanvas);
    document.addEventListener('pointerdown', closeChatWhenLeavingStage);
    return () => {document.removeEventListener('pointerdown', closeChatWhenLeavingStage);frame?.removeEventListener('load',attachCanvas);canvasDocument?.removeEventListener('pointerdown',closeOnCanvasPointer);};
  }, [paper, chat]);
  const saveScene = async () => {
    if(previewing.current){setError("当前为家具建议预览，请先确认或取消");return;}
    setBusy(true);
    try {
      if (canonical(current.current.scene) !== loadedScene.current)
        throw new Error("服务器场景已更新。请先重新载入，避免覆盖其他修改。");
      const snapshot = await bridge.call("snapshot");
      const p = await commit("/scene/save", { scene: snapshot.scene });
      await bridge.call("load", { scene: p.scene, version: p.version });
      loadedScene.current = canonical(p.scene);
      setSaved(true);
    } finally {
      setBusy(false);
    }
  };
  const applyToScene = async () => {
    setApplying(true);
    setSceneNotice("");
    try {
      const requirements = current.current.requirements
        .filter(
          (r) =>
            r.room_id === room &&
            r.answer_state === "answered" &&
            r.value !== null &&
            r.confirmation_state !== "pending",
        )
        .map((r) => ({ field_key: r.field_key, value: r.value }));
      if (!requirements.length)
        throw new Error("当前房间还没有可应用的已确认需求。");
      const result = await bridge.call("apply_requirements", {
        room_id: room,
        requirements,
      });
      setSaved(false);
      setSceneNotice(
        `已将 ${result.changed} 项场景调整应用到${project.rooms.find((r) => r.id === room)?.name || "当前房间"}；请检查后点击“保存项目”。`,
      );
    } finally {
      setApplying(false);
    }
  };
  const send = async (text: string, roomId: string, attachmentIds?:string[], modelId?:string) => {
    try {
      const result = await api<{ project: ProjectData }>(
        `/api/projects/${project.id}/chat`,
        {
          room_id: roomId,
          text,
          ...(modelId ? {model_id:modelId} : {}),
          ...(attachmentIds?.length?{attachment_ids:attachmentIds}:{}),
          expected_version: current.current.version,
          request_id: crypto.randomUUID(),
        },
      );
      merge(result.project);
    } catch (err) {
      if ((err as any).status === 409) await refresh();
      throw err;
    }
  };
  const cancel = async (runId: string) => {
    await api(`/api/projects/${project.id}/chat/cancel`, { run_id: runId });
  };
  const conversations = readOnly ? null : project.rooms.map(r=><ChatWindow key={r.id} project={project} roomId={r.id} visible={chat&&r.id===room} paperPopup={paper} onClose={()=>setChat(false)} onSend={send} commit={commit} onCancel={cancel} keyboard={keyboard} toolStatus={toolStatus} onError={setError} onQuestionnaire={()=>setQuestionnaire(true)} onDelivery={()=>setDelivery(true)}/>);
  const activeRoom=project.rooms.find(r=>r.id===room)!;
  return (
    <div className={`workbench${paper?' paper-ui':''}`} data-chat-open={chat}>
      <header className="topbar">
        <a className="brand" href="/" aria-label="ROOMNOTE 首页">
          <svg width="27" height="27" viewBox="0 0 28 28" fill="none">
            <path
              d="M4 12 14 5l10 7v12H4V12Z M10 24V14h8v10"
              stroke="currentColor"
              strokeWidth="1.7"
            />
          </svg>
          <b>ROOMNOTE</b>
        </a>
        <span className="nav-separator" />
        <div className="project-name">
          <strong>{project.name}</strong>
          <small>
            {saved ? "后端已保存" : "场景预览，尚未保存"} · v{project.version} ·{" "}
            {connected ? "已同步" : "正在重连"}
          </small>
        </div>
        <div className="mode-switch">
          {[
            ["2d", "2D 平面"],
            ["3d", "3D 空间"],
            ["walk", "漫游"],
          ].map(([value, label]) => (
            <button
              key={value}
              className={mode === value ? "active" : ""}
              disabled={!bridge.ready}
              onClick={() =>
                void run(async () => {
                  await bridge.call("mode", { mode: value });
                  setMode(value);
                })
              }
            >
              {label}
            </button>
          ))}
        </div>
        <div className="nav-actions">
          {paper?<ThemeToggle/>:<a href={`/new-ui?project=${encodeURIComponent(project.id)}`}>新版工作台 ↗</a>}
          <a href="/todo" target="_blank" rel="noreferrer">
            开发看板 ↗
          </a>
          {!readOnly&&<button onClick={() => setBrief(true)}>需求任务书</button>}
          {!readOnly&&<button className="intake-nav" onClick={()=>setDelivery(true)}>问卷与交付</button>}
          <button onClick={()=>setCollaboration(true)}>设计师看板</button>
          {!readOnly&&<button
            className="primary"
            disabled={busy || !bridge.ready}
            onClick={() => void run(saveScene)}
          >
            {busy ? "保存中…" : "保存项目"}
          </button>}
          {readOnly&&<span className="role-badge">设计师只读入口</span>}
        </div>
      </header>
      <main className="workspace" data-panel-open={panel}>
        {paper&&<nav className="paper-rail" aria-label="空间与设计资料"><div><span className={typeEyebrow}>你的空间</span>{project.rooms.map((r,index)=><button type="button" key={r.id} className={r.id===room?'active':''} aria-current={r.id===room?'page':undefined} onClick={()=>void run(()=>focus(r.id))}><span className={typePackage}>{String(index+1).padStart(2,'0')}</span>{r.name}</button>)}</div><div><span className={typeEyebrow}>把想法落到纸上</span><button type="button" onClick={()=>setPanel(v=>!v)}>需求记录</button>{!readOnly&&<button type="button" onClick={()=>setQuestionnaire(true)}>逐项确认</button>}<button type="button" onClick={()=>setDelivery(true)}>交付清单</button></div><div className="rail-bottom"><p>建议与正式值分开。<br/>每一次改变，由你确认。</p><a href={`/?project=${encodeURIComponent(project.id)}`}>原版工作台 ↗</a></div></nav>}
        <section className="scene">
          {paper&&<div className="paper-scene-heading"><div><span className={typeEyebrow}>fig. 01 / 可编辑空间</span><h1 className={typePage}>让{activeRoom.name}更贴近你的生活。</h1></div><span className={typePackage}>{(activeRoom.geometry_cm.width/100).toFixed(1)} × {(activeRoom.geometry_cm.depth/100).toFixed(1)} m</span></div>}
          <iframe
            ref={bridge.frame}
            src={`/engine/embed?project=${encodeURIComponent(project.id)}`}
            title="OpenPlan3D 房间视图"
            allow="fullscreen"
          />
          {saved && !editing && mode === "3d" && <GeometryWarnings project={project} projection={bridge.projection} focus={(id)=>void run(()=>focus(id))}/>}
          <div className="scene-label">
            <span className="status-dot" />
            可编辑空间<span className="muted">/</span>
            {project.rooms.find((r) => r.id === room)?.name}
          </div>
          <div className="room-pills">
            {project.rooms.map((r, i) => (
              <button
                className={r.id === room ? "active" : ""}
                key={r.id}
                onClick={() => void run(() => focus(r.id))}
              >
                <span>0{i + 1}</span>
                {r.name}
              </button>
            ))}
          </div>
          <div className="scene-controls">
            <button
              aria-label="旋转视角"
              onClick={() =>
                void run(async () => {
                  await bridge.call("camera", { action: "orbit" });
                })
              }
            >
              ↻
            </button>
            <button
              aria-label="放大"
              onClick={() =>
                void run(async () => {
                  await bridge.call("camera", { action: "zoomIn" });
                })
              }
            >
              ＋
            </button>
            <button
              aria-label="缩小"
              onClick={() =>
                void run(async () => {
                  await bridge.call("camera", { action: "zoomOut" });
                })
              }
            >
              −
            </button>
            <button
              aria-label="聚焦当前房间"
              onClick={() => void run(() => focus(room))}
            >
              ⌖
            </button>
          </div>
          <div className="scene-footer">
            <span>OpenPlan3D · 原生可编辑场景</span>
            <span>拖动旋转 · 滚轮缩放</span>
          </div>
          <div className="scene-action-stack">
          {selected && (
            <div className="selection">
              已选中 <b>{selected}</b>
              {!readOnly&&<button onClick={() => setEditing(selected)}>编辑家具属性</button>}
              {!readOnly&&<button
                onClick={() =>
                  void run(async () => {
                    const s = await bridge.call("snapshot");
                    await bridge.call("update", {
                      object_id: selected,
                      expected_version: s.version,
                      patch: { color: "#b7c9ae" },
                    });
                    setSaved(false);
                  })
                }
              >
                预览鼠尾草绿
              </button>}
            </div>
          )}
          {!readOnly&&<div className="starter-actions">
            <button
              className="apply-scene"
              disabled={busy || applying || !bridge.ready}
              onClick={() => void run(applyToScene)}
            >
              {applying ? "应用中…" : "应用到场景"}
            </button>
            <button
              onClick={() =>
                void run(async () => {
                  await bridge.call("select", { object_id: "sofa-main" });
                })
              }
            >
              选择示例沙发
            </button>
            <button
              onClick={() =>
                void run(async () => {
                  const p = await refresh();
                  await bridge.call("load", {
                    scene: p.scene,
                    version: p.version,
                  });
                  loadedScene.current = canonical(p.scene);
                  setSaved(true);
                })
              }
            >
              重新载入场景
            </button>
          </div>}
          {sceneNotice && (
            <div className="scene-notice" role="status">
              {sceneNotice}
            </div>
          )}
          </div>
          {!readOnly&&<button
            className="chat-launcher"
            aria-expanded={chat}
            onClick={() => setChat((x) => !x)}
          >
            聊聊你的家 <small>空间咨询</small>
          </button>}
          {paper?<div className="paper-chat-surface">{conversations}</div>:conversations}
        </section>
        {panel ? (
          <RequirementsPanel
            project={project}
            roomId={room}
            focus={(id) => void run(() => focus(id))}
            commit={commit}
            onClose={() => setPanel(false)}
            onError={setError}
            readOnly={readOnly}
          />
        ) : !paper ? (
          <button className="panel-reopen" onClick={() => setPanel(true)}>
            ☷ 需求清单
          </button>
        ) : null}
      </main>
      {paper&&<nav className="paper-mobile-tabs" aria-label="工作区视图"><button type="button" aria-pressed={!chat} onClick={()=>setChat(false)}>空间预览</button>{!readOnly&&<button type="button" aria-pressed={chat} onClick={()=>setChat(true)}>咨询对话</button>}<button type="button" aria-pressed={panel} onClick={()=>setPanel(v=>!v)}>需求记录</button></nav>}
      {editing && !readOnly && <ObjectEditor key={editing} projectId={project.id} objectId={editing} project={project} commit={commit}
        restore={async()=>{if(previewing.current===editing){previewing.current=null;await bridge.call('load',{scene:current.current.scene,version:current.current.version});loadedScene.current=canonical(current.current.scene);setSaved(true);}}}
        preview={async id=>{
          if(!saved&&!previewing.current)throw new Error('场景存在未保存修改，请先保存项目');
          const p=await refresh();if(editingCurrent.current!==editing)throw new Error('家具选择已改变，预览已取消');const m=p.object_messages?.find(m=>m.id===id&&m.object_id===editing);
          if(!m||m.status!=='proposed'||!m.patch||canonical(p.scene)!==m.scene_fingerprint||p.revisions.some(r=>r.version>m.base_version&&['scene_changed','object_changed'].includes(r.kind)))throw new Error('场景已变化，请重新咨询');
          const scene=structuredClone(p.scene);const item=scene.floors.flatMap(f=>f.furniture).find(o=>o.id===editing)!;Object.assign(item,m.patch);
          previewing.current=editing;setSaved(false);await bridge.call('load',{scene,version:p.version});await bridge.call('focus',{room_id:m.room_id});
        }}
        adopt={async id=>{
          if(previewing.current!==editing)throw new Error('请先预览当前家具');
          const m=current.current.object_messages?.find(m=>m.id===id&&m.object_id===editing);if(!m)throw new Error('建议不存在');
          try{const p=await commit('/objects/decision',{room_id:m.room_id,object_id:editing,message_id:id,action:'confirm',confirmed:true});await bridge.call('load',{scene:p.scene,version:p.version});loadedScene.current=canonical(p.scene);setSaved(true);setEditing(null);}
          catch(e){const p=await refresh();await bridge.call('load',{scene:p.scene,version:p.version});loadedScene.current=canonical(p.scene);setSaved(true);throw e;}finally{previewing.current=null;}
        }}
        close={() => {if(previewing.current===editing){previewing.current=null;void bridge.call('load',{scene:current.current.scene,version:current.current.version}).then(()=>{loadedScene.current=canonical(current.current.scene);setSaved(true);});}setEditing(null);}} save={async (roomId, patch, baseline) => {
        if (!saved||previewing.current) throw new Error("场景存在未保存修改或预览，请先保存项目或取消预览");
        const p = await commit("/objects/update", {expected_version:baseline,room_id: roomId, object_id: editing, patch, confirmed: true});
        await bridge.call("load", {scene: p.scene, version: p.version});
        loadedScene.current = canonical(p.scene);
        setSaved(true);

      }}/>}
      {questionnaire&&!readOnly&&<QuestionnairePanel project={project} roomId={room} commit={commit} keyboard={keyboard} onClose={()=>setQuestionnaire(false)}/>} 
      {delivery&&<DeliveryPanel project={project} commit={commit} onClose={()=>setDelivery(false)} onQuestionnaire={()=>{setDelivery(false);if(!readOnly)setQuestionnaire(true);}} readOnly={readOnly}/>} 
      {brief && (
        <BriefPanel
          project={project}
          onClose={() => setBrief(false)}
          commit={commit}
          onError={setError}
        />
      )}
      {collaboration&&<DesignerBoard project={project} role={role} focusRoom={(id)=>void run(()=>focus(id))} focusObject={async(id)=>{await bridge.call('select',{object_id:id});setSelected(id);}} onClose={()=>setCollaboration(false)}/>} 
      {error && (
        <div className="toast error" role="alert">
          {error}
          <button aria-label="关闭错误" onClick={() => setError("")}>
            ×
          </button>
        </div>
      )}
    </div>
  );
}
