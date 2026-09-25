# ALVA-063 Gemini 平面截图同会话自查

2026-09-25 按用户要求，将 Gemini 生成的户型候选渲染成仅含平面图的截图，再把原图和截图发回**生成它的同一个 Codex thread**自查。此前 ALVA-062 的一次性 `runCodex` 进程已结束，不能续接；本票在新隔离 Worktree 中重新生成，不能把本次称为旧会话的续写。

项目 Skill 位于 [`docs/skills/alva-floorplan-self-review/SKILL.md`](skills/alva-floorplan-self-review/SKILL.md)，未安装或复制进 `~/.codex/skills`、`.agents/skills` 等标准目录。`scripts/alva-063-floorplan-self-review.ts` 读取该文件，在生成提示中预告后续自查，并在自查轮的 prompt 中明确要求调用、附入 Skill 全文。该会话禁用文件和 shell 工具，所以仅给文件路径不足以让模型读取 Skill；附入全文是本次实际调用方式。

可给执行 Agent 的提示词：

> 请调用项目内 `docs/skills/alva-floorplan-self-review/SKILL.md`（不在标准 Skill 目录）。先读取它，再在同一 Codex thread 内生成户型候选、只截取候选的平面图区域，把原图和平面截图作为下一轮输入交回该 thread，按 Skill 输出自查 JSON；保留原始输出、截图、thread/turn 证据，不自动按自查意见修改候选。

复验 run `20260925T114342944Z-ALVA063-selfreview-d5bf96` 使用 `gemini-3.8-flash-high`、仓库原图和现役识图提示/schema。三个 turn（生成、一次修正、自查）的 `threadId` 相同，原始协议 ID 保留在私有 `.runtime/<run-id>/result.json`。前两轮仍未通过业务严格 schema；仅在隔离预览中做字段映射，没有调整墙、房间多边形和门窗几何。因此业务原生导入仍失败。映射后为 19 段墙、5 个房间、7 个门窗，通过几何、确认拓扑和三类诊断（问题 0、未定义面积 0、墙连通分量 1）。

浏览器从这份新候选的最大平面 SVG 截得 [`plan-only.png`](../evidence/20260925T114342944Z-ALVA063-selfreview-d5bf96/plan-only.png)，截图不含侧栏或 3D。自查轮同时收到原图和该截图；模型返回 `overall=mismatch`，列出卫生间内部分隔和门、主卧隔墙转折、左侧外墙开窗等疑点，并要求人工核对。它也认为五个主要功能区和主体外轮廓大体吻合。完整模型自查见 [`review.json`](../evidence/20260925T114342944Z-ALVA063-selfreview-d5bf96/review.json)。这是模型的对照意见，不是用户确认或准确性验收；本票没有自动修改候选。

同一临时 tunnel `https://immune-indoor-coat-pose.trycloudflare.com` 现展示这份自查后的新候选，沿用原验证码。运行服务为 `alva-gemini-selfreview-preview.service`，隔离数据在本 Worktree `.runtime/preview-data-selfreview`。ALVA-059/060/062 的数据和截图保留；`alva.service`、生产数据、MCP 未改。公网 `/healthz` 为 200，Chromium 登录确认 19/5/7 候选、二维和全屋 3D 可见，页面脚本错误 0；证据在 `evidence/20260925T114907388Z-ALVA063-public/`。`npm run check`、`npm run build:alva` 及 Skill 格式校验通过。停止预览时先停本票应用单元和原 tunnel，保留现场供用户核对。
