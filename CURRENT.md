## 2026-09-26 ALVA-068 已生产发布并复验

用户授权发布已完成：固定main `6eef743`，08:30 UTC上线。公网资源与已验构建一致、有效登录、当前floorplan实际inspect_topology、独立问卷入口通过，最终只读复验设计/问卷/候选/保存状态不变，页面错误0。生产当前处于户型阶段，未替用户确认建筑；生活问卷确认同步以本票隔离真实链路验收为据。

生产现由ALVA068-release.conf固定到私有release目录，main后续提交/构建不会自动发布；To Do List仍读取main。备份、回滚、失败run与验收边界见[发布收据](docs/ALVA-068-production-release.md)。068临时预览已恢复，CPU80%/总内存20%/swap0；旧066应用仍停止。其他票状态不因发布自动改变。

neat-freak已同步代码、运行态、合同和文档；生成记忆out-of-scope，备份及私有复核现场保留。以下带未发布字样的旧检查点为当时状态，以本节及发布收据为准。

## 2026-09-26 ALVA-030 已验收并集成

专业未知与用户取舍已保持独立：缺少重量/支撑证据时只标专业待核实，用户确认偏好不能关闭专业项；手动保存保留取舍、原始依据和未决状态，业主/设计师可读交付会显式呈现这些内容。两轮正式验收分别20/20与7/7通过，类型与前端构建通过。全量探索回归314/320，6个失败均在本票diff之外（4个既有家具/保存基线，2个缺RENOVATION_MEDIA_FIXTURES）；本票用例在全量中通过。ALVA-044因此依赖就绪。未发布生产。

## 2026-09-26 ALVA-068 已验收并集成，未发布

主Chat先展示未确认的需求猜测、依据与不确定项，再提供具体结果/示例/取舍。确认后同步同一填写者的Home Vision原字段与扩展问答；独立问卷保留，修改后旧扩展结论失效，Chat重读新版本。生活设计MCP为默认入口，错误提供稳定码及修复步骤；确认使用数字版本，不用哈希。

真实主Chat/HTTP MCP三轮及浏览器双向同步通过，最终分组类型检查、26/26相关回归、前端构建与To Do List浏览器检查通过，CPU80%/20%总内存/0swap，无OOM。详情与边界见[ALVA-068](docs/ALVA-068-outcome-questions.md)。新题卡窄栏可用；整个主工作区仍有既有手机横向溢出，bundle警告保留。

068已done并释放占用；057继续ready-for-agent，042与030等保留自身状态，不自动开工。本票未发布生产。neat-freak：代码/文档/票据changed-and-verified，规则verified-current，发布/生成记忆out-of-scope；私有合成现场、失败证据与Worktree保留供复核。

## 2026-09-26 ALVA-029 验收完成并集成

布局复核的对象/门窗/受阻路径定位、保存卡明细与非空用户取舍、布局变化后的旧审查拒绝均已完成。最终71c041e的12步真实Chat/MCP/浏览器联合链通过；40/40相关回归、类型/构建通过。同步040日照主线后的e149155再次通过类型/构建、真实MCP与二维/三维页面检查，错误0。证据与失败记录见[验收报告](docs/ALVA-029-acceptance-audit.md)。029已done，030可认领，不自动开工。066已生产完票；本轮029新增界面未发布。原工作区/私有数据保留，neat-freak已完成知识同步。

## 2026-09-26 ALVA-066 已完成并生产验收

集成e44c23a、发布5bb823b（产品c53d3ac）。生产有效登录、两阶段实际MCP、目录隔离及原thread恢复通过，设计不变、页面错误0。066标done，相关接入前置已释放；其他票状态不自动改变。[生产收据](docs/ALVA-066-production-release.md)。

## 2026-09-26 ALVA-066 已集成，尚未发布

用户授权的候选 `c53d3ac` 已进入 main，含最新 Gemini 3.8 与快照恢复兼容修复。合并影响验证通过，066/029 保持 in-progress；生产不变。现役边界与下一步见 [NextTask](NextTask.md)，证据见 [临时预览](docs/ALVA-066-temporary-preview.md)。

## 2026-09-26 ALVA-067 已发布并通过公网登录核验

已发布主Chat Gemini 3.8及等待圆点上方的最新浅色进度。类型/构建、本次5组桌面手机浏览器和公网登录只读核验通过；模型接口3.8、JS/CSS哈希一致、页面错误0、项目revision不变。备份与回滚在.runtime/ALVA067-release-20260926T045448Z/；详情见[发布收据](docs/ALVA-067-chat-model-progress.md)。066验收环境未改，仍需同步main并重验阶段MCP。

## 2026-09-26 ALVA-067 主 Chat 模型与进度展示已集成

主Chat已切为 Gemini 3.8 Flash High；保留等待圆点，最新工具进度改为其上方浅色文字，不再进入顶部横幅。类型/构建、17/17回归、桌面/手机与真实Chat工具调用通过；[ALVA-067](docs/ALVA-067-chat-model-progress.md)记录证据及失败run。未部署，066验收工作区未改，须同步main后重跑受影响阶段MCP门禁。

## ALVA-066 当前检查点：43f4466，继续最终联合门禁

## 2026-09-26 ALVA-057 英文问卷已先行发布

用户明确要求暂时跳过 ALVA-066 门禁，先上线问卷业务。main `817c253` 已集成新版 Your Home Vision 入口、英文题库/Q1 Q5 Q7 母版、条件流程、按人保存及现役 Chat 只读摘要。隔离验收：类型、构建、40/40 回归、7组保存与Chat、6组桌面/手机通过。生产已备份并重启 `alva.service`，公网首页/健康/新版资源200；用户提供的验证码登录后看见新入口和Q01，问卷接口为 `home-vision-v4`，只读开关不改变 revision，页面错误0。证据 `evidence/2026-09-26T020331622Z-ALVA057-questionnaire-public/result.json`；备份 `.runtime/alva057-questionnaire-20260926T020017Z/`。ALVA-066 阶段MCP、持久会话和联合验收仍在原票，ALVA-057 继续 in-progress，由 xuanpu-chat-6pro 保留署名。

066独立Worktree已提交 `43f4466`。原图项目的真实分类→Markdown→复核→页面保存v1/刷新、交付生成中取消及重新生成/ZIP哈希、日照/房间聚焦真实回执均已通过。确认回答自动家具建议发现碰撞失败被冒称无需求，现按实际失败记录拒绝skip，并通过MCP返回尺寸/占地及同校验器验证的位置供模型修复；4/4回归与确认后自动生成待采用候选实测通过，草稿不触发、原场景不变。最新固定源码类型检查通过。

原floorplan thread恢复/仅讨论不清空；页面明确重开后失效旧设计，实际门窗宽度合成修改/校准/拓扑v2确认、现役模型建筑重生成、页面确认并恢复原living thread及立即送达失效摘要已通过。实际用途提案/页面确认和参考图片偏好候选也通过。所有中途失败保留，不拼成尚未完成的最终同候选整票结论。证据详见个人Worktree票内2026-09-25原图项目保存、交付与跨阶段检查点。

下一步在固定候选完成最终联合回归/构建、029分类→Markdown→review→保存和剩余业务门禁，再main产品集成/备份发布及生产验证。066/029仍in-progress；040/057保持各自署名与边界，生产未变。共享heavy锁继续串行CPU80%/1200M/swap0，当前过程检查已结束。

neat-freak：局部实测/类型verified-current，完整交付及生产pending；MCP优先合同verified-current，生成记忆out-of-scope，所有私有现场/失败证据/未完成Worktree保留。

## 2026-09-26 ALVA-040 日照独立实现，阶段接入待066

ALVA-040：`chatgpt-sunlight`，独立提交 `7c5129e`；日照与真实阴影里程碑通过17项测试、完整类型/构建及13项浏览器检查。仍在进行，等待ALVA-066的生活设计MCP与受控UI回执，未集成/部署，不占用其他任务的共享入口。当前认领以 [NextTask](NextTask.md) 为准，详见 [单票](.scratch/alva-completion/issues/33-sunlight-seasons.md)。

## ALVA-065 主 Chat 入口与 Harness 已固定（2026-09-25）

主 Chat 的代码身份在 `api/main-chat-agent.ts`，入口为登录后左侧咨询栏和 `POST /api/chat`，运行器为 Codex App Server 的 `api/codex.ts`。后续功能同票完成受控工具适配，验收标准与 Prompt 见[主 Chat 合同](docs/ALVA-065-main-chat-agent.md)及[接入模板](docs/MAIN-CHAT-FEATURE-PROMPT.md)。当前识图、建筑生成等仍是直接入口，未冒充 Chat 已接入。

## ALVA-064 已发布并通过登录后只读验收（2026-09-25）

Gemini 3.8 Flash High 已作为生产图片户型识别默认模型，推理强度 high；聊天模型不变。main 实现提交 `4870b0d`，`alva.service` 与公网健康、首页及登录后项目读取通过。登录后项目 revision 不变，页面错误 0；[发布记录](docs/ALVA-064-gemini-default-release.md)含备份、回滚与独立证据。未以模型自查或结构检查确认户型准确性；ALVA-028 继续暂停。以下为历史任务记录。

# 恢复索引

## ALVA-036 手动全局快照已完成（2026-09-25）

本票已在 main 集成验收：手动保存才生成编号与时间戳，故障回滚保留工作稿，响应丢失以同一请求重试，版本冲突须显式重读。类型检查、24/24 相关回归、构建和真实 Chromium 8 项流程通过；[单票与证据](.scratch/alva-completion/issues/29-manual-snapshot.md)。后续 ALVA-064 已把包含本票的 main 构建发布到生产，公网资源与本地构建哈希一致；生产保存写入尚未单独验收。ALVA-037 已依赖就绪但尚未认领；快照只读预览和明确恢复分别属于后续票。

## ALVA-063 当前预览：Gemini 同会话自查（2026-09-25）

原测试 tunnel 现展示同会话自查的新候选：19 墙/5 房/7 门窗。生成、修正、将仅平面截图连同原图送回模型自查，均在同一个 Codex thread。模型自评 `mismatch`，指出卫生间分隔与门、主卧墙体转折及左侧开窗疑点；须由用户对照原图确认。原生业务 schema 仍未通过，只在隔离预览中做字段映射。入口和证据见[ALVA-063](docs/ALVA-063-floorplan-self-review.md)，旧候选保留，生产未变。

## ALVA-062 历史预览：Gemini 3.8（2026-09-25）

同一临时公网入口当时展示 Gemini 3.8 候选：20 墙/6 房/9 门窗，字段映射后通过几何与拓扑检查，公网二维/3D 验证通过。原始两轮业务输出均未满足严格 schema，故原生导入仍是失败；预览数据在独立数据库，准确性待用户对照原图核校。详情见[ALVA-062](docs/ALVA-062-gemini-preview.md)。MiMo 与 Luna 数据和截图保留，生产未改。

## ALVA-060 历史预览：Codex GPT-6 Luna xhigh（2026-09-25）

同一临时公网入口曾展示 Luna 首轮候选；当时已从 MiMo 切换，原 MiMo 数据与截图保留。[ALVA-060 记录](docs/ALVA-060-codex-luna-preview.md)：现役 `recognizeLayout` 使用 `OPENAI_VISION_MODEL=gpt-6-luna`，Codex App Server 通过新增可选 `OPENAI_REASONING_EFFORT=xhigh` 运行。17 墙/10 房/5 门窗通过业务 JSON/schema/几何解析，但确认拓扑失败，诊断 15 项问题、约 3.35㎡ 未定义空间和 4 个墙连通分量；页面明确标注待修正。公网二维/三维渲染与浏览器脚本错误 0 已核验，未改生产。

## ALVA-059 MiMo 候选渲染预览（2026-09-25）

ALVA-056 已在 main；此前独立预览载入其显式纠错成功候选，原截图和运行边界见 [预览记录](docs/ALVA-059-mimo-render-preview.md)。当时 Chromium 实测二维 26 墙/5 房及全屋 3D 画布可见，页面脚本错误 0。该候选仍未校准，不代表生产部署或新一次模型成功。

## 当前状态：ALVA-053、ALVA-056已完成

项目根 `/home/ubuntu/Alva`。53诊断与解析修复已集成`97c0ae7`；56原生MiMo复测与输出修复已完成本次main集成，个人实现`fbfe8e8`，源码验收基线`b34cc23`。两票均done，不再恢复为进行中，也不重复旧鉴权失败探针。

MiMo使用正常用户`codex exec --profile mimo`，默认请求Pro、目录限Pro/Flash。最后一次显式纠错耗时554.416秒，26墙/5房/12开口通过JSON/schema/几何/确认拓扑与三类诊断；它不是首轮成功，也不自动确认用户设计。空候选、中心offset语义、仅一次纠错及同源指纹约束已修复；识图每次600秒、普通Chat120秒。

最终类型检查、36项相关回归、5轮真实输出独立回放通过。扩大校准回归曾触及1500MiB任务上限，未计通过；最终拆分检查保持原限额且无OOM。证据：[最终复核](evidence/20260925T081435Z-ALVA056-final-b68614/summary.json)、[主线集成](evidence/20260925T084025Z-ALVA056-integration-3bc356/integration.json)、[53证据](evidence/20260925T064257Z-ALVA053-recovery-acceptance/summary.json)。

## 边界与下一个动作

未部署、未重启生产、未改生产设计/数据或Codex/MCP配置。原生CLI证据不等于业务App Server长时SSE/取消链路验收；最新标注截图的未标注原图仍缺。裸systemd任务不继承用户NEWAPI_KEY时会在预检被拒，复跑用既有正常鉴权会话，不复制凭据。需要上线时按发布流程补上述检查，不因done自动发布。

主目录[NextTask](NextTask.md)保留020、036、057等在途署名，ALVA-028继续用户暂停；其他票的状态/范围由单票与实时认领表决定，本轮未接管。旧056暂存成果已按本票验收吸收，AGENTS及其他工作不覆盖，所有Worktree和私有原始模型结果保留。私有集成保护基线`.runtime/20260925T081435Z-ALVA056-final-b68614/`。

## 权威入口

单票：[53](docs/ALVA-053-model-topology-audit.md)、[56](.scratch/alva-topology-quality/issues/02-mimo-vision-retry.md)；[MiMo复测/命令](docs/MIMO-VISION-RETRY.md)、[Handoff](Handoff.md)、[44张产品票](.scratch/alva-completion/README.md)、[拓扑补充票](.scratch/alva-topology-quality/README.md)。053/056是额外维护任务，不计入44票产品完成数。

[目录规范](docs/PROJECT-STRUCTURE.md)、[SPEC](SPEC.md)、[ACCEPTANCE](ACCEPTANCE.md)保持权威；不以旧week/step重排票号。[服务器事故](docs/INCIDENT-2026-09-25-server-recovery.md)记录历史内存/网络问题及Power key关机。所有重型任务串行且设cgroup限制，保留OS余量；不放宽断言，不删除证据。
