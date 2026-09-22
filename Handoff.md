# alva Handoff

当前 44 张产品 Ticket 中，ALVA-008–012、ALVA-014–019、ALVA-043 已完成并集成 `main`。To Do List 仍由 https://prod.huiyuanxp.com/todo 只读展示。

44票均有 Parallel lane；当前依赖就绪为 ALVA-013、020、023、028、031、036、041，其中 ALVA-028 已由 yang-chatgpt 认领并按用户要求暂不实施，其余未认领。协作权威入口仍为 NextTask，网页只读展示，不开放网页认领或修改状态。

认领在主目录署名即生效，协调锁内提交；每票独立Worktree/分支及运行资源。同组或共享文件冲突先协调。个人完成提交后不移除署名；main集成验证通过后，同一实现提交更新done、移除任务行和署名、补充所有新解锁任务，保留票内署名及原实现SHA供追溯。

此前已按用户要求完成仓库扁平化。唯一根目录为 `/home/ubuntu/Alva`；后端 `api/`、前端 `web/`、研究 `Research/`，不再有内层 alva 或现役 apps 包装。Git 历史、数据库和附件随原文件保留；结构规范在 [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md)。现役启动、构建、导入和 systemd 路径已适配，alva.service 已重启恢复，MCP/Tunnel 配置未改。

首批 ALVA-008–013 仅定义就绪，尚未实施；原T03–T15的剩余细票已正式发布，实施仍待指令。统一验证码和新 Codex 建筑生成仍待后续实施指令，不能把目录迁移说成功能上线。正式票据入口 [.scratch/alva-completion/README.md](.scratch/alva-completion/README.md)。

## 已确认方向与本轮边界

- 持久项目名alva；新仓库 /home/ubuntu/Alva；原完整需求在SPEC和references/initial-task，来源在SOURCES。协作按最新NextTask，允许认领后独立Worktree条件并行。
- `/home/ubuntu/aws-hackthon` 已全目录归档且不使用；Coding Machine MCP 仍临时依赖其中 `.venv-mcp` 与 `.mcp-runtime`。MCP 地址、唯一现役密码来源和迁移边界见 [docs/REMOTE-ACCESS.md](docs/REMOTE-ACCESS.md)，旧密码副本已删除。
- 用户已授权复用旧Tunnel并停旧站点，旧文件保留、MCP不改。本轮仅做路径迁移所需的服务停启与配置适配，不建立生产业务会话、不改变权限或业务数据。
- 用户已明确把公共免验证入口改为统一登录验证码：验证码由用户分发，持有人可重复、跨设备登录当前授权项目；不建设短信或个人账号体系。当前线上仍是上一轮公共owner入口，尚未改为验证码登录，不可误称已限制。
- 用户明确“先发布细化后的Ticket”。验证码在实施ALVA-008时生成并交给用户，本轮没有生成生效凭证或发给第三方。
- 原T01粒度保留，成为ALVA-008；原T02拆成ALVA-009至013：导入识图、墙线修改、门窗/校准、Codex建筑生成、示例视角。
- 用户强调建筑3D生成需要调用Codex。已写入独立建筑生成步骤，区别于已有识图调用和固定Three.js渲染；以确认拓扑为约束生成可渲染构件，校验后显示。
- 本地Markdown tracker已建立，一票一文件，状态ready-for-agent仅表示定义就绪；未获本轮实施授权。未创建外部Issue、不改旧父票。其余主题冻结。

## 当前代码与运行态

业务行为基线仍是 e943d26（公共入口）；本轮更改源文件位置、相对导入、静态构建路径、脚本和服务路径，没有实现新业务功能。

本轮验证：npm run check、npm run build:alva 通过，7 项核心测试通过；alva.service/alva-tunnel.service active，本机及公网 /healthz 返回 alva/ok，本机首页 200。未建立生产业务会话、未调用真实模型，不把健康检查称为业务全流程验收。构建仍有现有大 chunk 提示。迁移后首次检查因 shell 仍在已移除的旧目录而失败，切换新根目录后复跑通过。

应用：React/assistant-ui/Three.js与Fastify/Codex App Server，入口web、api；`npm run check`、`npm run build:alva`、`npm run start:alva`。旧start/build对应复用旧基线，不是新应用入口。

持久化为独立单写进程PGlite（PostgreSQL WASM），不是网络PostgreSQL。生产只监听127.0.0.1:4173；运行/私有配置路径、备份及回滚见 [ops/alva/DEPLOYMENT.md](ops/alva/DEPLOYMENT.md)。不得同时启动dev和production写同一数据库。运行密钥/链接/项目数据不复制进票或Git。

## 已有成果与证据边界

| 已有能力 | 历史证据 | 尚不能推导的结论 |
|---|---|---|
| 真实导入/校准、手动家具、真实咨询、保存与同版本导出 | evidence/20260919T113205287Z-c8336560/result.json：6项通过、console/page error 0 | 完整保留UI或八组全通过 |
| HTTPS10/10、120增量/96网络块、越权拒绝、服务/Tunnel重启一致 | evidence/20260919T113620651Z-7a9de8f6/result.json | 公共写权限获得批准；后续改动自动受此证据覆盖 |
| 备份隔离恢复与干净安装/类型/构建/启动 | evidence/20260919T113809595Z-130d7739/result.json；evidence/20260919T113939Z-1906c48f/result.json | 完整业务验收；源码包已包含ALVA-007及后续变更 |
| 核心规则/持久化与公共入口回归 | evidence/20260919T111200Z-core；evidence/20260919-public-entry | 完整Chat取消/失败注入和专业正向操作已覆盖 |
| 两个独立浏览器公共重复访问 | evidence/20260919T123833084Z-97cca135/result.json：7项通过 | 实体手机实测或访客编辑权限决策闭合 |
| 两图真实识别及转写 | PROGRESS指向用户6房间附件与合成2房间对照、公开音源 | 两个真实用户户型、现场尺寸或实体麦克风验收 |

更多失败/修正证据及命令保留在PROGRESS/ACCEPTANCE；本轮不改旧日志、不删除证据、不把模拟结果换成实体证据。

## 首批研究结果与剩余范围

原型是人工解释单图后手写参数几何：原生WebGL2共享立方体、矩阵变换、深度阴影与玻璃混合；没有运行时AI自动识图。隔离浏览器复核50对象/14墙/6房间视点/40碰撞体，有限值有效、控制台错误0，保留剖切与完整墙体截图：evidence/20260919T131207987Z-priority-research。

首批链路：验证码登录 → Codex识图导入 → 墙线/房间轮廓修改 → 门窗核对与校准确认 → 再次调用Codex生成建筑场景 → 总览/剖切/房间视角。每步单票，现有基础复用而非重写。

首批正式ID为ALVA-008–013；T01映射008，原T02需009–013全部完成才结案。其余T03–T15仅在TICKET-PROPOSAL保留冻结内容，本轮不扩大处理范围。U12/U33/U34–U36删除、Q58禁用、U17保留移回库及证据，U16最后的原决定不变。

## 本轮知识整理检查

| 事实面 | 状态 | 边界 |
|---|---|---|
| 代码 | changed-and-verified | 路径迁移，类型/构建及7项核心测试通过 |
| 运行态 | changed-and-verified | 服务路径适配、恢复运行、首页与本机/公网健康通过；不做业务模型复测 |
| 文档 | changed-and-verified | 结构图、研究、规则入口、交接和当前链接同步 |
| 规则 | changed-and-verified | 原根与项目 AGENTS 合并，不将私有凭据写入 Git |
| 记忆 | out-of-scope | 未读写生成记忆；GlobalHandoff 在根目录同步 |
| 工作区 | changed-and-verified | Git 历史保留；原同名文档及配置私有备份，旧证据不改 |

pending：全部44张正式票的实施指令、统一验证码和新建筑生成验收；其余功能未实施。生产业务回归与生成记忆不在本次范围。现有大 chunk 构建提示未处理。原根文件的迁移前副本位于 .runtime/root-migration-20260919/，保留供复核，不自动删除；MCP 配置及原 Docs 附件不变。

本轮验证边界：仅文档/规则对齐，38草案/115验收、依赖DAG及U16前置闭包、链接检查通过；六张正式票仅同步最新快照/环境范围。代码、运行态沿用上轮验证，不重新声称本轮业务实测；记忆不在范围，无新增清理项。

最新审核稿38张（R04/R29撤销），115条验收已验证；上一轮40张/120条为历史。依赖已移除已删票并将R26依赖R25；U16最后功能约束不变。

本次发票验证：38新票/44总票、115条验收保持、依赖链接与编号有效；原六票正文未变。当前代码和线上状态不在本轮复测范围。审核稿仅保留来源，实施以正式票为准。

本轮收尾：仅修改规则、票据协作元信息与交接；44票验收/依赖不变，5项就绪清单及署名空值已核对。未运行产品测试或变更服务，生产事实沿用此前核验。记忆不在范围，未清理他人Worktree。

## ALVA-052 看板收尾

https://prod.huiyuanxp.com/todo 已实测44票/150条验收/5可认领/39等待依赖，搜索、并行组筛选、详情深链刷新、文档和窄屏检查通过，控制台错误0。证据`evidence/20260919T165930206Z-ALVA-052-todo/`；首次启动窗口502与第二次Cloudflare脚本CSP冲突保留在各自failure.json，后者已修复。产品首页与healthz正常，MCP/Tunnel单元仍active且配置未改。

个人实现提交d902557及修正9fae8e6；main按ALVA-052一次实现集成提交。3项看板测试、4项原基础/入口回归、类型检查、构建和真实浏览器检查通过；已有大chunk构建提示未处理。只读源无需重复上传，版本随源内容变化。回滚文件在`.runtime/alva-todo-rollback/20260919T170000Z/api.ts`，操作见TODO-LIST。

neat-freak：代码/运行态/文档changed-and-verified；规则verified-current；生成记忆out-of-scope；工作区changed-and-verified，本票个人Worktree/分支保留供复核，不影响main权威源。产品44票实施仍pending，没有因此完成或解锁产品票。

## ALVA-009 导入户型图与二维初稿

ALVA-009 已在独立 Worktree `task/ALVA-009-codex` 完成，并在完整验证通过后合入 `main`。实现覆盖 PNG/JPEG/PDF 来源保留、PDF 页码说明、处理状态、真实 Codex 多模态识别、稳定候选 ID、原图与二维初稿对照、未校准提示、重复请求幂等，以及失败/取消时保留上一个已确认场景。

验证记录：`npm run check`、`npm run build:alva`、ALVA-009 定向测试 3/3、两个不同布局的真实模型调用、浏览器刷新持久化和退出验证码门禁均通过。完整测试为 66/67；唯一失败是既有 ALVA-031 tracker 预期与当前依赖状态不一致，和本票无关。

证据目录：`evidence/20260920T135517780Z-dad4bde2/`、`evidence/20260920T135803184Z-a144b2c5/`、`evidence/20260920T142711689Z-browser-reload/`。


## ALVA-010 墙线与房间轮廓

ALVA-010 已由 lzy 在独立 Worktree `task/ALVA-010-lzy` 完成并验证，随后合入 `main`。实现提供服务端拓扑命令和前端二维校正：墙端点数值/拖动、共享连接点同步、房间顶点修正、墙线补画/分段/移除、门窗引用保护、定位校验、失败不写坏候选及拓扑修改清除旧校准。

验证记录：类型检查、生产构建、ALVA-010 定向测试 3/3、隔离浏览器登录/数值修改/房间顶点控制/补画/刷新/退出门禁均通过。完整回归在 main 标记 done 后复跑；既有 ALVA-031 tracker frontier 偏差仍单独保留。

证据目录：`evidence/20260920T151500000Z-ALVA010-browser/`。


## ALVA-014 问卷范围精简与逐题回答

Lexie 在 `task/ALVA-014-lexie` 完成实现，原实现提交 `9e309ec241116f276c738c9d7ef4aecd7ea6a06c`。现役问卷保留 Q01–Q60 稳定 ID，停用 Q19–Q22、Q58、Q60；可用题继续支持 A 推荐、B/C/D、自由回答以及 unknown/skipped/not_applicable，房间/项目 scope 隔离且锁定答案服务端拒绝覆盖。预算能力已从现役 Project 合同、写接口、UI、Chat 工具快照和导出移除，旧数据库/快照字段不迁移、不自动删除。

两轮验收均通过：Round 1 `evidence/20260921T073000Z-ALVA014-round1/` 包含 TypeScript、生产构建和 8 个相关回归；Round 2 `evidence/20260921T074000Z-ALVA014-round2/` 为真实 Chromium，验证 54 个可用题、6 个停用题隐藏、无预算 UI、跨房间不串值、unknown 显示、锁定写入 422、刷新持久化且登录后无 console error。全量 `npm test` 补充跑到 70/73，两个 media 失败仅因未提供 `RENOVATION_MEDIA_FIXTURES`；原 tracker frontier 偏差在本次全量重算后同步修正。

## ALVA-011 门窗、校准与拓扑确认

ALVA-011 已由 lzy 在独立 Worktree task/ALVA-011-lzy 完成，原实现提交 b113ba9，已合入 main。服务端新增门窗增删改、墙段/墙高/同墙重叠校验、已知墙长同比例校准、不可变拓扑版本与来源指纹；前端新增门窗校核面板，并保留墙线分段入口，确认后显示版本指纹。

验证：npm run check、npm run build:alva、ALVA-010/011 定向测试 5/5 通过；真实 floorplan.png 的 Chromium 网页验收覆盖登录、原图显示、墙线分段 200、门窗增删改、非法几何 422、校准、确认 v1、刷新重载和 /api/candidate/topology 无 404。证据：evidence/20260921T100146840Z-ALVA011-real-browser/。实时 Codex 复试因供应商 usage limit 返回 429，未伪造成功结果；本票网页验收使用真实附件及既有实际识别候选来源。


## ALVA-017 文字与图片真实流式咨询

Lexie 在独立 Worktree `task/ALVA-017-lexie` 完成；实现提交 `0356cef4fe98df84bb172e5550ec11f193b6fbb2`、`c35e707256d6d24e117b602df68df42a87d4f7d5`。三栏工作台继续使用 assistant-ui 原语，模型选择器改为读取 `/api/models`。供应端目录仍列出 GPT 系列，但本轮真实调用发现当前凭据对 `gpt-5.5`/`gpt-5.6` 已达使用上限；`gemini-3-flash` 通过真实 Codex App Server 调用，因此当前聊天模型目录只暴露该已验证可用模型。

两轮验收均通过。Round 1 `evidence/20260921T103000Z-ALVA017-round1/`：真实文字调用 5 个非空增量、图片调用 4 个非空增量，均完成；跨项目访问 403、原始 Codex 路由 404、scene 与 savedVersion 不变、参考图字节未持久化。Round 2 `evidence/20260921T110500Z-ALVA017-round2/`：Chromium 三栏工作台、动态模型选项、文字与图片 UI 真实调用、加载/完成状态均通过，scene 不被模型直接修改，console error 0。


## ALVA-015 Chat提取与手填双向确认

Lexie 在 `task/ALVA-015-lexie` 完成，原实现提交 `1db54df0245788e67330c32e95ad61cf6c21a3a5`。Chat 待确认答案确认后以精确用户原话保存为 `chat` evidence，手填答案保留 `questionnaire` evidence，两类答案均进入后续 Chat 的 `get_snapshot`。重复确认返回 422 且不重复写入；锁定值服务端拒绝覆盖，解锁必须明确 `confirmed:true`。

两轮验收均通过：Round 1 `evidence/20260921T143000Z-ALVA015-round1/` 为真实 Codex API 链路；Round 2 `evidence/20260921T145000Z-ALVA015-round2/` 为 Chromium UI 链路。补充回归中 ALVA-017 的 2 个模型目录断言仍硬编码旧 `gemini-3-flash`，而当前 main 已由后续任务切到 `gemini-3.1-flash-lite`，属于主线既有陈旧测试，不是 ALVA-015 功能失败。


## ALVA-016 未答看板与退出问卷分析

Lexie 在 `task/ALVA-016-lexie` 完成，原实现提交 `04ca6de1a3e1f58f70c9f84bfe6e091c40d3f68a`。未答看板按全屋与各房间 scope 分开统计，仅计启用问题；点击未答项会携带题目文本和房间上下文进入 Chat。退出问卷分析使用 `lastAnalysisEvidence` 增量游标：只处理新增 evidence，模型失败时游标不推进可重试，无新增 evidence 时直接返回且 revision 不变，已排队问题按题号+scope 去重。

Round 1 `evidence/20260921T151500Z-ALVA016-round1/` 验证失败游标保持、真实模型重试成功、只消费新增 evidence、重复退出 no-op 与问题 scope 去重；Round 2 `evidence/20260921T153000Z-ALVA016-round2/` 为 Chromium，验证全屋/客厅/书房独立未答、禁用项排除、点击书房 Q25 后 Chat 自动带入题目与房间并完成真实咨询，console error 0。

## ALVA-018 咨询取消与故障重试

Lexie 在 `task/ALVA-018-lexie` 完成，原实现提交 `42b592b263a553dbdb50b06bfa39bab9502000d4`。Chat 使用专属 `/api/chat/cancel`；取消/失败仅更新当前 assistant 状态和故障留证，正常完成前累积的 proposal / pending answer 不进入项目。前端保留完整重试草稿（文本、附件、房间、模型），失败后恢复输入，重试使用新 requestId，成功后清空草稿。

Round 1 `evidence/20260922T104500Z-ALVA018-round1/`：真实模型请求建立后取消，scene/answers/pending/accepted proposal 均无副作用；重试成功并收到 8 个流式增量。Round 2 `evidence/20260922T112500Z-ALVA018-round2/`：Chromium 首次通过真实供应端不存在模型触发不可用故障，文本与参考图恢复；点击重试后正常真实模型成功完成，scene 不变、无自动采用、图片不持久化、console error 0。

## ALVA-019 录音转写、纠正与发送

Lexie 在 `task/ALVA-019-lexie` 完成，原实现提交 `c925bcef0fa82bc83a6b16d1df8b8e5345ee8654`。转写使用独立项目级 controller 与 `/api/transcribe/cancel`，不再误用 Chat 取消；前端支持显式取消录音并丢弃内存分片。转写成功只回填可编辑输入框，失败/取消不会发送，音频不进入项目消息、证据或永久附件；用户编辑后发送时仅以当前文字作为 Chat 原话和 evidence。

Round 1 `evidence/20260922T161500Z-ALVA019-round1/` 使用真实公开 WAV 文件与真实 provider，得到 “How old is the Brooklyn Bridge?”，转写前后 project revision 均为 0，随后修改后的测试文本才被持久化。Round 2 `evidence/20260922T162000Z-ALVA019-round2/` 使用 Chromium 原生 fake microphone + MediaRecorder + 浏览器 WAV 归一化 + 真实 provider；取消录音不发送且保留原输入，第二次录音转写后编辑发送只保存编辑文本，console error 0。实体麦克风因云端 runner 无物理设备，按票要求保持待验。

## ALVA-043 业务指导依据用于咨询

Lexie 在 `task/ALVA-043-lexie` 完成，原实现提交 `38e230ba1d2c48cf9f41da0c176ada09f1558135`。新增 `api/business-guidance.ts`，将已提供的问卷、样例交付和项目定位文档整理成带 citation、适用方式与限制的只读业务指导 Skill，并显式登记尺寸/机电、结构与材料性能、负责人/授权三类资料缺口。Chat 增加只读 `get_business_guidance` 工具；明确业务指导意图会由服务端 grounding 成“资料事实 / 基于当前信息的推断或建议 / 缺少资料”，普通 Chat 保持原行为。附件和工具结果始终作为资料而非授权；含管理员、负责人、批准、权限、预算/报价/费用或施工授权敏感内容的模型补充不会进入最终 grounded 指导答复。

Round 1 `evidence/20260922T180000Z-ALVA043-round1/` 使用真实 `gemini-3.1-flash-lite`：工作位咨询引用 BG01 与 `references/02_intake_form.html#Q10`，明确区分资料事实、推断与缺口，scene 不变且 proposal 0。Round 2 `evidence/20260922T181500Z-ALVA043-round2/` 使用真实 Chromium UI + 真实模型：用户输入同时包含“管理员、负责人、预算、批准施工”等附件式文字和石材问题，最终只引用 BG02/BG05 受控指导，未赋予负责人身份、未批准施工、未提供预算指导，proposal 0、console error 0。过程中的失败验收 run 均按独立 evidence 保留，修正后用新 run 完整复跑。

2026-09-22 ALVA-054：yang-chatgpt 完成“聊聊你的家”入口、54道现役题的逐题卡片、草稿保存/关闭恢复/确认/房间隔离/小结。9项接口与回归、11组Chromium交互通过，截图已审阅；证据 evidence/2026-09-22T091452922Z-ALVA054-browser/。实现 d603054，当前集成已验证；用户授权生产发布，发布证据随后登记。未实施ALVA-028。


## 2026-09-22 ALVA-055 拓扑三类告警

已在独立Worktree完成并集成main：内部空洞、相对整屋主轴的倾斜、孤立墙体/门窗，增加鉴权只读诊断接口和二维问题列表/定位。T形节点与共线包含校验改为顺序无关。原实现06b63c0，21项测试和类型/构建通过，Chromium七组实际交互及截图复核通过，证据evidence/20260922T104414767Z-ALVA055-browser-85278c。main集成源码指纹一致并复跑类型/21项测试。未更新生产web/dist、重启服务或覆盖生产户型。规则参数及局限见docs/TOPOLOGY-QUALITY.md；旧全站窄屏溢出和大chunk警告保留。下一票ALVA-056执行MiMo复测，不把合成错误夹具称为模型输出。


## 2026-09-22 ALVA-056 MiMo探针与鉴权阻塞

独立实现提交53566b7，类型检查和5项探针逻辑/真实失败证据回放通过；真实MiMo识图未通过，因此不合入功能代码、不标done。正常Codex路径在5174.052ms后报告刷新令牌撤销；本次参数设置MiMo官方Responses provider后，在2555.246ms报告缺少MIMO_API_KEY。原始输出均0字符、未返回token用量；耗时是鉴权失败时间，不是模型识图推理。证据为evidence/20260922T105705151Z-ALVA056-mimo-ff43a8与evidence/20260922T105903721Z-ALVA056-mimo-455835，原result.json保留，review.json按权威turn错误复核分类。

尚缺当前MCP的有效MiMo环境凭据及最新标注截图的未标注原图。已保留ALVA-056署名与独立Worktree，恢复用新run ID；不读取宿主机凭据、不注销用户、不修改生产模型配置或候选。文档docs/MIMO-VISION-RETRY.md说明实际命令与边界。ALVA-055的21项回归和7组Chromium验收已独立完成并合入c25fa79，不受本外部阻塞回退。代码、文档与证据已核验；生产发布未执行，生成记忆out-of-scope，所有复核工作区保留。

2026-09-22 ALVA-054 发布核验：9454057实现已发布，新前端资源index-Bq_Jy-gM.js在线，公网首页/healthz/资源200，鉴权边界正常。隔离9项回归与11组浏览器交互通过；线上登录后验证因现役私有验证码文件被拒绝而blocked，未修改验证码或绕过鉴权。证据 evidence/2026-09-22T122724115Z-ALVA054-deployment/；详见docs/ALVA-054-home-intake.md。
