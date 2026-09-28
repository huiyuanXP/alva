# ALVA-065 主 Chat Agent 与 Harness 合同

2026-09-25 起，本文件是后续功能接入主 Chat 的现役入口说明。主 Chat 的代码身份是 `api/main-chat-agent.ts` 中的 `mainChatAgent`；服务端装配在 `api/chat.ts`，运行器在 `api/codex.ts`。网页唯一主入口是登录后首页左侧“咨询”栏，`web/src/main.tsx` 的发送动作请求 `POST /api/chat`；`POST /api/chat/cancel` 取消当前请求。`GET /api/models` 当前只列出 `gemini-3.8-flash-high`（ALVA-067 更新）。图片户型识别也使用 Gemini 3.8 Flash High，但由 `api/import.ts` 独立选择。

## ALVA-066 当前实现（候选已隔离实测，生产状态见 CURRENT）

```text
登录后的咨询输入框 → POST /api/chat → registerConsultation
  → 项目所属阶段、最新快照、未送达摘要
  → runCodex：新建或 thread/resume 同一项目阶段的持久 thread
  → mcp_list_tools / mcp_call_tool（App Server dynamicTools 受控桥接）
  → 本机 HTTP MCP /mcp/floorplan 或 /mcp/living
  → 共用业务服务校验 → SSE 结果/确认卡/UI action → 页面与持久状态
```

安装版原生 HTTP MCP 的目录和 Resume 探针可用，但现役模型网关没有完成原生工具调用，因此当前采用已批准的 dynamicTools → HTTP MCP 桥接，不能宣称原生调用通过。两个固定入口解决旧 thread 无法替换 dynamicTools 目录的问题；Agent 先列出现役目录，再用 `mcp_call_tool({name,arguments})` 执行业务工具。业务工具登记在 `api/chat.ts` 的 `packs`，HTTP transport/grant 在 `api/mcp/`；桥接不绕过该层的授权和错误。

`api/codex.ts` 对主 Chat 保留项目/阶段专属 CODEX_HOME 和非临时 thread。阶段切换先预检 Resume，进入时以 `thread/inject_items` 送达快照和待送达摘要；`alva_chat_stages` 持久化 thread 与送达 ID。恢复去重核对当前 thread 私有 rollout，不能跨项目读取历史。主 Chat 仍禁止 shell、文件写入和网页搜索；真实项目写入仅由受控业务工具执行。辅助识图/建筑调用保持独立临时 thread，无主 Chat 工具和会话继承。

基础约束通过 thread/start、thread/resume 的 `baseInstructions` 配置维护，不作为普通用户消息重复追加。普通轮次传当前请求、必要调用约定和项目 revision，不附完整项目及聊天历史；详情由 `get_snapshot` 按需读取。手动阶段导航先持久化阶段和交接摘要，接续Chat/自动引导恢复原thread并实际送达未送达摘要；导航不等待模型，见[ALVA-076](ALVA-076-stage-navigation.md)。页面初始化、恢复和阶段切换另通过同一主Chat发起系统引导轮，当前阶段 MCP 的 get_stage_guidance 定位真实断点；不写伪用户原话，已完成断点去重，失败可重试。具体顺序和执行证据门禁见 [ALVA-073](ALVA-073-stage-guidance.md)。传配置参数不等于追加历史；不假定 compact 会修复模型漏调工具，也不把目录读取成功当业务执行成功。

旧每请求临时 thread 已删除，迁移只能保留历史项目消息并首次创建阶段 thread、注入摘要；不得宣称 Resume 旧临时会话。长会话使用提前自动压缩，恢复仍是原 thread；必要时可用官方 `thread/compact/start`，不能用新会话冒充压缩。

## 新功能接入合同（2026-09-25 起生效）

实施票为 [ALVA-066](ALVA-066-stage-mcp.md)。下面是现行功能合同。实现候选、main 集成、生产发布分别记录，不把隔离验收等同上线。

主 Chat 默认优先通过 MCP 使用业务功能。每个后续用户功能必须在同一 Ticket 将工具接入所属 MCP，并以主 Chat 实际调用的端到端结果验收；直接 API、按钮、提示词或自然语言成功回复不能代替调用证据。只有本票确证原生 MCP 不可用时，允许由 dynamicTools 桥接相同 MCP 服务与校验合同，并明确记录当前传输方式。

| 归属 | 工具范围 | 可见阶段 |
|---|---|---|
| 户型导入 MCP | 附件识图、标注、墙/门窗、校准、拓扑确认、建筑生成与确认；受约束界面操作 | 户型 |
| 生活设计 MCP | 已完成问卷、家具、用途/布局、偏好、审查、保存、交付；房间样式候选；受约束界面操作 | 生活设计 |

每次主 Agent 只配置当前阶段的一包工具，服务端再次检查短期凭据绑定的项目、角色、阶段、有效期及最新状态。识图与建筑生成等辅助模型不得继承主 Chat MCP。新功能必须明确归属；跨阶段流程由阶段切换与交接摘要连接，不给单个 Agent 同时装载两包。

每项目每阶段保存非临时 thread；返回原阶段用 thread/resume。建筑确认后进入生活设计；切回户型可以立即讨论，修改已确认拓扑前必须明确确认。服务端按原规则失效后续设计，旧 thread 无权用过期上下文写入。离开阶段生成含 revision 的摘要；导航立即展示对应历史，接续Chat实际恢复原thread、附带尚未送达摘要并持久化送达ID，最新状态仍由MCP读取。旧项目历史消息保留，首次创建阶段 thread 说明迁移，不称恢复已删除会话。

附件真实上传到项目私有暂存区后只把附件 ID 交给主 Agent；工具验证文件归属、类型与读取情况。不得用文件名或模型描述代替图片/PDF 内容。API、按钮与 MCP 复用同一业务服务，沿用权限、revision、幂等、取消/重试、候选和确认校验，不复制写入逻辑。

模型仅提出候选，需要确认的行为由服务端验证用户确认。只有用户分段 Submit 或显式批次发送触发统一建议，单题选择/草稿不触发；许可资产、边界和碰撞由服务端校验。房间样式包含风格标签、墙面/地面颜色和材料，先预览后确认，不改变墙体几何。视角/日照等 UI action 有受约束参数及执行 ID，页面实际执行后回报；无成功回执不能声称已生效。

## 错误与修复反馈

MCP 工具必须返回模型可理解的失败内容，业务失败用 isError=true 并带结构化错误。合同至少包含 code、message、retryable、repairActions，能够取得时附 currentRevision、相关对象/字段和 confirmationRequired。参数/权限/阶段/附件/revision/确认/碰撞/供应端/取消错误须有稳定分类；内容不含密钥或其他项目数据。

Agent 应根据错误指出未完成什么、具体原因与下一步（重新上传、选择房间、重读项目、用户确认或稍后重试）。不可吞错、把失败包装为成功、盲目重试不可重试错误；取消/超时后的写入状态不明时先核对幂等结果再操作。桥接必须保留 MCP 错误与修复语义。家具候选校验失败不能用“不需要家具”结束任务；经服务端验证的位置提示仅供模型修正候选，不代表最优动线或用户采用。

## 完成条件

每个工具保留自然语言请求→实际工具调用→服务端校验→页面结果/确认→项目重读的证据；验证错误输入、越权/跨项目、阶段不可见、取消重试和旧 revision。涉及 UI 参数要有页面回执；涉及持久会话要有原 thread Resume 和重启证据。业务功能或 MCP 适配任一未验收，整票不能报完成。未完成的其他产品票不因 MCP 工具目录建立而完成。

后续任务统一使用 [接入模板](MAIN-CHAT-FEATURE-PROMPT.md)。模板不是运行时自动注册机制，工具需显式登记并经服务端执行校验。

## 户型诊断与确认卡恢复

户型阶段用 `inspect_topology`，生活设计阶段用只读 `get_topology_diagnostics` 获取页面同源诊断；两者都读取最新候选或当前工作稿，返回 revision、来源指纹、analysis.issues 中的错误码/原因/实体ID/位置、检查范围与限制，以及 repair 指导。`issue` 只是自动修复阻塞，不能因其为 null 就声称没有告警。生活阶段不开放拓扑写工具；已确认户型修改仍需回到户型阶段并由用户确认重开。

建筑确认卡仅以建筑候选和拓扑依据判断失效，问卷回答变化不使其失效；过期卡可重新校验并刷新，但刷新不确认、不切阶段，必须让用户核对后再次点击。阶段不可进入时，页面说明缺失条件；当前阶段按钮用于刷新状态。

确认卡使用明确的数字版本号，不再计算或校验哈希。Project 的 confirmationVersions 分别记录户型候选、建筑候选与设计版本，由同一数据库提交更新；版本取该次递增的项目 revision。只改聊天消息不会推进这些版本，建筑版本也不受无关问卷回答影响。恢复快照不会倒退这些版本。旧卡需要刷新后重新确认。

## Chat 扩展问卷与独立问卷同步

主Chat优先通过生活设计MCP的read_question_context、ask_question读取原生Home Vision题目和当前填写者信息，先提出标为尚未确认的需求猜测，再用结果、具体示例与取舍构建可纠正猜测的扩展问题。点选不提交；ALVA-078 将最多四题组成一段，Submit 原子回填同一填写者的答案与扩展说明，Chat 空闲时合为一条用户消息发送，真实读取批次并准备下一段；Chat 忙碌时只保存，保留显式批次发送按钮，完成当前回复后也不自动发送；猜测不作为已确认需求。独立问卷修改使旧题卡/依据过期，双方共用版本和验证服务；多人不得猜测归属，旧题号不得映射。复杂表单与附件返回可解释的独立问卷操作指引。实施与发布状态见[ALVA-068](ALVA-068-outcome-questions.md)。

## 家具详细建模（ALVA-071）

生活设计工具 `generate_furniture_model` 接收最新revision与existing/new目标，用户原话由服务端取当前Chat消息。它调用详细几何生成→同源三视角PNG→同会话视觉critic，最多3轮；不合格、渲染失败、取消、建筑结构或目标家具类别变化不得创建可采用候选；普通家具移动和问卷更新不废弃建模结果，仍校验最新场景。普通目录参数化模型不冒充本次定制/自检结果；生成成功仍须业主预览确认。长建模工具使主Chat单轮总上限为600秒，保留取消；具体审查合同与验证见 [ALVA-071](ALVA-071-furniture-models.md)。

## 新建与切换项目（ALVA-072）

两个阶段各自当前 MCP 工具包提供 `list_projects` 和 `request_project_navigation`，不同时加载两包。工具只列出业主授权目录，或通过 `project_manager` UI action 打开已校验的新建/切换面板并等待页面回执；`awaiting_user_confirmation` 不能解释为创建或切换成功。用户在面板点击后才调用共用项目服务，原会话 Chat 工具不会跨到另一项目写入。新项目有独立阶段 thread，切回原项目恢复原 thread；详见 [ALVA-072](ALVA-072-project-switching.md)。

## 界面输出语言（ALVA-074）

主 Chat 请求显式携带 `language: zh | en`，默认取 `X-Alva-Language`（缺省中文）。每轮追加输出语言指令，覆盖历史语言；start/resume、阶段引导、问卷题卡和后台建议均遵守。阶段 MCP 的 `get_interface_language` 返回本轮语言；不修改业务 ID、原生选项值、用户原话或历史回答。实现与验收见 [ALVA-074](ALVA-074-bilingual-interface.md)。

## 已确认范围的家具生成

ALVA-081范围接续优先调用`get_furniture_context`读取许可资产与几何，`propose_changes`展示明确add参数。范围生成轮只装配家具/配色相关工具；空家具结果在原thread/原总时限内纠正一次，仍失败保留真实错误。多候选整批校验，不留下失败调用的部分候选。见[ALVA-081](ALVA-081-furniture-generation.md)。
