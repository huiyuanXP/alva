# ALVA-029 验收复核：未通过

2026-09-26 UTC；主线候选 `cafb8b8dc8fb2ea7be5e51fa72c6e26168113fef`。本次执行验收审计，不接管原负责人、不修改产品代码、不部署。ALVA-029 保持 in-progress，ALVA-030 不解锁。

## 审计时的阻断项

审计时主线 `api/snapshots/routes.ts` 的 `/api/save` 只执行 `validateScene`，缺少当前审查校验和采用凭证。真实 Fastify 路由配合合成的已确认拓扑/建筑/家具与替身存储实测：无 `layoutReview` 时仍返回 HTTP 200，且无 `layoutReviewAdoption`。因此未满足“保存记录采用的审查版本和用户取舍”。这是路由级复现，不冒充真实数据库持久化或生产写入。

审计时主线也尚无 `api/review/`、`api/user-context/` 及生活设计 MCP 新复核入口；旧 `/api/review` 不能代替本票合同。

## 066 集成候选更新

用户已授权合并 066。候选包含 `saveProjectWithReview`、审查采用凭证及 review/user-context 模块，原主线路由缺口已随用户授权的 066 候选 c53d3ac 集成 main 补齐；本次合并不将 029 标记为完成，下面记录的非空取舍、页面定位等整票联合验收继续 pending。原审计证据不改写。

## 已核查证据与边界

| 验收项 | 核查结果 |
|---|---|
| 五类检查、三类生活痛点正反例、原因与定位数据 | 029 独立模块 dd6f948 / 交接8aa0f1a已有实现；核查历史日志50/50、类型和构建记录，本轮未重复执行 |
| 页面对象/路径定位、布局变动后的当前结果 | 最终候选的完整交互验收仍缺，不能以模块输出代替 |
| 旧审查失效、采用版本与用户取舍保存 | 模块与存储测试有通过记录；当前主线保存路由门禁缺失，整体验收未通过 |
| 主Chat实际MCP→读取Markdown→复核→保存 | 066过程证据已通过，尚未构成当前最终候选全票结果 |

066 工作区 HEAD 在读取时为 `f1eeff2`，含 api/chat.ts、api/model.ts、api/store.ts、web/src/main.tsx 等未提交改动。其 `20260926T032820114Z-ALVA066-review-model` 与 `20260926T032844174Z-ALVA066-save-confirm` 是最新已核查过程证据；后者 savedVersion=2、reviewedRevision=151、adoptedAtRevision=153，decisions为空。不能据此证明非空用户取舍和所有三类痛点在当前同一SHA下完成端到端复验，也不能拼接不同版本结果为整票通过。

## 下一步补验

由原029/066负责人固定包含最新main的联合候选SHA，完成真实主Chat MCP分类/确认与更正、Markdown读取、五类复核；通过页面定位及三类痛点正反例，修改布局后拒绝旧审查；明确记录至少一条用户取舍，手动保存后刷新/恢复核对审查版本与取舍，验证失败不冒称成功。受影响回归通过后按现有集成流程合main，再关闭029。当前不覆盖他人工作区、不抢占共享入口、不扩大为066实施任务。

## 本次证据与知识收尾

路由探针及结果见 [probe.ts](../evidence/20260926T045348Z-ALVA029-acceptance-audit/probe.ts)、[result.json](../evidence/20260926T045348Z-ALVA029-acceptance-audit/result.json)。初次运行器因未继承PATH找不到node，未执行探针；补传PATH后成功，失败原因和重试独立记在 runner-attempts.json。

neat-freak：主线代码/路由缺口 verified-current；本次文档 changed-and-verified；最终联合MCP/浏览器/集成 pending；生产运行态及生成记忆 out-of-scope。已机械枚举文档、检查规则入口与Git/worktree状态，仅审计本票影响面。既有构建大包警告未解决，历史通过不改写。所有029/066未完成工作区与证据保留，本次不安排清场。单次路径指针临时文件已删除；可复跑探针作为验收证据保留。
