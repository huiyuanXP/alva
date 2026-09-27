# ALVA-068 先猜需求，再用结果式问卷验证

状态：**隔离验收通过，已集成main并发布生产**。
正式票：[ALVA-068](../.scratch/alva-completion/issues/45-outcome-questions.md)。保留057独立问卷的题库、条件流程和按人保存；现役模型不变。

## 用户流程

1. 主Chat读取当前填写者的原生Home Vision题目、已保存回答和本轮原话，提出明确标为“尚未确认”的需求猜测、依据及不确定项。
2. 围绕猜测生成扩展问题，提供2–4种不同结果，每种都有具体示例和取舍，允许纠正猜测。标准柜描述柜体组合与取放场景；风格描述墙地颜色、材质视觉与家具搭配。示例不是已验证或已采用的设计。
3. 用户先选择，再明确确认。结果对应的原生答案写回同一填写者的原题，完整结果/示例/取舍保存在该人的扩展问答；独立问卷可重读和继续修改。猜测本身保留为出题背景，不当作已确认需求。
4. 独立问卷改变原题或使其条件隐藏时，旧扩展结论和相关家具任务失效；Chat重新读取当前版本。多人必须在“为谁填写”选择本人，不合并家人的偏好。

普通单选、多选、文本、数值和日期可由Chat扩展问答确认。附件与复杂表单继续使用独立问卷，MCP返回`VISION_USE_FORM`说明下一步，不能凭文件名冒充读取。自己的想法可写入原题自填项；原字段不能接受自由文本时，保存为扩展说明并明确原字段未更新。

## 服务与工具合同

`api/consultation/vision-questions.ts`导出`createVisionQuestionTools`，只装配到living MCP：

- `read_question_context({questionId?})`：未指定题号时列出当前可见题目，指定后返回原生选项、当前填写者版本及依据。只读，不传上传字节，不把附件元数据作为需求事实。
- `ask_question`：要求hypothesis/basis/uncertainty/question/reason/options/assumptions；选项包含title/outcome/example/tradeoff及原生value。验证题号、条件、值格式、唯一性、填写者、版本与原话引用，每轮最多两题。只排队，成功Chat轮次才写入`Project.visionQuestions`，失败或取消不落卡。

旧目录中的ask_question同名但不同结构，Resume时必须重读现役MCP目录。新工具只接受Home Vision原生题号，不能把旧Q07映射成Q07a；旧提取工具propose_answer只保留明确旧题场景，不能写Home Vision。旧增量追问卡引导回主Chat重构问题，不直接复述旧题。

页面`POST /api/intake/vision/chat/confirm`需要业主、生活设计阶段、explicit confirmed、项目revision及题卡ID。服务端按题卡查找选项值，不能由客户端冒写任意value；检查当前填写者version、房屋数字版本和房间。新卡不使用哈希。幂等重试不重复答案或家具任务。

`api/intake/vision-service.ts::saveVisionResponse`为直接问卷与Chat确认共用的验证/版本/保存逻辑，保留扩展答案并使已被修改或隐藏的依据失效。`Response.chatAnswers`保留用户真正确认的文本、原生值、是否映射、evidenceId、确认时间及active/superseded状态。原Project.answers不混入另一套题号。

`answerRecommendations.respondentId`区分Home Vision来源；确认answered状态才排队，生成问题、点选、跳过和未知均不排队。`recommendationContext`只读取仍active的对应填写者已确认扩展答案。ALVA-077起这些任务不再自动生成建议；用户显式发送问卷批次后统一读取，仍使用原许可资产/边界/碰撞校验并等待采用，见[现役批次合同](ALVA-077-questionnaire-batches.md)。

MCP错误包含稳定code、message、retryable、repairActions。典型错误：`VISION_RESPONDENT_REQUIRED`、`VISION_BASIS_INVALID`、`VISION_VALUE_INVALID`、`VISION_VERSION_CONFLICT`、`VISION_SCENE_CHANGED`、`VISION_USE_FORM`。页面保留选择和错误原因，可修正后重试；问卷已更新时重新出题，不覆盖新答案。

## 前端与文件

- `web/src/chat/VisionQuestionCards.tsx`：猜测、依据、不确定项、填写者、过期提示与确认/收起。
- `OutcomeQuestionCard.tsx`：结果/示例/取舍卡，自由输入和明确确认；窄Chat栏按容器宽度单列。
- `web/src/intake/ChatAnswers.tsx`：独立问卷内对应填写者的已确认扩展问答；原题原控件保留。
- `packages/contracts/alva/home-vision/chat.ts`：无运行时依赖的共享题卡与扩展答案类型。
- `api/consultation/instructions.ts`：主Agent基础约束，不在每轮追加全量问卷。

## 验证和边界

早期旧题库独立工具探针属于第一阶段历史证据，不代表现在的原生Home Vision链路。最终以单票列出的主Chat→真实MCP→页面确认→独立问卷→修改后原thread重读证据为准。

分组类型检查、完整前端构建和相关回归通过；最终合并候选26/26通过。真实主Chat三轮覆盖风格、独立问卷修改后的重新出题、回家放包钥匙习惯对应的标准柜结果，均经HTTP MCP读取上下文并出题，随后页面确认与独立问卷重读通过。资源采用共享heavy锁、CPU80%、20%总内存、0swap。大型前端bundle警告仍存在。生产未发布，用户数据未用于测试。

验收使用合成建筑和两位合成填写者，不代表原图识别验收。真实浏览器链关闭自动家具模型排空，确认后检查持久任务；自动启动生活Agent另由受控模型的实际路由回归验证。新题卡支持窄栏；整个主工作区仍有既有390px横向溢出，未在本票重做移动端布局。

最终证据：`evidence/20260926T064443Z-ALVA068-final-integration-88757/`（类型、26项回归、构建、标准柜确认），`evidence/20260926T064758123Z-ALVA068-browser-confirm/`（原生复选框与扩展答案重读），`evidence/20260926T064943Z-ALVA068-todo-final-91628/`（看板搜索与桌面/手机）。

## 2026-09-26 临时公网验收

已将main `cbbdaba`合并到本票Worktree，预览候选`2380658`。两处068完成文档冲突采用main现行记录；产品目录与main一致。新类型检查和构建通过，公网真实Chromium登录、Chat入口与healthz通过，页面错误0。

地址：https://chamber-supposed-boring-opponents.trycloudflare.com 。这是临时Quick Tunnel，服务停止后不可用；不影响生产域名。登录码只保留在私有`.runtime/alva068-joint/access-code`并交付用户，不进Git。

使用ALVA-068合成项目及Alex/Sam填写者，选择Alex后可询问“我回家经常乱放钥匙和包，先猜我的需求，再让我比较几个标准柜方案”，确认回答后打开Your Home Vision查看原题与扩展问答。未采用的示例不改变家具或墙体；不要将合成建筑当真实识图结果。

运行：Worktree `/home/ubuntu/Alva-worktrees/ALVA-068-codex-outcome-questions`；应用127.0.0.1:4188；用户服务`alva068-preview-app`与`alva068-preview-tunnel`；私有启动入口`.runtime/alva068-preview/server.mts`和`preview.env`。使用独立合成数据库，不访问生产项目。禁止同时对该测试库运行探针。

应用、Tunnel及验证共用`alva066.slice`：CPU80%、总内存20%（803680256 bytes）、swap0。旧066预览应用暂时停止，为新预览腾出同一预算；原数据库与Tunnel保留，不再将旧链接列为当前预览。

证据：`evidence/20260926T080258Z-ALVA068-preview-build-113686/`、`evidence/20260926T080427Z-ALVA068-preview-public-114235/`、`evidence/20260926T080429727Z-ALVA068-public-preview/`。neat-freak：代码/文档/临时运行态changed-and-verified；生产发布与生成记忆out-of-scope；原复核现场保留，既有bundle警告未改。

2026-09-26生产发布完成：固定main 6eef743，公网登录/资源/当前户型MCP与独立问卷入口通过；生活问卷同步使用隔离证据。部署/回滚和边界见[生产收据](ALVA-068-production-release.md)。

阶段开场与恢复后的主动问卷引导见 [ALVA-073](ALVA-073-stage-guidance.md)：实际查询当前填写者，跳过已回答/未知/跳过项，复用有效待确认卡；复杂表单仍使用本票的独立问卷入口。
