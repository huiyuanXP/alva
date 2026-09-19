import React, { useState, useEffect } from "react";
import { createRoot } from "react-dom/client";
import type { ProjectData } from "../../../packages/contracts/index.js";
import { api } from "./api.js";
import "./style.css";
import "./workbench.css";
import { Workbench } from "./Workbench.js";
import type { UserRole } from "./Workbench.js";
import './paper.css';
import './collaboration.css';
const paper = location.pathname.replace(/\/$/, '') === '/new-ui';
document.documentElement.classList.toggle('paper-route',paper);
try { document.documentElement.dataset.theme=localStorage.getItem('roomnote:paper-theme')||(matchMedia('(prefers-color-scheme: dark)').matches?'dark':'light'); } catch { document.documentElement.dataset.theme='light'; }
function Mark() {
  return (
    <svg
      width="27"
      height="27"
      viewBox="0 0 28 28"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M4 12 14 5l10 7v12H4V12Z"
        stroke="currentColor"
        strokeWidth="1.8"
      />
      <path
        d="M10 24V14h8v10M4 12h20"
        stroke="currentColor"
        strokeWidth="1.5"
      />
    </svg>
  );
}
function Login({ onDone }: { onDone: () => void }) {
  const [code, setCode] = useState(""),
    [error, setError] = useState(""),
    [busy, setBusy] = useState(false);
  return (
    <main className="login">
      <section className="login-intro">
        <div className="brand">
          <Mark /> ROOMNOTE<span>空间，从理解开始</span>
        </div>
        <div className="eyebrow">YOUR HOME, THOUGHTFULLY UNDERSTOOD</div>
        <h1>
          先聊生活，
          <br />
          再设计空间。
        </h1>
        <p>
          让每一份偏好都有依据，
          <br />
          让理想的家一步步变得清晰。
        </p>
        <div className="login-meta">
          可编辑 3D 空间 <span>·</span> 有来源的需求 <span>·</span>{" "}
          由你确认的建议
        </div>
      </section>
      <form
        className="login-card"
        onSubmit={async (e) => {
          e.preventDefault();
          setBusy(true);
          setError("");
          try {
            await api("/api/session/login", { code });
            setCode("");
            onDone();
          } catch (err) {
            setError((err as Error).message);
          } finally {
            setBusy(false);
          }
        }}
      >
        <span className="eyebrow">PRIVATE WORKSPACE</span>
        <h2>打开你的工作台</h2>
        <p>此演示已启用业主访问保护。项目数据不会向匿名访客开放。</p>
        <label>
          工作台访问口令
          <input
            type="password"
            autoComplete="current-password"
            required
            value={code}
            onChange={(e) => setCode(e.target.value)}
            placeholder="输入服务器配置的访问口令"
          />
        </label>
        <button className="primary" disabled={busy}>
          {busy ? "正在验证…" : "进入工作台 →"}
        </button>
        {error && (
          <p className="error" role="alert">
            {error}
          </p>
        )}
        <small>
          口令保存在服务器 <code>.data/owner-access-code</code>
          ，不会出现在任务看板。
        </small>
        <a href="/todo">查看公开开发看板 ↗</a>
      </form>
    </main>
  );
}
function App() {
  const [auth, setAuth] = useState<boolean | null>(null),
    [role, setRole] = useState<UserRole>('owner'),
    [project, setProject] = useState<ProjectData | null>(null),
    [error, setError] = useState("");
  async function boot() {
    try {
      const session = await api<{role:UserRole}>('/api/session');
      setAuth(true);
      setRole(session.role);
      const result = await api<{ projects: { id: string }[] }>("/api/projects");
      const requested = new URLSearchParams(location.search).get("project");
      const id = requested !== null ? requested : result.projects[0]?.id;
      if(!id) throw new Error('当前账户没有可访问项目');
      const p = session.role === 'designer' ? (await api<{project:ProjectData}>(`/api/projects/${encodeURIComponent(id)}/collaboration/view`)).project : await api<ProjectData>(`/api/projects/${encodeURIComponent(id)}`);
      setProject(p);
    } catch (err) {
      if ((err as any).status === 401) setAuth(false);
      else setError((err as Error).message);
    }
  }
  useEffect(() => {
    void boot();
  }, []);
  if (auth === false) return <Login onDone={() => void boot()} />;
  if (project) return <Workbench initial={project} paper={paper} role={role} />;
  return (
    <div className="boot">
      <Mark />
      <p>{error || "正在打开工作台…"}</p>
    </div>
  );
}
createRoot(document.getElementById("root")!).render(<App />);
