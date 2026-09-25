# 21: 首次需求分析与生活痛点

**ID:** ALVA-028

**Parent scope:** T07

**Review reference:** R16

**What to build:** 确认需求后显示有原话依据的生活痛点。

**Blocked by:** [ALVA-015](08-chat-answer-confirmation.md)

**Status:** ready-for-agent

**Owner:** 未认领（历史负责人 yang-chatgpt）

**Preserved branch / Worktree:** `task/ALVA-028-yang-chatgpt` / `/home/ubuntu/Alva-worktrees/ALVA-028-yang-chatgpt`（已创建，未开工）

**Execution:** 2026-09-22 由 yang-chatgpt 认领；用户要求仅认领并说明，暂不实施。任务聚焦确认需求后的生活痛点分析与展示，不涉及3D开发。

**Execution state:** pending

**Recovery 2026-09-25:** 用户授权重启后协调退回待办，本票此前即暂停且未实施，不说成代码执行失败。当前署名/资源占用已释放，保留历史分支 `f3aedbb` 和干净Worktree；未发现该工作区执行进程。现役看板仅支持四种Status，因此Status回到ready-for-agent，pending表达在Execution state；定义就绪不意味着开工许可。前置ALVA-015已done并有两轮验收，后继ALVA-029仍不可解锁。

**Next action:** 等新开工指令，读取ALVA-015和原始需求证据，重新登记负责人/共享文件后，在原或新隔离Worktree实施咖啡/宠物/绿植的命中与不命中用例、原话来源和重复分析幂等；不改3D，不因本轮恢复自动开工。证据/回滚见 `docs/INCIDENT-2026-09-25-server-recovery.md` 与 `evidence/20260925T034733Z-server-recovery-2cae71/`。

- [ ] 咖啡操作台、宠物玩具、绿植遮光各具命中和不命中样例。
- [ ] 区分偏好推导与特殊需求，保留原话、理由、空间、置信及待确认状态。
- [ ] 不编造健康或身份；重复分析不重复生成同一条问题。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `review`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
