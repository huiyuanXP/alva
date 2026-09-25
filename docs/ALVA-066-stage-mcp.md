# ALVA-066 主 Chat 按阶段接入两包 MCP

**ID:** ALVA-066
**Status:** in-progress
**Execution state:** 用户已授权处理原未提交修改，协调清理完成；2026-09-25 codex-stage-mcp 署名开工，先做隔离 MCP/网关探针。
**Owner:** codex-stage-mcp
**Date:** 2026-09-25
**Dependencies:** ALVA-065；已完成业务以 main 实现为准。ALVA-057 在途共享问卷/schema/页面需协调。
**Branch / Worktree:** task/ALVA-066-codex-stage-mcp；/home/ubuntu/Alva-worktrees/ALVA-066-codex-stage-mcp。
**Scope:** 本票是新增接入与房间样式任务，不改写 ALVA-008–051 的编号或完成状态。

## 用户批准的行为

登录后左侧主 Chat 仍是唯一对话入口。每项目保存户型、生活设计两个非临时 Codex thread，切回阶段必须 thread/resume 原 thread。两个阶段聊天记录均保留。旧项目保留历史消息；旧临时 thread 已删除，首次进入各阶段创建新 thread 并注入摘要，不能声称恢复了旧 thread。

户型阶段覆盖原图上传与识别、标注、墙和门窗调整、校准、拓扑确认、建筑 3D 生成与确认。建筑确认后进入生活设计，撤下户型 MCP，装载生活设计 MCP。切回户型立即 Resume，可查看讨论；修改已确认拓扑前仍须明确确认，服务端沿现有规则清除依赖旧拓扑的后续设计。

每次离开阶段生成携带项目 revision 的交接摘要。进入另一阶段时将未送达摘要与最新快照送给新建或 Resume 的 Agent，记录送达 ID，避免重复注入。拓扑修改后再进入生活设计 Resume 原 thread，送达说明失效内容的新摘要。所有工具执行读取最新项目状态，不依据旧聊天记录授权写入。

## MCP 与业务合同

在 Alva 服务进程提供两个独立的仅监听本机的 HTTP MCP 端点：户型导入、生活设计。每次主 Agent 调用只配置当前阶段的一包 MCP，包内按功能划分独立工具；辅助识图/建筑生成模型不继承 MCP。短期凭据绑定项目、角色、阶段，服务端每次校验。直接按钮保留，API 与 MCP 共用服务端业务逻辑。

户型图/PDF 先真实上传到项目私有暂存区，Agent 仅取得附件 ID，再调用识图工具。验证归属、类型、存在性与读取结果，不用文件名或模型描述冒充读图；返回处理状态和待校正候选，确认由服务端核验。

生活设计 MCP 接入 main 已完成的问卷、家具、房间用途/布局、参考偏好、审查、保存及交付能力。未完成业务明确报告不可用，不因注册工具而标原票完成。每次确认问卷回答后，触发该阶段 Agent 为相关房间提出家具候选；草稿不触发。服务端验证许可资产、边界、碰撞，用户确认才采用。

同票补齐房间风格标签及墙面、地面颜色/材料候选，支持 2D/3D 预览，明确确认后写入和重读；不改变墙体几何。视角、日照等界面参数返回受约束的 UI action，页面执行并回报结果，未回报不称已生效。

MCP 为默认优先调用渠道。错误必须从工具返回可解释结构，包括稳定错误码、发生原因、是否可重试、当前 revision（可取得时）、用户可执行的修复步骤和确认要求。业务失败使用 MCP isError 与结构化内容，不伪造成功；Agent 基于实际错误提示重传附件、重读状态、选择房间、确认操作或重试。不得泄露凭据/跨项目数据，不盲目循环重试。

## 实施顺序与交付门

1. 隔离合成项目验证安装版本与现役模型网关：原生 HTTP MCP 列表、实际工具调用、切换阶段隐藏工具。原生不可用时保留两包 MCP，以现役 App Server dynamicTools 作受控桥接，记录原因和证据；不得把桥接称为原生调用通过。
2. 实施 thread 持久化、Resume、阶段切换和摘要送达；抽取 API/MCP 共用服务；保留历史消息并明确迁移状态。中断重试和服务重启不能产生假 Resume、重复写入或重复注入。
3. 完成附件、户型、生活设计、确认后家具建议、样式、UI action 回执；同步主 Chat 合同、任务模板、AGENTS 和目录规范。
4. 隔离端到端全部通过后，备份并准备回滚，再发布并进行生产验收；MCP 控制服务配置保持不变。

## 验收清单

- [ ] 当前 Codex/网关实际列出并调用正确阶段工具；另一阶段不可见且服务端拒绝越阶段调用。
- [ ] Chat 上传真实原图/PDF、识图、调整、校准、确认拓扑、生成和确认建筑；候选不自动采用。
- [ ] 建筑确认后切生活设计；两个 thread ID 持久化，切回原 ID Resume。
- [ ] 两阶段消息保留；摘要附 revision，送达去重；重启、取消/重试保持正确。
- [ ] 确认回答触发相关房间待确认家具建议；草稿不触发，非法资产/碰撞被拒。
- [ ] 房间样式 2D/3D 预览、确认、刷新重读一致，墙体几何不变。
- [ ] UI action 实际执行并回执；无回执或失败不得宣称成功。
- [ ] 切回户型讨论不清空设计；明确修改拓扑后旧候选失效，再回生活设计送达失效摘要。
- [ ] 越权、跨项目、错误/缺失附件、过期凭据、revision 冲突均有可解释 MCP 错误且无正式污染。
- [ ] 直接按钮回归通过；所有已完成业务主 Chat 实际工具调用证据可追踪。
- [ ] 备份/回滚可用，生产分别验两个阶段调用、可见性与会话恢复。

## 初始核验与 Implementation handoff

2026-09-25 已核对：本机 codex-cli 0.157.0；api/codex.ts 当前每轮 ephemeral:true、mcp_servers:{}，调用结束删除工作目录，确需改造。已实际下载阅读 OpenAI Docs 的 [MCP](https://developers.openai.com/codex/mcp/) 和 [App Server](https://developers.openai.com/codex/app-server/)：支持 HTTP、enabled_tools、bearer_token_env_var、thread/resume；dynamicTools 为实验字段，持久化于 thread 元数据，Resume 默认恢复。官方能力不是当前网关业务验收证据；真实调用待执行。

发现 main 的 AGENTS.md、NextTask.md 存在本轮开始前的未提交修改。依 NextTask 认领规则，已向用户询问归属；不吞并或回滚这些修改。ALVA-024 单票及 main PROGRESS 已 done，但未提交 NextTask 又列 in-progress；ALVA-028 单票也已 done，恢复索引仍说暂停。认领前须按实际提交与负责人核对，不能据过期表抢占或恢复任务。

本票当前没有功能通过记录、没有生产变更。知识状态：代码/协议基线 verified-current；票据 changed-and-verified；运行接入/端到端 pending；生成记忆 out-of-scope；既有未提交文件与证据保留。

安装版协议 schema 已只读导出核验：ThreadStartParams 包含 ephemeral、dynamicTools、config；ThreadResumeParams 包含 threadId、config，未暴露 dynamicTools 覆盖字段。桥接工具目录变更的恢复兼容需实测，不能照搬官网最新字段。未启动模型调用。

2026-09-25 协调更新：用户明确授权整理已有修改，清理提交 8ec0cbb；原认领障碍解除。057 最新交接 a39646a 表明业务已验但未合 main，等待本票 MCP 运行层；先实现独立运行层，不提前吸收其未集成功能。

## 2026-09-25 第一阶段隔离探针

已执行脚本 `scripts/alva-066-mcp-probe.py`，使用当前环境鉴权与现役 `gemini-3.1-flash-lite`，独立私有 CODEX_HOME、合成项目、本机动态端口；未连接生产数据。

- 原生 HTTP MCP：run `20260925T185333Z-ALVA066-mcp-b4b7ec`。两阶段 tools/list 各仅返回所属工具，户型 thread Resume 保持同 ID；三轮均无实际 tools/call，nonce 未返回，故原生调用验收失败。此证据不定位网关内部原因，也不证明所有模型均不支持原生 MCP。
- 受控桥接：run `20260925T185430Z-ALVA066-mcp-a42664`。dynamicTools 从所属 HTTP MCP 的 tools/list 获取目录，实际经 HTTP tools/call 执行；户型、生活设计、返回户型共三次模型实际调用并正确返回随机 nonce。重启 App Server 后 Resume 同一户型 thread，并恢复原动态工具目录。结果 pass=true。
- 下一步按批准的后备路径实施 dynamicTools→HTTP MCP，保留两包边界、凭据与业务合同。尚需真实业务、跨阶段拒绝、摘要送达、持久化、附件、问卷建议、样式/UI回执和生产验收，整票继续 in-progress。
- 初始 systemd 探针因未继承 PATH 找不到 codex，在模型调用前失败；第二次显式传递 PATH 与已授权环境变量后运行。真实密钥不写仓库。各探针资源限额 CPU60%、MemoryMax900M、TasksMax128。

## 2026-09-25 运行层与共用服务实施（仍未完成整票）

已在本 Worktree 实现：`api/mcp` 两个本机路径、短期项目/角色/阶段凭据、真实 HTTP 桥接与可解释错误；`api/codex.ts` 显式持久 session/原 thread Resume、交接 marker 去重及辅助调用默认临时；`api/store.ts` 独立于设计快照的阶段/thread/摘要/送达元数据。增加阶段读取/切换 API 和真实私有附件上传 API。图片/PDF处理、识图导入、拓扑操作和建筑生成/确认抽到共用服务，原直接 API 使用同一实现。户型工具工厂已建立，尚未装配到主 Chat。

真实修改后 Harness 验证：`evidence/20260925T190756786Z-ALVA066-harness-026e3b/result.json` 三轮真实模型/MCP调用及错误修复解释通过；增加摘要恢复检查后的 `evidence/20260925T190958823Z-ALVA066-harness-ef70cf/result.json` 再次通过，持久 rollout 中交接只注入一次。两轮都使用合成项目，无生产数据；不是完整业务/浏览器验收。

共用服务回归：`evidence/20260925T191625Z-ALVA066-validation-536401/`，类型检查和33项定向测试通过，0失败/跳过，覆盖私有附件错误/跨项目、阶段凭据与错误、数据库重启会话与摘要、直接导入/拓扑/校准/建筑回归。早期锁忙记录保留为 not-started，不计测试失败或通过。`scripts/alva-066-validate.sh` 持共享重任务锁、等待最多600秒、每10秒写heartbeat、按步骤保留日志；验证进程由有资源限额的systemd运行，等待须追踪同一session/unit而非重复启动。

尚待：确认操作卡及服务端确认闭环；主 Chat实际装配/分阶段消息与页面切换；生活设计工具、回答确认后的家具建议、房间样式2D/3D、UI回执；完整模型/浏览器业务链及异常验收；main集成、备份发布和生产验收。当前没有主 Chat MCP 上线声明，不将其他票标done。

029协调：已按用户消息回复主目录 `.runtime/alva-coordination/ALVA-066-029-reply.md`。029负责 `api/user-context`、`api/review` 和纯合同，066负责Project可选userContextEntries、确认后投影hook和共享入口；私有投影在 ALVA_DATA_DIR/user-context/<projectId>/，habits/preferences/requirements/unresolved/index 分代原子写入。接受 createUserContextTools/createLayoutReviewTools 返回 BusinessTool[] 拼入生活设计包。真实客户内容不进协调文件。联合接入仍待029模块交付，066当前已完成业务接入范围继续按main，不提前取其未验分支。

neat-freak：本次代码/定向测试与目录说明 changed-and-verified；完整运行态、业务验收、生产发布 pending；生成记忆 out-of-scope。所有Worktree与私有会话保留，未清场，整票 in-progress。

## 2026-09-25 主 Chat 与新功能实施中

主 Chat 已装配阶段 HTTP MCP，页面增加阶段记录、附件与明确确认卡；确认与拒绝在项目锁事务中串行，保存重放不会重复生成版本。阶段切换先实际 Resume 原 thread，再切状态；Resume 失败不会冒充切换成功。真实探针 `evidence/20260925T193412944Z-ALVA066-harness-8564c7/result.json` 通过原 thread 即时恢复、更新工具目录后的新工具实际调用与摘要去重。采用固定 `mcp_list_tools`/`mcp_call_tool` 桥接入口支持旧 thread 调用未来新工具，仍通过本阶段 HTTP MCP 权限校验。

`evidence/20260925T193202Z-ALVA066-validation-540418/` 36项回归通过，含真实 Chat 路由到 HTTP MCP（模型注入替身）、确认/拒绝竞态、跨项目确认、阶段工具隔离。此轮 typecheck 先通过，随后新增目录桥接代码进入后续测试，因此不作为最终同SHA完整验收；首轮新增测试的 TypeScript helper 类型错误已修复。

继续实现了房间样式候选/确认与2D/3D渲染、页面视角日照操作回执、已确认答案的持久家具建议任务与主 Chat 自动触发。上述增量尚待类型/业务/浏览器验证。旧生活设计测试补建筑确认前置，未降低阶段门禁。029获得下一重任务窗口，066暂不启动新重任务；等待正式独立接口和证据后联合装配。未集成main、未发布、整票in-progress。

过程检查点（非完票）：上述新增样式、UI回执、回答建议及旧测试前置改动尚未跑最终检查，029验证窗口继续保留；后续须先运行更新后的验证脚本修复失败，再做真实模型/浏览器业务链。neat-freak本次只对齐过程事实：已验协议证据 verified-current；新增代码 pending；main产品/生产未变；规则与目录说明已同步；生成记忆 out-of-scope；保留测试与Worktree现场，无清场。


## 2026-09-25 029联合装配与自动建议检查点（整票仍进行中）

029固定实现dd6f948已进入066分支（cherry-pick 21e2fa9），保留原作者；Project扩展、确认后的Markdown投影、分类候选/确认/更正、生活设计read_user_context/run_layout_review、复核取舍UI和直接/MCP共享保存门禁已装配。投影先DB提交后发布；失败不冒称确认回滚；错误保留detail中的稳定码与修复步骤。保存凭证保留真实reviewedRevision/adoptedAtRevision，roomStyles加入布局指纹。main产品未集成或部署，029仍in-progress。

2d6b6cd固定源码的55/55检查通过，证据20260925T194716Z-ALVA066-validation-544764；后续联合回归51/51通过，证据20260925T200304Z-ALVA066-joint-regression-547910。自动家具建议已移到服务端持久任务队列，确认回答后无需额外浏览器Chat请求；重启后授权项目读取可恢复任务，候选仍需用户确认。随后定向8/8通过（20260925T201232Z-ALVA066-queue-regression-550947），构建通过（20260925T201448Z-ALVA066-living-build-551870）。这些是过程证据，不拼成同SHA最终业务验收。

TypeScript7的native编译器需GOMEMLIMIT=700MiB/GOGC=50/GOMAXPROCS=1；仅Node堆限制不足，早期OOM run保留。受限类型检查20260925T201134Z-ALVA066-queue-typecheck-549530编译退出0、oom_kill=0；运行中修改外层runner导致收尾退出2，独立记录，不冒称整轮runner成功。后续runner增加实际源文件SHA256清单，继续CPU80%/1200M/swap0与共享锁串行。

真实模型/Chromium生活设计业务验收正在进行，合成建筑仅为前置，不替代真实识图和建筑生成。两次脚本端口/origin配置错误导致未调用模型，失败证据保留；已修正端口探测、来源配置和HTTP状态断言。完整原图→识图→建筑→跨阶段→失效、服务重启与生产验收仍pending。

真实生活设计联合过程链已通过：`evidence/20260925T2026Z-ALVA066-living-joint-checkpoint/result.json`汇总同一合成项目/原生活设计thread的分类、页面确认、Markdown实际读取、复核、MCP保存请求、页面确认v1与刷新。途中模型把房间ID填入家具ID，新增CONTEXT_SCOPE_INVALID后，原thread实际收到错误并自行修正成功，失败和修复工具调用均留痕。前置样式/真实UI回执已在浏览器通过；两次持续进程OOM改为同一项目的串行新进程执行，不提高1200M限额。属于过程链验收，存在中途修复，不能当同最终SHA全票通过。

最新类型检查 `20260925T202529Z-ALVA066-joint-typecheck-556150` 通过；错误修复与自动建议定向回归 `20260925T202619Z-ALVA066-context-regression-556509` 4/4通过，含错误ID不落库和MCP修复说明。neat-freak过程复核：代码/定向证据 changed-and-verified；完整业务/生产运行态 pending；MCP优先合同 verified-current；目录增量已同步；生成记忆 out-of-scope；所有未完成Worktree、私有项目和失败证据保留。


## 2026-09-25 长调用、进入即交接与渲染修复检查点

真实Chat附件选择/上传通过（20260925T202946472Z-ALVA066-floorplan-upload），私有存储原字节/SHA256与授权references原图相同。首次实际识图约300秒后只得到通用工具失败；桥接原用fetch，存在独立响应头等待上限，未取得工具完成审计，原因按传输超时排查而非附件无效。改用有660秒绝对取消信号的node:http请求，保留外层模型时限；Chat结束会取消仍在运行的辅助调用。第二轮越过旧中断点，实际返回VISION_OUTPUT_SCHEMA：geography.assumption缺失（20260925T204126Z-ALVA066-floorplan-recognize-563328）；未获得成功候选，不计识图通过。新增有限兼容：缺失说明时明确标“地理参数未核实”，不生成纬度/北向数值或修改几何；数字缺失仍拒绝。下一次实测保留辅助模型原始输出到该隔离run私有目录，并断言不继承主Chat tools/session。

安装版thread/inject_items已真实验证：在无模型回复的进入步骤持久追加摘要/最新快照，新进程Resume后的真实模型可读；重复摘要最终仅1次（20260925T204104886Z-ALVA066-inject）。首轮重复2次的失败保留，原因是thread/read的有损turn视图不含原始注入项；恢复去重补查App Server返回的当前thread私有rollout，限定本stage CODEX_HOME且核对session_meta身份，流式读取，禁止取其他项目历史。阶段切换和建筑确认路径已装配该入口，失败保留未送达摘要并在页面提示及提供重试；原持久thread预检Resume仍先执行，首次迁移明确新建，不冒充恢复旧临时thread。

连续Chat输入导致父组件生成新样式对象，原本会每次重建Three.js渲染器。现缓存展示样式，卸载时释放WebGL上下文；真实浏览器12次输入保持同一个renderer（20260925T205357058Z-ALVA066-render-stability）。不是完整多轮模型与浏览器同时运行的最终资源验收。

类型检查20260925T205016Z-ALVA066-entry-typecheck-567997通过，随后迁移说明文字改动进入19/19相关回归20260925T205141Z-ALVA066-entry-regression-568406；前端构建20260925T205321Z-ALVA066-renderer-build-568994通过。所有重任务仍串行CPU80%/1200M/swap0。MCP传输、取消、识图错误详情、阶段入口送达、元数据重启与兼容几何边界均覆盖；最终同SHA业务门禁、真实识图/建筑/失效链、main产品集成与发布仍pending。

neat-freak过程对齐：协议/定向回归/渲染局部verified-current；原图识图失败与后续兼容复测pending；生产未变，生成记忆out-of-scope，私有现场及失败证据保留。
