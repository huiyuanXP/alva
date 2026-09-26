# ALVA-029 验收：验收通过并已集成main

2026-09-26 UTC。候选 `71c041e9fbc6d4a597cefc62e1aad75da10229ef`；原实现 xuanpu-chat-6pro，本轮续接 codex-acceptance。066接入已进入main，之前缺少保存门禁的阻断已解除。本轮修复与验收在独立Worktree完成，未发布生产。

## 用户可见结果

保存确认卡、保存前弹窗和右侧审查标签使用同一份当前复核。五类结果保留原因、建议与引用；定位同时标出关联家具、门窗、房间和引擎返回的受阻基线路径，不把受阻路径称为推荐路线。复核区域独立滚动，定位时平面仍可见。

布局/资料变化后旧结果立即标为待复核，旧定位消失、取舍按钮禁用；服务端也拒绝旧审查保存和取舍。手动保存记录原审查版本、采用版本与明确用户取舍，刷新和显式恢复保持这些凭证。恢复不创建新快照，生活设计会话不变。

## 验收证据

[机器汇总](../evidence/20260926-ALVA029-final-summary/summary.json)列出12步独立run：同一候选SHA、相同源码清单、同一私有合成项目和同一个真实living thread。真实模型为Gemini 3.8 Flash High，主入口为 `/api/chat`，业务调用通过阶段HTTP MCP；前置户型/建筑是完整合成夹具，不声称真实识图或生产验收。

| 验收项 | 结果与证据 |
|---|---|
| 未审查不能保存 | `REVIEW_REQUIRED`，快照数0；seed run |
| 分类/确认/真实Markdown | 模型提出候选，页面确认，读取私有Markdown与原话一致；两轮context-model/context-confirm |
| 五类检查、三类生活痛点 | 真实run_layout_review分别报告五类状态，咖啡/宠物/绿植正例3项，原因与引用齐全；review-model |
| 页面定位 | 三类痛点定位与门间受阻路线/两门洞/阻挡物可见；[通路截图](../evidence/20260926T054620677Z-ALVA029-review-browser/door-route-blocked.png) |
| 非空取舍及手动保存 | 咖啡台取舍随v1保存；reviewedRevision=6、adoptedAtRevision=9，刷新一致；review-browser |
| 旧审查不可复用 | 修改家具后，旧保存和旧取舍均返回`REVIEW_STALE`；界面禁止继续确认旧取舍 |
| MCP错误与修复 | 真实request_save返回REVIEW_STALE，原thread实际执行read_user_context→run_layout_review→request_save，错误码/有序修复步骤保留；repair-model |
| 布局修复后重算 | 台面/沙发间隙/植物高度调整并移除阻挡柜，三类痛点与阻塞均消失，保存v2 |
| 快照恢复 | 页面预览并明确恢复v1后凭证/取舍保留，快照总数仍2、原thread不变；restore-browser |
| 生活习惯反例 | 确认“不喝咖啡，不养宠物，不需要绿植”的更正后，家具保持v1样式但三项提示消失；negative-review-model/negative-browser |
| 保存状态复述 | 真实get_snapshot后模型正确报告savedVersion=2及已有保存记录；saved-state-model |

最终候选分组类型检查通过；40/40相关回归通过，覆盖的180份API/合同/测试源码与最终候选逐项哈希一致；最终构建通过。浏览器全部步骤页面错误0。最终构建在 `evidence/20260926T054359Z-ALVA029-release-build-44741/`，保留既有大包警告。

## 合并最新main后的影响验证

验收后同步main `e2713d1`，个人合并候选 `e149155`，纳入刚完成的ALVA-040日照渲染；没有合并冲突，本票复核/保存/MCP逻辑未变。合并候选的分组类型、构建、实际主Chat read_user_context→run_layout_review→request_save、真实浏览器二维路径与三维建筑/日照加载全部通过，页面错误0，项目/快照数/原thread均不变。源码清单与已验候选核对一致，明细见机器汇总integration段。

## 失败与历史边界

- 先前主线cafb8b8缺失门禁的审计见 `evidence/20260926T045348Z-ALVA029-acceptance-audit/`；后续066集成已解除，不再作为现役阻断。
- 本轮首次合成脚本未配置访问入口而失败，修正脚本后重建独立数据。初始预检遇到服务器余量不足/共享锁占用时未启动重任务，恢复后按同限额继续。
- 初次浏览器发现长复核卡使画布离开可视区，路径也缺少可见端点；失败 `20260926T053112928Z-ALVA029-review-browser` 保留。修正后5b9e193已完整通过12步；随后保留首次痛点分析的独立参考区，再于最终71c041e的新项目重跑全部12步，避免旧分析与当前复核混淆。前次证据完整保留。
- 旧029模块50/50与066历史过程记录仅作历史线索；本次真实链路独立留证。

## 知识收尾

neat-freak：代码/合成运行链路 verified-current；文档 changed-and-verified；main集成与最终检查 verified-current；生产及生成记忆 out-of-scope。已枚举157份跟踪Markdown并核查本票规则/结构/交接。全部原工作区、私有合成数据库、失败/成功证据保留；不清理其他任务现场。现有前端bundle超过500KB提示未消除。

原始Vite构建输出有4处reporter行尾空格，完整保留原日志；源码、测试、文档和其余证据的diff检查通过，未将原始日志改写成无告警输出。
