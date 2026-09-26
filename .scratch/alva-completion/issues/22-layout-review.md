# 22: 布局调整与保存前冲突复核

**ID:** ALVA-029

**Parent scope:** T07

**Review reference:** R17

**What to build:** 布局变动后重新定位问题，保存前呈现当前审查结果。

**Blocked by:** [ALVA-028](21-initial-pain-analysis.md), [ALVA-024](17-furniture-transform.md)

**Status:** done

**Owner:** codex-acceptance（2026-09-26用户授权续接；原实现 xuanpu-chat-6pro）

**Branch / Worktree:** task/ALVA-029-codex-acceptance / /home/ubuntu/Alva-worktrees/ALVA-029-codex-acceptance

原实现分支及工作区完整保留。066已集成main，本轮继续联合验收与本票必要修复。

**Execution:** 原模块dd6f948已随ALVA-066进入main。2026-09-26用户授权codex-acceptance继续联合验收，补齐多对象/受阻路径定位、保存卡明细、滚动与旧结果失效展示，保留首次分析参考。最终个人候选71c041e：类型/构建通过、40/40相关回归、同SHA同thread的12步真实主Chat/MCP/浏览器验收通过；页面错误0。已完成main集成与验收收尾，ALVA-030依赖就绪。详见[验收报告](../../../docs/ALVA-029-acceptance-audit.md)。

- [x] 对当前版本分别检查几何、通行路径、风格/行为、原需求冲突和家具合理性。
- [x] 每项显示原因/建议并定位对象或路径；上述三类生活痛点复跑正反例。
- [x] 旧审查与当前布局不混淆；保存记录采用的审查版本和用户取舍。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `review`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff — 2026-09-26 / xuanpu-chat-6pro

已通过 Herdr 第一终端第一页与 ALVA-066 主 Chat Agent 实际讨论并取得书面合同；不是单方面约定。现役独立模块合同见 [用户信息与布局复核](../../../docs/ALVA-029-user-context-layout-review.md)。

用户信息位于 ALVA_DATA_DIR/user-context/<projectId>/generations/<revision>-<fingerprint>/，分 habits/preferences/requirements/unresolved/index 五份 Markdown，以 current.json 原子发布。保留原话、来源、范围、确认状态及更正链；缺失/过期/损坏不冒充无冲突。独立模块提供五类可解释复核、对象/路径定位、输入版本绑定、用户取舍及手动保存采用凭证。MCP adapter 工厂导出 read_user_context、run_layout_review，需由066装配到生活设计包。

已有回归证据：`evidence/20260925T193904Z-ALVA029-regression-542737/`，49/49 通过，含新模块、ALVA-028 和真实 HTTP/PGlite ALVA-036 快照回归。首轮 33/34 的待确认记录去重缺陷已修复，失败证据 `evidence/20260925T193728Z-ALVA029-modules-542374/` 保留。最后补充空 dataRoot 回归后，固定实现提交并重新运行最终门禁；最终结果在后续证据交接记录。

状态仍 **in-progress**：此增量未修改共享 Chat/schema/store/API/main.tsx，没有上线或真实阶段 MCP 通过声明。066 负责提取/确认/更正的生产端和共享入口；待同一候选 SHA 完成真实 Chat→Markdown→复核→页面定位/保存前展示→手动保存联合验收后关票。不自动创建快照，不关闭专业未知，不接预算或自动报价。

## Implementation handoff — 2026-09-26

完成人 codex-acceptance；原模块 xuanpu-chat-6pro。个人实现36b75c7，最终运行候选71c041e。12步同候选真实链覆盖分类、确认、Markdown、五类复核、三类痛点正反例、通路定位、非空取舍、保存v1、改动后旧审查拒绝、MCP实际错误修复、保存v2、恢复v1/刷新以及正确保存状态复述。汇总 `evidence/20260926-ALVA029-final-summary/summary.json`。

neat-freak已对齐本票代码、运行证据、目录与文档；原失败run、私有现场及其他工作区保留。未部署本票界面增量；已有bundle警告保留。main集成已完成并解锁030，不自动开工030。

同步最新main e2713d1后的个人合并候选e149155：受影响类型/构建、实际主Chat复核MCP与真实二维/三维浏览器复验通过；没有修改本票复核/保存业务逻辑。main已集成，未发布本票新增界面。

main集成前个人交接提交 `f1ac9da44a2f879d7f3e7e73360051045e721a4e`；集成提交可由 `git log --grep=ALVA-029` 追溯。
