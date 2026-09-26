# 41: 最终回归：导入、Chat、问卷、痛点

**ID:** ALVA-048

**Parent scope:** T15

**Review reference:** R37

**What to build:** 在最终功能代码上跑完验收第1–4组并展示真实证据。

**Blocked by:** [ALVA-047](40-group-proposals.md)

**Status:** done

**Execution:** 已完成。lzy 接手后在独立 Worktree 建立 Cloudflare 验收通道，修复真实 Chat 子进程调用问题；已合并 main、部署并完成生产健康检查。

**Owner:** lzy

**Branch / Worktree:** 原分支 `task/ALVA-048-lzy` 已合并 main；Worktree 已释放。

- [x] 两张不同真实户型经识图/校准；同源拓扑与建筑生成关联有效，保留坏几何拒绝。
- [x] 真实文字/图片/转写、取消重试、问卷双向/锁定、痛点双阶段正反例全部验证。
- [x] 统计必验断言与截图，新验收 skip 为 0；实体麦克风缺证保持待验，未冒充完成。

**Acceptance result:** 针对性回归 126/126 通过，0 失败，0 跳过；真实文字 Chat、参考图片 Chat、音频转写均成功，场景/快照保持不变，图片未写入项目数据。证据见 `evidence/20260926T-ALVA048-chat-acceptance/result.json`、`evidence/20260926T-ALVA048-real-transcription/result.json` 及本票命名的历史验收目录。提交 `c9ef266`，合入 main 提交 `34e3761`。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `acceptance-business`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
