# 43: 公网与重启恢复复核

**ID:** ALVA-050

**Parent scope:** T15

**Review reference:** R39

**What to build:** 按统一验证码准入方案核验最终版本可重复公网访问及重启恢复。

**Blocked by:** [ALVA-048](41-acceptance-groups-1-4.md), [ALVA-049](42-acceptance-groups-5-8.md)

**Status:** ready-for-agent

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [ ] 固定HTTPS连续10/10；真实SSE有实际增量，跨项目与未验证请求被拒绝。
- [ ] 应用及Tunnel重启后保存内容一致，仍可按授权跨设备重复登录。
- [ ] 只在受控验收项目操作；模型失败/保存失败/越权证据可定位，不变更MCP或其他项目。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `production`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
