# ALVA-088 简化进入生活设计

2026-09-30 用户授权：取消户型到生活设计的独立建筑生成、模型校验与确认前置；诊断不必全部消除，特殊墙可以保留，允许用户选择继续。开发分支 `task/ALVA-088-codex-entry`；实现、验收和发布状态分开记录。

## 行为与依据

主工作区的 SceneView 和漫游原本已直接使用户型数据渲染，旧建筑生成结果并非显示必需。现役流程为识别户型→可选修正/校准→确认按当前户型继续→生活设计。已有已采用户型可直接切换；新候选通过统一 Vision 确认卡采用。

户型诊断仍返回实际问题，用户可以选择保留它们。确认时按原样采用当前墙、房间和门窗，不删墙、不修正几何、不伪造校准，也不制造 confirmedBuilding。未校准尺寸保持null，问题与用户选择写入拓扑 assumptions / changes；只有数据结构缺失、无可用房间等无法提供户型的情况仍拒绝进入。后续具体家具操作继续按各自位置/碰撞规则校验。

## 接入

`api/topology/living-entry.ts` 为预览和采用的共用服务；户型 MCP `request_living_entry(expectedRevision)` 与按钮 `/api/chat/stages/prepare-living` 创建同一个 `enter_living` 确认卡。模型只能出示卡片，用户点击后 `/api/chat/actions/confirm` 在事务中校验revision、卡片版本、角色与阶段并采用户型，然后立即切换。旧卡过期可刷新，请求ID重放不重复采用。切换仍保留两阶段原thread与交接摘要。

生活MCP、问卷确认、房间风格、家具生成和建议改为依赖已采用拓扑、scene和无待编辑candidate。旧建筑数据及兼容HTTP API保留，独立拓扑确认、建筑生成/确认工具和UI从主流程退役；旧thread通过更新后的基础指令获得现役规则。

## 验收与交接

20项相关回归通过：新增3项覆盖问题保留、空户型拒绝、卡片过期/重放、实际Chat MCP、问卷确认和风格采用；既有阶段引导、会话、授权与恢复回归通过。最终类型检查 `ALVA088-final-types-20260930b`、构建 `ALVA088-final-build-20260930a` 通过，仅保留既有大bundle提示。

最终合成浏览器 `ALVA088-final-browser-20260930a` 与真实模型 `ALVA088-real-20260930d` 均完成6步：按钮确认卡/取消、主Chat实际request_living_entry、用户确认保留未校准特殊墙、生活MCP读取问卷、刷新/阶段往返、无需建筑结果的实际3D画面。真实调用包含get_snapshot、request_living_entry、read_question_context和ask_question；页面错误0。截图查看后删除。

失败证据：首轮浏览器/真实探针使用随机端口但未传origin，修正脚本配置后重跑；真实b轮提前读取上轮已完成消息，改为等待新assistant数量；真实c轮模型仍在生成问卷时触发180秒探针超时，最终d轮按既有Chat600秒上限等待通过。扩大回归初轮暴露默认阶段推断变化，保留旧项目原默认阶段并由显式入口切换后通过。失败未标成业务成功，不改生产数据。

neat-freak：代码/规则verified-current，受影响合同changed-and-verified；生产发布pending；生成记忆out-of-scope。Worktree和验收现场保留，产物24小时过期，原有主目录未跟踪文件未动。Implementation handoff：由Codex完成，个人实现`b77edde`；已由main串行集成，准备直接发布。
