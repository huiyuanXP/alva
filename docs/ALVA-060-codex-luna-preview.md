# ALVA-060 Codex GPT-6 Luna xhigh 识图预览

2026-09-25 按用户要求，在现有识图业务路径中设置 `OPENAI_VISION_MODEL=gpt-6-luna`、`OPENAI_REASONING_EFFORT=xhigh`，使用与 ALVA-056 相同的仓库原图 `references/room-study-handoff/public/floorplan.png`。`api/import.ts` 本来已通过 `OPENAI_VISION_MODEL` 选择模型；本票只在 `api/codex.ts` 将可选推理强度传给 Codex App Server。未复制识图提示词、schema、解析器或自动纠错逻辑。隔离脚本 `scripts/alva-060-preview-check.ts` 调用同一个 `recognizeLayout`，保存原始回复和候选，并额外执行确认拓扑及三类诊断。

实际运行 `20260925T092752423Z-ALVA060-luna-98cecd` 发起一次 Codex App Server 调用，模型参数为 `gpt-6-luna`、推理强度为 `xhigh`，业务输出 schema 和 600 秒时限生效；模型返回后无需业务自动纠错。原始回复通过现役 JSON/schema/几何解析，形成 17 段墙、10 个房间候选、5 个门窗。之后确认拓扑校验发现 T 形交点没有共享墙节点；诊断另报 15 个问题，包含约 3.35㎡ 未定义空间、4 个墙连通分量及多个开放端点。这份结果可渲染，但未通过完整拓扑质量门槛，不能自动确认或采用。原始输出和完整错误保留在该 Worktree 私有 `.runtime/<run-id>/`，脱敏摘要与截图在 `evidence/<run-id>/`。

预览当时复用 ALVA-059 的 `https://immune-indoor-coat-pose.trycloudflare.com` 和独立验证码。Luna 候选当时装入新的隔离数据库 `.runtime/worktrees/ALVA-056-render-preview/.runtime/preview-data-luna`，原 MiMo 数据库和截图保留。2026-09-25 切换时只停旧预览应用单元，启动 `alva-luna-preview-app.service`；临时 Tunnel、`alva.service`、生产数据和 MCP 均未改。公网 `/healthz` 为 200；Chromium 登录后见 17 墙/10 房二维图、3D canvas，页面脚本错误 0。

旧 MiMo 候选是经过一次显式纠错的 26 墙/5 房/12 门窗、零诊断问题；本次 Luna 是首轮输出。两者不是同等重试条件下的模型排名。原图比例与空间划分仍需人工对照核实，尤其不能把有诊断告警的 3D 图视为合格设计。

验证：`npm run check`、15 项导入相关测试和公网 Chromium 渲染通过。业务模型输出的拓扑检查失败按原样报告，未用单元测试或界面可打开掩盖。预览结束后先停 `alva-luna-preview-app.service` 与 `alva-mimo-preview-tunnel.service`，再审查保留的隔离数据库与 Worktree；没有用户看完后的清场确认前不删除现场。

2026-09-25 后续状态：同一链接已由 ALVA-062 切至 Gemini 3.8 候选；Luna 数据与截图保留，当前入口见 [ALVA-062](ALVA-062-gemini-preview.md)。
