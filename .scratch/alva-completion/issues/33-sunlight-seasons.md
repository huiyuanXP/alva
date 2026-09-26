# 33: 昼夜季节与地理假设

## 2026-09-26 接入等待已解除

ALVA-066 已在 main `e44c23a` 集成，阶段 MCP 接入前置已满足，066 的共享入口开发占用已释放。原负责人可同步最新 main 后完成本票工具挂载和真实主 Chat 联合验收，无需等待066生产发布。本票保持原署名与 in-progress；以下“等待066合main/运行层未实现/禁止修改066共享入口”均为历史记录，不再是当前阻塞。自身验收条件继续有效。


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

## Independent worktree checkpoint — 2026-09-26（新加坡时间）

独立实现提交 `7c5129e`（`task/ALVA-040-chatgpt-sunlight`）。17项数学/Three.js与既有视角回归、完整类型检查、前端构建、真实浏览器13项检查通过，页面/控制台错误0。两个视图的日照、阴影、相机保持、参数重现和项目/快照不变已验；保留失败与资源证据。

产品代码尚未合入main；本票继续in-progress。生活设计MCP和主Chat受控UI action回执按ALVA-066接口衔接，不修改057/066/029占用的共享入口。完整实施说明和截图在个人工作区 `/home/ubuntu/Alva/.runtime/worktrees/ALVA-040-chatgpt-sunlight` 的 `docs/ALVA-040-sunlight.md` 与 `evidence/20260925T192458558Z-ALVA040-browser-110e48/`，不能将个人分支证据当作主线/生产已验收。
