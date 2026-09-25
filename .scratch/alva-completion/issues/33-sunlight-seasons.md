# 33: 昼夜季节与地理假设

**ID:** ALVA-040

**Parent scope:** T11

**Review reference:** R28

**What to build:** 拖动时间和季节滑杆，比较实际太阳方向与阴影。

**Blocked by:** [ALVA-013](06-example-building-views.md)

**Status:** in-progress

**Execution:** 2026-09-26（新加坡时间）由 chatgpt-sunlight 认领；依赖 ALVA-013 已在 main 验收。先实现独立日照计算、渲染与回归，不修改 ALVA-057/066 已占用的共享入口；整票 MCP 验收待 ALVA-066 接口解锁。

- [ ] 不是仅改背景颜色：不同时间/季节的太阳和阴影实测变化。
- [ ] 纬度/朝向/日期等假设可见，估算不宣称现场精确日照。
- [ ] 交互状态可重现并提供对照截图，控制台无错误。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `render`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Current implementation boundary

- 署名：chatgpt-sunlight；分支 `task/ALVA-040-chatgpt-sunlight`。
- 工作区：`/home/ubuntu/Alva/.runtime/worktrees/ALVA-040-chatgpt-sunlight`；因当前 MCP 路径工具限制，采用项目内独立 Worktree，依赖/输出/测试数据仍独立。
- 首批范围：`web/src/SceneView.tsx`、`web/src/BuildingView.tsx`、`web/src/scene/` 日照模块、无副作用共享合同及本票测试/脚本/文档。
- 协调等待：不修改057/066占用的 `web/src/main.tsx`、`api/chat.ts`、`api/model.ts`、`api/store.ts`、`api/api.ts` 或 `api/mcp/`。生活设计 MCP 和带回执的 UI action 按066合同接入后，才可关闭整票。
- 重型任务持有 `.git/alva-heavy-task.lock` 串行执行，CPU80%、内存1200M（浏览器1600M）、Tasks128，并留资源采样；不修改生产或MCP配置。
