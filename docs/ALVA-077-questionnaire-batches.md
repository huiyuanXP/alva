# ALVA-077 问卷批量发送与候选决策

用户要求：填写问卷只保存，随时退出后由显式按钮统一发送；候选小预览不被日照说明遮挡；关闭等于放弃，放弃不受版本/预览/Chat忙碌限制；新轮候选替换旧轮，同轮逐张处理。

## 行为合同

- 独立 Home Vision、Chat扩展答案、旧问卷确认均不再自动启动家具建议。刷新、切换阶段、项目读取也不启动旧任务队列。
- Chat下方“把问卷的新更改发送给 Chat”发起一次主Chat轮次。服务端冻结当前已保存问卷，生活设计MCP `read_questionnaire_batch` 实际读取完整批次，`suggest_furniture` 或明确的 `skip_furniture_suggestion` 产生结果；没有真实工具结果不能标记完成。
- `questionnaireSent`仅在成功后更新；失败保留待发送，重试读取当前更改。生成期间的新回答不自动再生成，也不被旧批成功清除。状态随Project持久化，刷新后仍能继续。多人回答按填写者保留，附件内容未实际读取时不冒充已知。
- 存在未发送问卷、批次记录或待决候选时，生活阶段自动引导暂停，避免关闭问卷后立即另开模型轮次；手动Chat与阶段往返照常使用。
- 新候选用实际scene/建筑/样式的确定性摘要校验依据，问卷、聊天与元数据更新不使其失效。真实设计变动仍拒绝采用。旧无摘要候选保留原版本门禁，可随时放弃并重新生成。
- 采用仍校验锁定、范围、边界、碰撞，在事务内写入。接受同轮一张后更新同轮剩余卡依据，后续卡仍重新执行当前场景校验。采用不自动保存。
- 拒绝是独立、幂等、无设计写入的请求，不要求当前revision或可用预览；已接受卡不会被拒绝接口撤销。新生成轮次把旧未决候选标记rejected；同轮候选只显示第一张，处理后显示下一张。整组替代方案采用后仍拒绝同组其余项。
- Proposal及组候选的SceneView关闭SunlightReadout；主工作区日照功能保持。卡片×等同“暂不采用”。中英文文案同步。

## 实现与验证

`packages/contracts/alva/questionnaire-batch.ts`为前后端共用待发送比较与快照；`canonical-json.ts`消除数据库JSON对象键重排的影响。`api/furniture/proposal-decisions.ts`集中候选依据、替换与队列更新。原自动recommendation-queue模块退役；旧建议任务仅作兼容记录/显式重试，不自动排空。

专项：`tests/alva-questionnaire-batch.test.ts`，旧建议与组方案相关回归；浏览器：`scripts/alva-077-browser.ts`；实际主Chat→生活MCP→候选→关闭：`scripts/alva-077-chat-browser.ts`。10项相关回归通过；最终类型检查与构建通过（既有bundle体积提示保留）。浏览器专项5项、真实主Chat/HTTP MCP链4项与原阶段导航5项回归通过，页面错误0。已发布固定main `c053dc6`并完成公网登录复验，见[发布收据](ALVA-077-production-release.md)。

- 回归：[20260927T143857Z](../evidence/20260927T143857Z-ALVA066-alva077-validation-399540/output.log)（10项通过；该run后续浏览器因合成origin配置失败）。
- 类型/构建：[20260927T144336Z](../evidence/20260927T144336Z-ALVA066-alva077-browser-final-401910/output.log)。
- 浏览器：[5项结果](../evidence/2026-09-27T144420380Z-ALVA077-browser/result.json)。

失败run保留：首轮测试资源限额；错误合成题库选项；JSONB键顺序导致的差异误判；浏览器探针origin未绑定动态端口；问卷选项定位未包含辅助文本（改用radio角色定位）。尚未把未完成验证称为发布结果。

- 实际模型：[4步结果](../evidence/2026-09-27T144647170Z-ALVA077-real-chat/result.json)，实际依次调用read_questionnaire_batch、get_snapshot、suggest_furniture，生成2候选，仅1张可见。
- 阶段导航：[5步回归](../evidence/2026-09-27T144752610Z-ALVA076-browser/result.json)，自动Chat中切换、英文与窄屏、未确认建筑说明均保持。
- 最终专项类型与运行：[最终run](../evidence/20260927T144634Z-ALVA066-alva077-browser-final-v2-403355/result.json)。产品文件与此前已验类型/构建/浏览器候选一致。

## Implementation handoff

署名codex-batch，独立Worktree完成。ALVA-077实现、回归和合成真实模型验收已完成；个人实现`9c758c6`已squash集成为`c053dc6`，完成固定release、停写备份/回滚与公网登录检查。未修改其他任务、生产密钥或MCP服务配置。

neat-freak：代码/受影响机制文档changed-and-verified，规则verified-current；生成记忆out-of-scope，发布运行态changed-and-verified。既有bundle体积提示与整页窄屏横向溢出未纳入本票；复核Worktree、合成数据库及失败证据保留，不执行清场。
