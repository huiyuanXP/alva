# 12: 录音转写、纠正与发送

**ID:** ALVA-019

**Parent scope:** T04

**Review reference:** R07

**What to build:** 录音转成可编辑文字，用户纠正后再发送。

**Blocked by:** [ALVA-017](10-multimodal-chat.md)

**Status:** ready-for-agent

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [ ] 真实转写可编辑，取消/失败不误发送；发送以用户修改后的文字为准。
- [ ] 成功、失败和取消后清除录音临时内容，不作为项目永久附件。
- [ ] 文件音源、模拟麦克风、实体麦克风分开留证；未测实体设备保持待验。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `chat`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
