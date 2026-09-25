# 15: 房间用途与布局分开确认

**ID:** ALVA-022

**Parent scope:** T05

**Review reference:** R10

**What to build:** 先改变房间用途，再独立决定是否采用布局建议。

**Blocked by:** [ALVA-021](14-candidate-adoption.md)

**Status:** done

**Execution:** 已由 lzy 在独立 Worktree 完成完整验证并合入 main，集成提交待收尾记录；后续依赖可按 NextTask 规则继续。

- [x] 只确认用途不会自动移动、替换或删除家具。
- [x] 用途引发的布局建议可预览、拒绝或局部采用。
- [x] 锁定房间拒绝修改；用途与布局分别保存确认依据。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `proposals`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

- owner: lzy
- branch/worktree: task/ALVA-022-lzy / /home/ubuntu/Alva-worktrees/ALVA-022-lzy
- implementation: 新增独立用途确认路由和用途确认记录；通用布局命令不能绕过用途确认；用途确认不移动家具；布局候选支持预览、暂不采用、局部采用并单独记录；拒绝一个候选不会使同批其他候选失效；锁定房间由服务端拒绝。
- verification: npm run check；ALVA-022、ALVA-021、ALVA-020 与业务联合回归 9/9；npm run build:alva；真实 Chromium 脚本 scripts/alva-022-browser.ts 通过，证据 evidence/20260925T093352998Z-ALVA022-browser/，控制台错误 0。
- state: implementation complete in worktree; ready for main integration.
