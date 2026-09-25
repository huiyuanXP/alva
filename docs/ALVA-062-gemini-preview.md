# ALVA-062 Gemini 3.8 户型识别候选预览

2026-09-25，按用户要求用 `gemini-3.8-flash-high` 对仓库原图 `references/room-study-handoff/public/floorplan.png` 再识别一次，并将结果放到 ALVA-059/060 已开好的临时 tunnel。原图 SHA-256 为 `01dc27e90296a1bd81af0a65589b3220137156f1011dfb530b778b3a8dd4f1e8`。该图不是用户最新标注截图对应的未标注原图；面积、房间划分与门窗位置仍待用户对照原图校核。

隔离 Worktree `/home/ubuntu/Alva-worktrees/ALVA-062-codex-gemini` 使用现役 `api/import.recognizeLayout` 提示词、schema、解析器和 `api/codex.runCodex`，调用现有 New API 网关的 Gemini 3.8 Flash High，推理强度 `high`。凭据通过本机 `NEWAPI_KEY` 注入调用环境，没有写入代码、证据或服务配置。运行 `20260925T111820350Z-ALVA062-gemini38-aa64b9` 发起首轮和业务允许的一次显式修正，耗时约 240 秒。两轮均返回户型数据，但业务解析最终失败：第二轮把开口拆为 `doors/windows`，房间缺少 `purpose`，未满足现役严格 Scene schema。因此**业务原生导入未通过**。

为了提供可审查的预览，`scripts/alva-062-adapt-preview.ts` 对第二轮原始数据做了可复现的字段映射：`doors/windows → openings.kind`、`room.name → 缺失的 purpose`、顶层地理字段 → `geography`。没有修改墙端点、房间多边形、开口所属墙、中心偏移或宽高。映射后通过现役 JSON/schema/几何校验、确认拓扑校验和三类诊断：20 段墙、6 个房间、9 个门窗，诊断 0 项，未定义面积 0，墙连通分量 1。这只说明结构检查通过，不证明识图与原图一致，也不表示可直接采用。

隔离数据库位于该 Worktree 的 `.runtime/preview-data-gemini38`，原始两轮回复与映射候选位于其 `.runtime/<run-id>/`，均不入 Git。MiMo 和 Luna 原数据库及截图保留。`alva-gemini-preview-app-v2.service` 在 `127.0.0.1:4181` 提供当前预览；沿用原 `alva-mimo-preview-tunnel.service` 和原验证码，公网入口为 `https://immune-indoor-coat-pose.trycloudflare.com`。没有修改 `alva.service`、生产数据或 MCP。首次以 900 MiB 内存上限启动被任务 OOM 终止；调至 1500 MiB 后服务运行，公网 `/healthz` 返回 200。

`npm run check` 与 `npm run build:alva` 通过（构建保留现有大 chunk 提示）。公网 Chromium 登录读取候选，确认二维 SVG 和全屋 3D canvas 可见，页面脚本错误 0；截图及检查结果见 `evidence/20260925T112501654Z-ALVA062-public/`。模型失败摘要见 `evidence/20260925T111820350Z-ALVA062-gemini38-aa64b9/`。预览结束后先停应用和 tunnel，再审查保留现场；用户看完前不清理隔离数据。

2026-09-25 后续状态：ALVA-063 为了在同一个模型 thread 中回传平面截图，重新生成并切换了临时入口。ALVA-062 的候选、数据库、原始输出和截图保留；当前入口与自查结果见 [ALVA-063](ALVA-063-floorplan-self-review.md)。
