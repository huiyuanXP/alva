import { useCallback, useEffect, useRef, useState } from "react";
type Reply = {
  channel: string;
  protocol: number;
  project_id: string;
  type: string;
  request_id: string;
  payload: any;
};
export function useBridge(
  projectId: string,
  onSelection: (id: string | null) => void,
  onDirty?: () => void,
) {
  const frame = useRef<HTMLIFrameElement>(null),
    pending = useRef(
      new Map<
        string,
        {
          resolve: (v: any) => void;
          reject: (e: Error) => void;
          timer: ReturnType<typeof setTimeout>;
        }
      >(),
    );
  const [ready, setReady] = useState(false);
  const [projection,setProjection]=useState<{width:number;height:number;objects:{id:string;x:number;y:number;visible:boolean}[]}|null>(null);
  const callback = useRef(onSelection);
  callback.current = onSelection;
  const dirty = useRef(onDirty);
  dirty.current = onDirty;
  const call = useCallback(
    (method: string, payload: Record<string, unknown> = {}) =>
      new Promise<any>((resolve, reject) => {
        if (!frame.current?.contentWindow)
          return reject(new Error("3D 视图尚未连接"));
        const request_id = crypto.randomUUID();
        const timer = setTimeout(() => {
          pending.current.delete(request_id);
          reject(new Error("3D 桥接响应超时，请刷新视图"));
        }, 15000);
        pending.current.set(request_id, { resolve, reject, timer });
        frame.current.contentWindow.postMessage(
          {
            channel: "roomnote",
            protocol: 1,
            project_id: projectId,
            request_id,
            method,
            payload,
          },
          window.location.origin,
        );
      }),
    [projectId],
  );
  useEffect(() => {
    setReady(false);
    const receive = (e: MessageEvent) => {
      const m = e.data as Reply;
      if (
        e.origin !== location.origin ||
        e.source !== frame.current?.contentWindow ||
        !m ||
        m.channel !== "roomnote" ||
        m.protocol !== 1 ||
        m.project_id !== projectId ||
        typeof m.request_id !== "string"
      )
        return;
      if(m.type === "projection"){const p=m.payload;if(p&&Number.isFinite(p.width)&&p.width>0&&Number.isFinite(p.height)&&p.height>0&&Array.isArray(p.objects)&&p.objects.length<=10000&&p.objects.every((o:any)=>typeof o.id==="string"&&Number.isFinite(o.x)&&Number.isFinite(o.y)&&typeof o.visible==="boolean"))setProjection(p);return;}
      if (m.type === "ready") {
        setReady(true);
        return;
      }
      if (m.type === "selection") {
        callback.current(m.payload?.object_id || null);
        return;
      }
      if (m.type === "dirty") {
        dirty.current?.();
        return;
      }
      const task = pending.current.get(m.request_id);
      if (!task) return;
      clearTimeout(task.timer);
      pending.current.delete(m.request_id);
      if (m.type === "error")
        task.reject(new Error(m.payload?.message || "桥接失败"));
      else if (m.type === "result") task.resolve(m.payload);
    };
    window.addEventListener("message", receive);
    return () => {
      window.removeEventListener("message", receive);
      for (const t of pending.current.values()) {
        clearTimeout(t.timer);
        t.reject(new Error("项目已切换"));
      }
      pending.current.clear();
    };
  }, [projectId]);
  return { frame, ready, call, projection };
}
