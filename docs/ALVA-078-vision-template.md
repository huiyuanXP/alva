# ALVA-078 全局 Vision 模板与分段问卷循环

用户授权：以 Your Home Vision 的苹果风格作为问卷和选择模板，右侧逐题填写，每段最多四题，Submit 一次发送左侧 Chat，Agent 统一回答并生成下一段；房间范围和设计采用使用 Room Vision 弹窗；取消右侧家具等独立选项卡。

状态：done，已验收并集成 main；署名 codex-vision；依赖 ALVA-077 已集成。已发布固定 main 3542aaa；见[发布收据](ALVA-078-production-release.md)。

## 行为合同

- 生活设计右侧只展示 Vision 问卷。初始/复杂字段复用原 Home Vision 条件表单；主 Chat 通过生活 MCP 的 read_question_context、ask_question 生成每段最多四题，逐题选择，可回看并修改，整段 Submit 后才保存生成题的答案。原表单保留自动保存。段末 Submit 在 Chat 空闲时启动一次 Chat；忙碌时只保存并继续填写，保留左侧显式发送按钮，空闲后也不自动补发。
- Submit 将本段问题和所选答案合为一条可读的用户消息，沿 ALVA-077 固定批次链路读取全部已保存回答，生成一次建议，再实际调用问卷工具准备下一段。没有新回答时不会自行循环调用模型；已有待答段会阻止自动开场抢占，刷新不重复发送。
- 服务端整段确认复用单题确认/原生问卷校验，在副本上处理、全部成功后提交。同段同填写者、同轮、当前回答版本和建筑依据必须有效；后一题失败不留下前面题的部分写入。已成功提交的相同回答可幂等重试；不能以重试更换已提交答案。错误保留稳定错误码与修复说明。
- 新题卡仅在填写者答案版本仍匹配且没有未答段时发布；不能覆盖并发填写的待答段。多人不合并回答。失败批次保留待发送状态，沿 Chat 的重试入口恢复。
- 房间范围及设计候选共用 Your Room Vision 模态弹窗，保留真实 3D 预览、采用范围、拒绝与 Escape 关闭语义。房间样式、用户偏好和阶段确认使用同一 Vision 外框。采用仍由原业务服务校验；关闭不采用，不自动保存。
- 原生字段与 Agent 选项共用 VisionChoiceButton，范围和采用勾选共用 VisionToggle；Home/Room 表面共用 VisionShell。颜色、圆角、字体、选中态沿用原 Home Vision，样式集中在 web/src/vision 与 intake/vision.css。生活侧栏桌面加宽，窄屏垂直排列。

## 验证入口

- tests/alva-vision-section.test.ts：多题原子提交、混合填写者/过期拒绝、四题限额、提交重试。
- tests/alva-questionnaire-batch.test.ts：批次冻结、失败重试、后续更改保留、候选决策。
- tests/alva-stage-guidance.test.ts：真实阶段断点与现役 MCP 引导回归。
- scripts/alva-078-browser.ts：确定性浏览器循环；加 --real 使用真实主 Chat → HTTP MCP 验证接续问卷。

## Implementation handoff

个人实现94415d4，独立分支 task/ALVA-078-codex-vision；12项相关回归（问卷/批次7项、阶段引导5项）、分组类型检查、生产构建通过。最终浏览器8项、真实主Chat/生活HTTP MCP 6项通过，页面错误0；真实模型实际生成下一段4题，并对一次 VISION_VERBATIM 错误按工具反馈重新出题。170个 api/web/src/packages/contracts 产品文件与最终验收清单一致。

- [最终类型/阶段回归/构建与联合验收](../evidence/20260927T151855Z-ALVA066-alva078-acceptance-416183/result.json)
- [问卷与批次7项回归日志](../evidence/20260927T151323Z-ALVA066-alva078-final-candidate-413707/output.log)（该run随后发现自动引导抢占并中断真实模型阶段，不作为完整最终通过收据）
- [8项浏览器结果](../evidence/2026-09-27T152026579Z-ALVA078-browser/result.json)
- [6项真实主Chat/MCP结果](../evidence/2026-09-27T152053111Z-ALVA078-real-chat/result.json)
- [右侧问卷](../evidence/2026-09-27T152053111Z-ALVA078-real-chat/next-section-desktop.png)、[Room Vision确认弹窗](../evidence/2026-09-27T152026579Z-ALVA078-browser/room-vision-popup.png)

生产已切换078固定release；旧068临时预览使用原工作区、原私有配置和原合成数据库恢复。所有失败 run 与合成复核现场保留。

已知验收环境问题：旧临时预览与测试共享整机 20% 内存限制，首轮扩大回归触发 OOM；暂停旧临时预览后单元回归通过。多进程 Chromium 加三维弹窗也触发一次 OOM，后续采用单进程 Chromium 降低验收占用，不改变产品渲染或放宽资源限额。旧预览已按原入口恢复，回源4188 /healthz复验记录随收尾保留。

最终复验还发现待答生成问卷未阻断自动阶段引导，已在前端接续门禁补上等待当前段的条件；专项浏览器增加等待后无额外模型轮的断言。该中断 run 单独保留，不将早先通过结果冒充最终候选。

## neat-freak 收尾

代码与受影响合同/结构文档 changed-and-verified；AGENTS 单一规则来源 verified-current；生产公网表面 verified-current，登录后复验 pending；生成记忆 out-of-scope，未手改；工作区保留本票 Worktree、合成现场和失败证据供复核。既有 Vite bundle 体积提示保留，未把整站手机页头布局纳入本票。临时预览恢复后再次核验运行态；集成人覆盖根交接与认领表。

集成收尾：已同步main的077发布记录，170个产品文件与最终验收候选一致，main构建通过。原068临时预览已恢复且健康，生产现已发布078，详见发布收据；[收尾收据](../evidence/20260927T152053111Z-ALVA078-closeout/result.json)。
