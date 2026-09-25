# alva Handoff

## 2026-09-25 ALVA-036 完成验收与集成

个人分支 `task/ALVA-036-chatgpt-snapshots`，已确认实现 `6355b3c`，最终验收交接 `7efee97`。main squash 后类型检查、24/24 相关测试、构建、真实 Chromium 8 项流程通过；[单票交接](.scratch/alva-completion/issues/29-manual-snapshot.md)可复核。快照创建、故障回滚、幂等重试、版本冲突和跨会话重读均已验证。后续验收夹具修正 `7497456` 移除无效用途提案和 422 豁免；main 集成态再跑快照 13/13 与 Chromium 8 项流程，[浏览器结果](evidence/2026-09-25T111249092Z-ALVA036-browser-87f7df/result.json)无提案预览 422、页面脚本及非预期控制台错误。只用合成数据与本地端口，未部署或重启生产。ALVA-037 解锁，其他任务署名未动。

## 2026-09-25 ALVA-061 Codex Gemini profile

本机 `~/.codex/gemini.config.toml` 复用现有 `newapi` provider 和 `NEWAPI_KEY`，独立模型目录提供 Gemini 3.6、3.7、3.8 Flash High。`codex exec --profile gemini` 默认 3.8，启动后可在模型设置中选其他两款；三个型号的 `--strict-config` 原生调用均返回 `OK`。详情见 [ALVA-061](docs/ALVA-061-codex-gemini-profile.md)。用户级文件不入 Git；仓库只保存脱敏交接。业务服务与生产配置未改。

## 2026-09-25 ALVA-063 Gemini 同会话平面自查

新隔离 run `20260925T114342944Z-ALVA063-selfreview-d5bf96` 在同一 Codex thread 依次完成生成、修正和仅平面截图自查。新候选 19 墙/5 房/7 门窗；原生输出 schema 失败，隔离字段映射后几何与拓扑诊断通过。模型自评 `mismatch`，报告卫生间和门、主卧墙体及左侧开窗疑点，未自动改候选。项目 Skill 位于非标准目录 `docs/skills/alva-floorplan-self-review/`，由 prompt 显式附入全文。原测试 tunnel 现展示本次新候选，公网二维/3D 验证通过。详情见[ALVA-063](docs/ALVA-063-floorplan-self-review.md)，生产未改，028 继续暂停。

## 2026-09-25 ALVA-062 Gemini 3.8 识图预览

个人实现 `ea3de2c` 当时生成 Gemini 3.8 候选并切换原临时 Tunnel。两轮原始回复都不符合严格 Scene schema；只在隔离预览中映射字段，保留墙、房间多边形和开口几何。映射后 20 墙/6 房/9 门窗通过几何/拓扑诊断；公网二维、3D 与浏览器脚本错误 0 实测通过。运行服务 `alva-gemini-preview-app-v2.service`，MiMo/Luna 数据保留，业务原生导入仍未通过。详情见[ALVA-062](docs/ALVA-062-gemini-preview.md)，生产未改，028 继续暂停。

## 2026-09-25 ALVA-060 Luna 识图预览

个人实现 `8964db6` 已按最新 main 合并验证并集成。已有 `OPENAI_VISION_MODEL` 决定识图模型；新增可选 `OPENAI_REASONING_EFFORT` 透传 Codex App Server，默认行为不变。隔离业务识图一次请求 GPT-6 Luna xhigh，用仓库原图返回 17 墙/10 房/5 门窗，JSON/schema/几何通过，确认拓扑失败；诊断 15 项问题、约 3.35㎡ 未定义空间、4 个墙连通分量。一次请求无自动纠错；未把可渲染误报为合格户型。

同一临时 Tunnel 当时展示 Luna 候选，原 MiMo 数据和截图保留；公网 Chromium 验证二维/3D 可见、页面脚本错误 0。类型检查与 15 项导入测试通过，详见 [ALVA-060](docs/ALVA-060-codex-luna-preview.md)。未改生产服务、数据或模型配置；NextTask 已释放本票署名，其他认领保持。待用户看完再决定是否停预览和清场。

## 2026-09-25 ALVA-020 作用范围澄清与确认

ALVA-020 已由 lzy 在独立 Worktree 完成并合入 main。服务端新增范围确认合同、propose_scope、确认/取消路由和候选预览/采用时的边界复核；前端新增范围确认卡片。真实 Chromium 证据为 evidence/20260925T-ALVA020-real-browser/；类型检查、生产构建和 2 项范围单元测试通过。实现提交 a20b15b，集成提交见当前 main 日志。

## 2026-09-25 ALVA-053/056已完成（当前恢复入口）

ALVA-053诊断修复已集成`97c0ae7`；ALVA-056个人实现`fbfe8e8`在本次main单票集成，Status=done，NextTask当前执行占用已释放。源基线`b34cc23`。本票范围为原生MiMo复测和导入输出合同修复，不是生产全链路或户型测绘准确性验收。

结果：`codex exec --profile mimo`默认Pro的显式一次纠错run`20260925T075949811Z-ALVA056-mimo-1947ac`返回26墙、5房、12门窗，几何/确认拓扑/三类诊断通过。原图、5个房间及门窗数量保留；失败首轮和空模板记录均保留，不报告为一次盲测成功。新增空候选拒绝、中心offset定义、一次纠错来源绑定；识图单次600秒，普通Chat仍120秒，未修改用户profile或密钥。

验证：最新main基线上独立类型检查和36项相关回归通过，0失败/跳过/取消；5轮原始JSONL/回复回放及来源/改动范围核对通过。证据`evidence/20260925T081435Z-ALVA056-final-b68614/`、`evidence/20260925T081726Z-ALVA056-recovery-acceptance/`；主线收据`evidence/20260925T084025Z-ALVA056-integration-3bc356/`。一次扩大校准数据库回归被1500MiB任务上限终止，未计通过；拆分后的最终相关检查无OOM，未放宽断言或任务上限。

保护与边界：本票吸收已备份的原8个056暂存成果及历史说明；AGENTS和其他票改动不夹带，全部Worktree与私有原始结果保留。未部署/重启生产、未改设计或数据库；原生CLI不能替代此前未执行的App Server复试，最新标注截图的未标注原图仍缺。裸用户systemd服务缺NEWAPI_KEY时预检会拒绝，复跑应在既有鉴权的正常用户会话中进行，不能假定任意MCP任务都继承该变量。

下一步：本轮53/56不再占用执行资源；020、036、057等其他任务仍按主目录NextTask原署名推进，028继续暂停。若另行上线，先补生产长时SSE/取消与隔离回归；扩大校准测试应分配独立资源诊断，不据此改业务断言。服务入口沿用127.0.0.1:4173及prod.huiyuanxp.com，既有alva.service启动方式不变。回滚只撤本票集成，不重置主树或删除历史分支。以下同日早期记录按历史时点阅读。

## 2026-09-25 ALVA-053已完成，继续ALVA-056

ALVA-053按诊断维护范围完成并集成，个人实现`17a6308`，总证据`evidence/20260925T064257Z-ALVA053-recovery-acceptance/`。JSON/schema/几何错误统一一次修正，识图显式240秒上限，普通调用仍120秒；PDF与PGlite测试隔离而未删断言。28/28、最终类型检查与历史候选重放通过；MiMo Pro业务动态工具/流式文本通过，Gemini3.8别名文本恢复；原生mimo profile的Flash识图18.663秒通过输出合同，但确认拓扑失败且约22.59m²未定义空间，不宣称户型已正确。

Pro在旧120秒业务时限下超时；240秒App Server复试的提权/环境传递调用被工具拦截未执行，保留未核验边界。原生profile用普通用户、无密钥复制/提权，不能冒充被拦截的业务复试。最新标注截图未标注原图/当前生产样本关联仍缺，未更改生产配置/数据、未部署。

下一步按本轮已有授权执行ALVA-056，改旧探针硬编码v2.5为当前`codex exec --profile mimo`并复测默认Pro；53不再占用共享文件。028仍暂停，057的yang-chatgpt与其共享文件保持不变。原8个56暂存文件/2份文档修改、preview五文件及全部历史Worktree保留；本次独立Git索引不吞并它们。重型任务串行、CPU60%、任务内存模型900MiB/含PGlite和类型1500MiB、Tasks128；初始限额失败留证，最终运行未OOM。回滚仅revert本票集成，不重置工作树。

## 2026-09-25 本轮交接（先读）

目标：服务器重启后检查中断任务、退回pending并保留下一步，不对应旧week/step，不实施产品票。检查main HEAD `5e1513a`；本轮新增恢复提交可由 `git log --grep='重启后待办恢复'` 追溯。

状态：ALVA-053 pending（个人报告88506f2待复核/集成）；ALVA-056 pending（个人0d7ea5f已有真实MiMo结果，主线集成未完成）；ALVA-028未开工且用户暂停，Execution state=pending、Status=ready-for-agent，当前执行占用释放。详细恢复条件在单票与NextTask；不解锁后继、不把旧失败写成当前唯一结果、不把已完成票倒退。

保护：main原8个暂存文件、2份未提交文档；preview的5个未提交文件；21个Worktree及历史负责人/提交全部保留。本次只提交本轮状态/交接/测试预期与脱敏取证增量，不代为集成ALVA-056代码。私有基线及回滚补丁`.runtime/20260925T034733Z-server-recovery-2cae71/`。

服务器：MCP、alva与两个Tunnel均active；本地/公网healthz=alva/ok。9月22日的内存回收/I/O拥塞及网络、SSH失败已有日志；9月25日Power key关机有明确记录，不能证明CPU一直满载或点名唯一肇事程序。事故报告[docs/INCIDENT-2026-09-25-server-recovery.md](docs/INCIDENT-2026-09-25-server-recovery.md)，证据`evidence/20260925T034733Z-server-recovery-2cae71/`。

下一步：优先恢复ALVA-056的现有成果核对与串行轻量验收，随后独立完成集成；需要最新截图结论时先取得未标注原图。ALVA-053先消除路由/样本关联缺口，ALVA-028仍等新开工指令。重型构建/浏览器不得并行争用这台2核3.7GiB且无Swap的机器；限额和历史进程监控尚未实施。未运行真实模型/浏览器/全量构建、未更改服务或密钥、未写生产数据。

本轮验证结果以证据目录`validation.json`及PROGRESS为准。服务启动方式仍`npm run start:alva`/既有alva.service；4173只本地监听，不另起实例写生产库。回滚只撤本轮恢复增量，保留原暂存/未提交补丁；不得重置主工作树。

## 历史交接记录（2026-09-19至22日）

以下按各次记录时点阅读；恢复状态以本页上方、CURRENT及单票2026-09-25记录为准。

当前 44 张产品 Ticket 中，ALVA-008–013、ALVA-014–019、ALVA-043 已完成并集成 `main`。To Do List 仍由 https://prod.huiyuanxp.com/todo 只读展示。

44票均有 Parallel lane；当前依赖就绪为 ALVA-023、028、031、036、041，其中 ALVA-028 已由 yang-chatgpt 认领并按用户要求暂不实施，其余未认领。协作权威入口仍为 NextTask，网页只读展示，不开放网页认领或修改状态。

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

## 2026-09-25 功能分区：虚拟分区线与三墙自动成区

用户直接要求在已确认户型内增加不形成实体墙的功能分区。实现新增 Project.zones 语义层：二维工作稿可用两次点击画虚拟分区线，端点自动贴到同一物理房间边界并切成两个功能区；三面近似直角墙形成 U 型矩形时，双击内部位置可自动以缺失的一边作为虚拟边界生成新功能区。虚拟分区不修改 Scene.walls、confirmedTopology 或建筑3D结构；重新修改户型时随其他下游空间设计一起清除。普通四面墙房间不会被误判为“三墙成区”。定向回归 22/22、类型检查、生产构建通过；浏览器自动化脚本受工具安全层拦截，未伪造浏览器通过结果。

## 2026-09-25 ALVA-021 局部3D候选比较与采用

ALVA-021 已由 lzy 在独立 Worktree 完成并合入 main，集成提交 c2594e8（实现提交 22a1db1）。候选协议支持 referenceIds；模糊请求至少返回两个不同变更候选，精确请求可返回一个。候选卡使用真实 Three.js 3D预览，参考物禁用且不写入采用范围；选中范围沿用服务端版本门禁、幂等命令和事务回滚。

验证：npm run check；ALVA-021 专项回归 2/2；受影响 ALVA-012/020 联合回归 9/9；npm run build:alva；真实 Chromium 通过，覆盖两个候选、3D画布、参考物默认不选和部分采用，控制台错误 0。证据 evidence/20260925T091243419Z-ALVA021-browser/。根目录现有 AGENTS.md 用户修改及未追踪历史证据未触碰；未部署/重启生产。

## 2026-09-25 ALVA-022 房间用途与布局分开确认

ALVA-022 已由 lzy 在独立 Worktree 完成并合入 main，集成提交 4931415（实现提交 788296e）。用途通过独立路由确认并保存用途依据，通用布局命令不能绕过；用途确认不改家具。用途触发的布局候选可预览、暂不采用或局部采用，布局采用单独保存 selectedIds 和 proposalId；拒绝一个候选不会使同批其他候选失效；锁定房间由服务端拒绝。

验证：npm run check；ALVA-022、ALVA-021、ALVA-020 和业务联合回归 9/9；npm run build:alva；真实 Chromium 覆盖用途确认、家具不变、布局候选3D预览、拒绝、局部采用、锁定房间按钮与服务端拒绝，控制台错误 0。证据 evidence/20260925T093352998Z-ALVA022-browser/。未部署/重启生产，主目录 AGENTS.md 和历史未追踪证据未触碰。

## 2026-09-25 ALVA-023 家具添加、选择与复制

ALVA-023 由 lzy 在独立 Worktree 完成。家具库添加服务端校验许可资产和明确房间，实例与库定义分离；新增与复制均分配新 UUID，复制保留 sourceId；2D 平面与真实 Three.js 3D 射线选取共享同一实例 ID；刷新保持身份和位置，坏资产/坏房间整单拒绝且不留下半个实例。

验证：npm run check；ALVA-023 API 与 ALVA-021/022/业务回归共 8/8；npm run build:alva；真实 Chromium 覆盖添加、2D 选择、3D 射线选择、复制、刷新和坏资产原子拒绝，控制台错误 0。证据 evidence/20260925T094742274Z-ALVA023-browser-5e3711/。未部署生产或写入生产数据库。

## 2026-09-25 ALVA-024 家具移动、旋转与吸附

ALVA-024 由 lzy 在独立 Worktree 完成并合入 main。服务端统一处理家具 5cm 网格吸附、15°旋转归一化、旋转占地的房间边界校验、同房间碰撞拒绝和锁定对象保护；手动命令与 Chat 候选共用 applyChanges，2D/3D 拖动失败时不保留本地错误位置。

验证：npm run check；ALVA-024、ALVA-023、ALVA-021、ALVA-022 与业务回归共 10/10；npm run build:alva；真实 Chromium 覆盖 2D 拖动、Three.js 3D 拖动、旋转吸附、碰撞/越界拒绝、锁定绕过拒绝和刷新保持，控制台错误 0。证据 evidence/20260925T102254871Z-ALVA024-browser-2a4841/。失败调试 run 也按独立证据保留。未部署生产或写入生产数据库。
