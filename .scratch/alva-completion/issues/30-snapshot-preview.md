# 30: 快照列表与状态预览

**ID:** ALVA-037

**Parent scope:** T10

**Review reference:** R25

**What to build:** 点击一个手动保存的快照，只读预览该存档点的完整状态。

**Blocked by:** [ALVA-036](29-manual-snapshot.md)

**Status:** done

**Execution:** 2026-09-26 由 Lexie 完成；复用 ALVA-036 手动快照后端合同，新增快照历史与独立只读预览层。两轮验收通过后集成 main。

- [x] 列表仅展示用户手动保存的存档点，编号/时间明确，与当前未保存工作稿区分；没有快照时显示空状态。
- [x] 点击快照加载其2D/3D、需求与依据等对应状态，不调用模型重新生成、不修改工作稿；退出预览回到原工作状态。
- [x] 不要求逐操作记录、差异时间线或双版本比较；预览失败可重试且工作稿不受影响。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `snapshots`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## Implementation handoff · 2026-09-26 · Lexie

实现完成：新增 `web/src/snapshots/SnapshotHistory.tsx` 作为独立只读快照层，不把旧快照写回 App 当前 `project`。历史列表只读取 `/api/versions`，顶部单独显示“当前工作稿”及是否有未保存修改；手动快照逐条显示版本号、摘要和保存时间；无快照时显示明确空状态。点击“只读预览”仅 GET `/api/versions/:version`，覆盖层内分别提供二维、三维、需求与依据三个只读页签，直接使用快照中的 scene/building/answers/findings/evidence，不调用模型重新生成。退出预览只是关闭覆盖层；只有业主明确点击“恢复到工作稿”并二次确认后才调用现有 `/api/restore`。

预览失败保留当前工作稿并提供“重试这个快照”；读取不存在版本返回 404 不修改工作稿。designer 可读取版本列表/快照，但恢复仍被服务端 403。修复了 `/api/versions` 的真实时间序列化缺口：PGlite timestamp 之前经 Fastify 输出为 `{}`，`AlvaStore.versions()` 现在统一转成 ISO 字符串，满足票面“时间明确”。

第一轮验收：ALVA-037 专项 + ALVA-036 手动快照回归共 15/15 通过；覆盖只手动保存建快照、时间 ISO、完整状态读取、重复预览不污染当前草稿/版本列表、缺失快照 404 不污染、designer 只读预览不能恢复。TypeScript、production build、`git diff --check` 通过。证据：`evidence/20260926T-ALVA037-round1/result.json`。

第二轮验收：真实监听 `127.0.0.1:43137` + 隔离 PGlite + production assets。production bundle 包含“当前工作稿 / 只读快照 / 只读预览 / 二维 / 三维 / 需求与依据 / 重试这个快照 / 明确恢复到工作稿 / 还没有保存快照”。真实 HTTP 链路验证：空列表 → 手动保存 v1（ISO 时间）→ 完整快照读取 → 当前工作稿继续修改 → 重读 v1 当前 revision/hash 不变 → 读取 v999=404 且草稿不变 → 显式 restore 才替换工作稿，且 restore 不自动创建新快照。随后相关回归共 20/20，通过 TypeScript、production build、`git diff --check`。证据：`evidence/20260926T-ALVA037-round2/result.json`。main 集成态在重新构建 production assets 后再次执行同一 HTTP 链路通过，证据：`evidence/20260926T-ALVA037-round2-main/result.json`。
