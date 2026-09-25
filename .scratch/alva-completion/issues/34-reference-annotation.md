# 34: 参考图片偏好标注

**ID:** ALVA-041

**Parent scope:** T12

**Review reference:** R30

**What to build:** 上传参考图片并标出喜欢或不喜欢的特征。

**Blocked by:** [ALVA-017](10-multimodal-chat.md)

**Status:** done

**Execution:** 2026-09-25 由 chatgpt-alva041 完成；个人实现 `a22b81a`，两轮验收通过后 squash 集成到 main。候选参考偏好使用独立持久化，未修改 ALVA-057 正占用的 `api/model.ts` 与 `web/src/main.tsx`。

- [x] 真实模型分析与用户手动标注明确区分。
- [x] 保留图片来源、原话与作用房间，删除/取消未确认候选不污染需求。
- [x] 参考图不作为尺寸、结构或材料性能的证据。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `references`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## Implementation handoff · 2026-09-25 · chatgpt-alva041

实现完成：新增独立参考图偏好批次/标注持久化，不修改 `Project` schema。模型候选与用户手工标注分别记录 `origin=model/manual`，均先保持 pending；只有业主明确勾选并确认后，才生成 `Evidence(source=image)` 与 intake `Finding(kind=requirement)`。批次保留参考图、文件名、用户原话和作用房间；整批取消不会增加项目 revision、Evidence 或 Finding。参考图偏好明确禁止作为尺寸、承重/结构、真实材料或材料性能证据，服务端对相关候选做硬拒绝。

主 Chat 已接入 `propose_reference_preferences` business tool：本轮附带参考图且用户明确讨论喜欢/不喜欢时，模型可实际调用该工具生成待确认候选，但不能直接写正式需求。WorkspacePanel 新增“参考图”页签，支持独立上传分析、模型候选展示、手工喜欢/不喜欢标注、勾选确认和整批取消；未修改 ALVA-057 占用的 `api/model.ts` / `web/src/main.tsx`。

第一轮验收：`tests/alva-reference-annotation.test.ts` 3/3 通过；覆盖 pending 不污染项目、manual/model 来源区分、取消不污染需求、确认后来源/房间/原话落库、尺寸/结构/性能硬拒绝，以及主 Chat 真实工具调用。`tsc --noEmit`、Vite production build、`git diff --check` 通过。证据：`evidence/20260925T2258Z-ALVA041-round1/result.json`。

第二轮验收：真实监听 `127.0.0.1:43141`、隔离 PGlite、真实 HTTP cookie/session 链路通过；首页 200、参考图读取 200、模型与手工来源均存在、2 条选中偏好确认后生成 2 条 image evidence + 2 条 reference findings，batch=confirmed。并复跑 ALVA-043 来源指导回归 + ALVA-041 专项共 6/6，通过 TypeScript 与生产构建。证据：`evidence/20260925T2312Z-ALVA041-round2-http/result.json`。

浏览器自动化曾尝试但不计入验收：服务器恢复后 Playwright Chromium cache 缺失且无 system Chrome/Chromium；未下载浏览器、未修改服务器环境，改用真实端口 HTTP 集成验收。失败环境证据：`evidence/20260925T2302Z-ALVA041-round2-browser-unavailable/result.json`。
