# 24: 设计师只读访问与撤销

**ID:** ALVA-031

**Parent scope:** 补齐U30

**Review reference:** R19

**What to build:** 业主授权设计师查看当前项目，并能撤销该访问。

**Blocked by:** [ALVA-008](01-shared-login-code.md)

**Status:** ready-for-agent

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [ ] 设计师也必须通过统一验证码门槛，分享不绕过入口限制。
- [ ] 页面可查看授权内容；直接调用编辑/采用/保存/恢复接口也被拒绝，不能仅隐藏按钮。
- [ ] 撤销及跨项目请求拒绝；共享验证码不自动升级角色，不建设完整账号平台。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `access`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
