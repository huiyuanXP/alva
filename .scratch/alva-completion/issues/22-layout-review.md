# 22: 布局调整与保存前冲突复核

**ID:** ALVA-029

**Parent scope:** T07

**Review reference:** R17

**What to build:** 布局变动后重新定位问题，保存前呈现当前审查结果。

**Blocked by:** [ALVA-028](21-initial-pain-analysis.md), [ALVA-024](17-furniture-transform.md)

**Status:** in-progress

**Owner:** codex-acceptance（2026-09-26用户授权续接；原实现 xuanpu-chat-6pro）

**Branch / Worktree:** task/ALVA-029-codex-acceptance / /home/ubuntu/Alva-worktrees/ALVA-029-codex-acceptance

原实现分支及工作区完整保留。066已集成main，本轮继续联合验收与本票必要修复。

**Execution:** 2026-09-26（新加坡时间）用户指定 xuanpu-chat-6pro 认领，ALVA-028/024 已集成 main。已通过 Herdr 第一终端第一页与 ALVA-066 实际讨论并确认分类 Markdown 位置/来源/分工；独立实现提交 dd6f948，固定代码类型检查、50/50 回归和构建通过，证据交接提交8aa0f1a。详细合同与证据在个人工作区 docs/ALVA-029-user-context-layout-review.md，协调交接在主目录 .runtime/alva-coordination/ALVA-029-066-implementation.md。未修改066占用入口；主Chat生产链、实际生活设计MCP、保存前UI与同SHA联合验收仍待066，故保持in-progress，未集成/未部署。

**Acceptance audit (2026-09-26 UTC):** 未通过。主线保存路由对无当前审查的已确认布局仍返回200，缺少审查采用凭证；066有过程通过证据但最终候选尚未固定及集成。保留原署名与in-progress，详见[验收复核](../../../docs/ALVA-029-acceptance-audit.md)。

- [ ] 对当前版本分别检查几何、通行路径、风格/行为、原需求冲突和家具合理性。
- [ ] 每项显示原因/建议并定位对象或路径；上述三类生活痛点复跑正反例。
- [ ] 旧审查与当前布局不混淆；保存记录采用的审查版本和用户取舍。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `review`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff — 2026-09-26 / xuanpu-chat-6pro

已通过 Herdr 第一终端第一页与 ALVA-066 主 Chat Agent 实际讨论并取得书面合同；不是单方面约定。现役独立模块合同见 [用户信息与布局复核](../../../docs/ALVA-029-user-context-layout-review.md)。

用户信息位于 ALVA_DATA_DIR/user-context/<projectId>/generations/<revision>-<fingerprint>/，分 habits/preferences/requirements/unresolved/index 五份 Markdown，以 current.json 原子发布。保留原话、来源、范围、确认状态及更正链；缺失/过期/损坏不冒充无冲突。独立模块提供五类可解释复核、对象/路径定位、输入版本绑定、用户取舍及手动保存采用凭证。MCP adapter 工厂导出 read_user_context、run_layout_review，需由066装配到生活设计包。

已有回归证据：`evidence/20260925T193904Z-ALVA029-regression-542737/`，49/49 通过，含新模块、ALVA-028 和真实 HTTP/PGlite ALVA-036 快照回归。首轮 33/34 的待确认记录去重缺陷已修复，失败证据 `evidence/20260925T193728Z-ALVA029-modules-542374/` 保留。最后补充空 dataRoot 回归后，固定实现提交并重新运行最终门禁；最终结果在后续证据交接记录。

状态仍 **in-progress**：此增量未修改共享 Chat/schema/store/API/main.tsx，没有上线或真实阶段 MCP 通过声明。066 负责提取/确认/更正的生产端和共享入口；待同一候选 SHA 完成真实 Chat→Markdown→复核→页面定位/保存前展示→手动保存联合验收后关票。不自动创建快照，不关闭专业未知，不接预算或自动报价。
