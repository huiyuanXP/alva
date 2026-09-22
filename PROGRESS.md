# alva 执行进度

2026-09-19 ALVA-000：新仓库与旧源码隔离；已归档完整任务和附件，36场景矩阵、任务依赖、验收断言与当前入口。

- 根 npm ci --ignore-scripts、npm run check、npm run build:web：退出0。
- engine npm ci --ignore-scripts、npm run check、NODE_ENV=production npm run build：退出0。check回退加载配置后报告0错误7警告；prepare含echo，不以prepare认定通过。
- 首次 npm test 被SIGTERM终止（143），未发现同期内核OOM日志，原因未确证；保留20260919T102353Z-a74a0cf5/unit-tests.log。
- 逐文件全部复跑：20260919T103055Z-9b9353e5/results.json，19/19文件退出0，汇总 {"tests": 53, "pass": 53, "fail": 0, "cancelled": 0, "skipped": 0, "todo": 0}。既有测试包含依赖注入/模拟服务，不能替代新八组真实业务验收。未新增skip；未配置覆盖率统计，不能声称覆盖率100%。
- 参考原型7项浏览器检查通过，evidence/20260919T102812503Z-d32320b2；18/18附件校验和一致。
- 真实模型text/vision/audio调用有返回，20260919T102726Z-28d50713。识图误把厨房称为卧室，准确性未通过。公开语音转写为How old is the Brooklyn Bridge?，非实体麦克风。
- Codex CLI 0.155.1 Responses文字探针退出0，20260919T102845Z-c28b0add。流式业务工具/Codex识图尚待接入。
- 输入映射核验退出0，20260919T103253Z-eeb93520。旧库HEAD及工作树未变。
- 新应用未发布、八组产品验收未执行；产品不标ready_for_review。新验收自动脚本随相应实现落地，ACCEPTANCE已冻结必验断言与公差，不能把脚本未完成算为任务0全通过。

下一步：完成ALVA-000的Codex流式协议验证和新验收入口，推进ALVA-001入口/真实识图/校准/统一场景。正式域名prod.huiyuanxp.com授权已取得，部署切换尚未执行。

ALVA-000协议补验：首次App Server探针因配置对象使用JSON而不是TOML而失败；修正为逐键覆盖后，20260919T103726806Z-19e0dda5实测动态只读工具1次、28个真实delta、拼接与最终文本一致、图片输入返回。该图片提示明确指出厨房特征，只验证图片协议，不替代盲测识图。

2026-09-19 核心业务任务收束（ALVA-001至004的已实现部分，不代表这些完整Ticket均已验收）：

- 新增隔离入口、真实Codex导入/咨询、统一场景、家具命令、问卷、痛点、保存/恢复和同版本导出。旧代码基线继续保留；实现范围见Handoff。
- 导入先后遇到输出schema optional字段不兼容、门窗越界；未放宽几何断言，改为严格schema及一次真实模型修正，20260919T105414691Z-fe593ea8通过。第二张合成对照图20260919T111613210Z-a51bbaee真实识别通过。
- 20260919T111200Z-core：核心测试5通过0失败0跳过，类型检查与构建退出0。保存故障注入日志属预期故障，正式快照未增加、草稿未丢失。
- 最初导出500、后续渲染超时均保留证据；定位到持续软件WebGL渲染消耗，改为仅相机/输入/场景变化时绘制。20260919T111534041Z-3aa1dd71导出通过，PDF6页、DOCX可编辑、14文件同版本校验一致。
- 普通exec内浏览器第二次进程关闭（20260919T111723297Z-d31abf64），未确证原因、不报通过；改用独立systemd验收进程后，20260919T111932057Z-2c895cc2全部6项通过、console/page error 0、进程退出0。未删测试或强制点击。
- 20260919T112145Z-c6105bd2：独立源码包干净安装、类型、构建、启动鉴权4项退出0；不是完整八组复跑。源码包对应此时产品代码。
- 20260919T112556254Z-f9bc3929备份逐表恢复一致但临时service停后消失、重启失败。改为专用持久systemd单元并enable；20260919T112632846Z-6e1a7470六表校验和一致、服务恢复通过。仅操作alva数据与服务。
- 真实浏览器证据、产品代码指纹、测试和失败目录均保留，不覆盖。最终状态为核心可运行/全范围进行中，不是ready_for_review。发布仅依赖独立Tunnel配置，产品剩余项继续按NextTask推进。

2026-09-19 ALVA-006核心发布任务：用户明确允许复用旧Tunnel并停旧服务，原发布授权阻塞解除。核心提交 a6eefa7，源文件保持不变；建立alva.service和alva-tunnel.service，旧应用/隧道及dev单元stop/disable，保留文件；复用既有域名到4173路由，无DNS或MCP修改。

- 公网核心浏览器 20260919T113205287Z-c8336560：6项通过，真实识图、咨询、同版本交付，console/page error 0、systemd验收进程退出0。
- 公网原生Node客户端检查 20260919T113516638Z-813476cb 首次health返回Cloudflare挑战403；curl和浏览器200，原因已定位到边缘挑战而非应用鉴权，换真实浏览器客户端复跑，保留原证据。
- 核心提交前 git diff --cached --check 仅报告原始日志尾部空白；不重写实跑日志，产品源文件无空白错误。凭据模式扫描命中0。发布脚本更新后npm run check退出0。

- 20260919T113620651Z-7a9de8f6：真实浏览器公网HTML/health连续10/10；Secure/HttpOnly会话、未登录401与跨项目403；真实多模态Codex120增量、96网络块、约14.9秒完成；独立保存快照不受咨询污染；应用+Tunnel重启后项目及保存快照SHA相同、会话保留，退出0。

- 20260919T113809595Z-130d7739：默认生产alva.service/4173停写备份，8项目等6表行数+SHA在隔离恢复后相同，生产服务恢复健康，退出0。备份私有归档不在Git。

- 新发布包首次干净复现20260919T113808Z-01924992：安装0、类型检查1，public-check脚本异步闭包变量被TypeScript错误收窄为never；改为记录流式元数据数组，保持断言不变。本机npm run check恢复退出0；原失败证据保留，已清理失败临时安装目录，重跑干净复现。

- 20260919T113939Z-1906c48f：本轮源码包干净npm ci/check/build/隔离启动鉴权4项退出0，无skip。SHA256 e096c3000cd12fd299c8e9a9064449f9034deb9925f123dc076102abe3fb7cf3。成功后清理临时安装目录。生产健康复查为alva/ok；旧库工作树仍干净。

ALVA-007 公共跨设备入口：复现旧完整链接200可用、无hash新会话出现会话过期提示。新增显式配置的公共项目引导入口，复用原项目不迁移数据；每设备独立会话，过期可重取，保留设计师身份。tests/alva-public-entry.test.ts + alva-foundation.test.ts 4通过0失败0跳过；类型检查、构建退出0，已重启alva.service发布。证据evidence/20260919-public-entry；未修改Tunnel/MCP。

ALVA-007公网复测：首次20260919T123714558Z-55d629ab在服务重启尚未就绪时首页502失败，保留证据；确认/healthz 200后，evidence/20260919T123833084Z-97cca135 七项通过：桌面与手机浏览器模拟各首次/刷新/清除Cookie后进入，同项目内容SHA一致；原完整链接仍有效，控制台错误0。手机为模拟环境，不宣称实体手机实测。

2026-09-19 上下文整理与拆票草案任务：用户明确先建立Ticket，公共入口权限作为其中子任务，未选择访客读写方案。本轮读取to-tickets/neat-freak技能、项目规则与旧来源；只读核验两个生产单元active/enabled和healthz alva/ok，不建立新会话、不操作数据或服务。整理T01–T15草案（未发布、待审阅/选tracker），校正SPEC权限误述及SCOPE U17误删，更新交接/恢复/README与旧taskboard历史定位。历史ALVA票与旧父Issue不改状态。无产品代码改动、不跑模型/业务回归；验证文档链接、范围覆盖、DAG和无运行配置变更。正式发票遵循技能“Iterate until the user approves the breakdown.”，不将本次整理授权当发票批准。

整理验收：evidence/20260919T130045Z-ticket-context，15票draft、阻塞边均引用已定义前置票、31个保留UI实际映射字段全部覆盖及U++痛点映射；14个项目文档链接与上级交接指针有效。无产品代码/运行配置变更，无生成记忆改写。GlobalHandoff按上级规则更新为恢复入口与权限待决边界，未写入密钥或客户内容。

2026-09-19 首批研究与发票：用户认可原T01粒度并决定统一验证码准入，要求细分T02并优先研究Codex建筑3D生成，随后澄清“先发布细化后的Ticket”。采用本地Markdown tracker，仅发ALVA-008–013六票（原T01+T02的五步），状态ready-for-agent并显式标明未实施；原T03–T15冻结不展开。研究现有Codex导入/会话/渲染及提供的原型，证实示例为手工参数化WebGL模型而非运行时AI。隔离浏览器证据evidence/20260919T131207987Z-priority-research：50对象、14墙、6房间、40碰撞体、有限值有效、控制台0错误，保留总览剖切/完整墙体图。未调用生产模型、未建立生产会话、未改代码/服务/权限/数据，未生成验证码或发送消息。研究结论见docs/research/LOGIN-IMPORT-3D.md。

首批发票检查：tickets-validation.json核验6票ID/状态/35条验收标准、依赖按01→06有效、38个文档链接有效，原T03–T15正文逐字保持不变。git diff --check通过；产品代码与运行配置未变，因此未重跑业务构建/模型回归。按neat-freak同步Handoff/NextTask/CURRENT与GlobalHandoff，未清除历史证据或改写生成记忆。

2026-09-19 文件结构规范任务：建立 docs/architecture/PROJECT-STRUCTURE.md 与 docs/README.md，规定现役后端/前端、共享合同、拓扑/Codex建筑生成/渲染职责、首批六票落点、测试发现与私有数据位置；明确现有与规划目录，保留当前 model.ts 权威定义及未来原子提取规则。接入 AGENTS/README/CURRENT，覆盖 Handoff/NextTask，同步 GlobalHandoff。只改文档，不创建空工程、不迁移源码、不实施票据或操作生产。neat-freak 只读盘点完成；文档链接、入口、Git差异检查作为本次验证，不以旧浏览器配置冒充 alva 验收。

2026-09-19 扁平化任务：用户要求外层 Alva 为根并至少减少两级。移动 Git/仓库内容到 /home/ubuntu/Alva，apps/alva→api、apps/alva-web→web、docs/research→Research；目录规范移到 docs/PROJECT-STRUCTURE.md。更新源码相对导入、脚本、构建、服务及私有数据配置路径；先停服务后移动数据库，再恢复运行。根同名文档/私有配置备份到 .runtime/root-migration-20260919；原规则合并但有效凭据不入 Git；旧 README 作为 docs/REMOTE-ACCESS.md 保留，MCP/旧库未改。第一次 npm 检查因 shell 旧 cwd 已移除报 ENOENT，改用新 cwd 后 check/build 均通过；7项核心测试通过，服务 active、本机/公网 healthz 正常、本机首页200；现有大chunk提示保留。未实施ALVA-008–013，不做新登录或真实模型业务验收。neat-freak 盘点及文档链接同步完成，历史证据不改。

2026-09-19 Ticket 路径同步与旧目录检查：使用 to-tickets 约定保留六票行为/验收/依赖/状态，只给每票和 tracker 增加统一结构规范入口，避免复制易过时的实现清单。用户允许清理旧目录；核对 alva、apps/alva、apps/alva-web、docs/architecture、docs/research 已在迁移时移除，本轮没有新增删除。apps/api、apps/web 与私有迁移备份含独有源码/恢复内容，保留。校验七个新增链接和六票验收正文不变，更新 Handoff/NextTask/GlobalHandoff；无代码或运行变更。

2026-09-19 剩余票细化审核任务：按用户最新指令与 to-tickets 技能，读取原T03–T15、范围、规格与八组验收，并核对当前问卷/编辑/候选/保存接口，形成Research/REMAINING-TICKETS-REVIEW.md。39张覆盖原13主题，另补原范围U30的只读协作，共40张draft/120条验收；每票提供交付与依赖，不预占正式编号、不发票或实施。验证依赖无环且R35参考家具以前置闭包覆盖R01–R34，U16仍最后；六张正式票不变。neat-freak同步当前入口及交接，原主题保留作基线；仅文档检查，不跑产品回归或触碰生产。

2026-09-19 用户审核修订：预算全范围删除，理想WebGL机器Demo无需降级，只有手动保存创建全局快照，点击快照只读预览、明确恢复才替换工作状态，无逐操作记录/撤销或自动存档。撤销草案R04/R29保留编号，R24–R26重写并将恢复依赖预览；预算移除工作纳入R01与相关咨询/交付票。同步SPEC/SCOPE/ACCEPTANCE、原主题及正式六票边界；不改产品代码，不删除历史数据或证据。本轮只做文档与依赖验证，neat-freak同步交接入口。

2026-09-19 剩余正式发票任务：用户明确“做成正式ticket”，按to-tickets把38张获批草案发布为ALVA-014–051（本地07–44），与首批六票共44张。删除R04/R29不发票；115条验收逐字保留，依赖转换正式ID/相对链接，顺序无环；保留手动快照和理想Demo范围。同步tracker、CURRENT/Handoff/NextTask/GlobalHandoff及审核来源；原六票不变，历史父票不关。未实施/部署/调用模型/发送消息。neat-freak仅做文档与入口一致性收尾，验证见本次evidence/*-remaining-tickets/validation.json。

2026-09-19 Worktree并行协作规则任务：用户要求票据并行可行性、NextTask署名认领、独立Worktree实施与完成后解锁。44票添加Parallel lane，保持验收与技术依赖不变；计算当前frontier为ALVA-008/014/017/023/036，全部空署名。NextTask定义短锁认领事务、共享文件协调、独立运行资源、个人提交与main squash集成、验证后同一提交done/移行/新增解锁任务、释放及清理条件。更新AGENTS/SPEC等旧串行边界并按neat-freak同步交接。只更新协作规则，无新Worktree/子Agent/功能实施/生产变更。

2026-09-19 ALVA-052 To Do List源接入：用户确认prod.huiyuanxp.com/todo。发现旧看板只读旧两位编号/旧目录且新服务缺失路由，实际返回SPA首页。独立Worktree认领27208bf，实现d902557、CSP修正9fae8e6；新增api/todo、web/todo与导出/浏览器探针，兼容两种依赖格式、正式ID/并行组、NextTask署名、依赖DAG校验与30秒读取源刷新。原44票正文和状态逐字未变，不认领产品票。3项看板测试、4项原入口/基础回归、check/build退出0；现有chunk提示保留。

发布前保存原api/api.ts到.runtime/alva-todo-rollback/20260919T170000Z，仅重启alva.service。首次公网run 20260919T165813473Z遇启动窗口502；第二次20260919T165853229Z功能通过但Cloudflare注入脚本受旧CSP阻拦，修正精确域名后重启并等待健康。最终20260919T165930206Z-ALVA-052-todo：44票、150验收、5ready/39blocked/0progress/0done，公网数据版本与本地相同，搜索/筛选/详情深链刷新/文档/窄屏通过，控制台0错误。首页及healthz正常，MCP/Tunnel active且配置不变，不调用模型或业务会话。失败和成功证据均保留。

neat-freak完成受影响文档/规则/工作区盘点，覆盖Handoff与NextTask并更新GlobalHandoff、CURRENT、目录规范与旧看板入口说明。ALVA-052维护认领移除，五张可认领产品票及空署名不变；无产品任务新解锁。生成记忆out-of-scope，本票分支/Worktree保留复核，不清理他人文件。


2026-09-20 ALVA-010 修改墙线与房间轮廓：在独立 Worktree `task/ALVA-010-lzy` 完成并验证后合入 main。新增服务端拓扑命令/定位校验和前端二维编辑，覆盖共享连接、稳定ID、房间顶点、补画/分段/移除、门窗引用保护、校准失效与刷新持久化。类型检查、构建、定向测试3/3及隔离浏览器核心断言通过；证据 `evidence/20260920T151500000Z-ALVA010-browser/`。下一项拓扑票 ALVA-011 已解锁。

2026-09-21 ALVA-014 问卷范围精简与逐题回答：Lexie 在独立 Worktree `task/ALVA-014-lexie` 完成，原实现提交 `9e309ec241116f276c738c9d7ef4aecd7ea6a06c`。保留 Q01–Q60，停用 Q19–Q22/Q58/Q60，清除其他现役题预算措辞并保留时间安排；预算从现役 Project/API/UI/Chat工具/导出移除，旧持久层与快照历史不迁移。Round 1 类型/构建/相关回归 8/8，Round 2 Chromium 业务断言全部通过；证据位于 `evidence/20260921T073000Z-ALVA014-round1/` 与 `evidence/20260921T074000Z-ALVA014-round2/`。集成后 frontier 全量重算为 ALVA-011/015/017/023/031/036。
2026-09-21 ALVA-011 修正门窗、校准尺寸并确认拓扑：lzy 在独立 Worktree 完成实现提交 b113ba9，并已合入 main。新增门窗增删改、墙体关联及越界/墙高/重叠校验、比例校准、不可变拓扑版本和来源指纹；网页显示确认版本。npm run check、build、ALVA-010/011 定向测试 5/5 通过；真实 floorplan.png Chromium 验收覆盖墙线分段接口 200、非法几何 422、门窗增删改、校准、确认、刷新重载，/api/candidate/topology 无 404。证据 evidence/20260921T100146840Z-ALVA011-real-browser/。实时 Codex 复试受供应商 429 usage limit 阻断，未伪造识图成功；全量 npm test 为 72/75，另两项 media 失败因未提供外部 fixture，tracker 失败因收尾前预期未更新，均非本票功能回归。

2026-09-21 ALVA-017 文字与图片真实流式咨询：Lexie 在独立 Worktree `task/ALVA-017-lexie` 完成。后端统一聊天模型白名单与 `/api/models`，参考图增加 PNG/JPEG 内容与 MIME/大小/base64 校验；前端模型选择器改为动态读取可用模型。供应端目录虽仍列 GPT 系列，但当前凭据真实调用 `gpt-5.5`/`gpt-5.6` 均达到使用上限，`gemini-3-flash` 真实 Codex App Server 调用通过，因此作为当前现役聊天模型。Round 1 真实 API：文字 5 增量、图片 4 增量，跨项目 403、原始 Codex 404、scene/savedVersion 不变、图片不持久化；Round 2 Chromium：三栏、动态模型、文字/图片 UI 真实流式调用、加载/完成状态、console 0 error 全通过。证据 `evidence/20260921T103000Z-ALVA017-round1/`、`evidence/20260921T110500Z-ALVA017-round2/`。完成后新解锁 ALVA-018/019/020/041/043。

2026-09-21 ALVA-015 Chat提取与手填双向确认：Lexie 完成。真实 Codex 待确认、精确原话 evidence、手填回读、重复确认 422、锁定/显式解锁均通过；Round 1 API 与 Round 2 Chromium 证据分别位于 `evidence/20260921T143000Z-ALVA015-round1/`、`evidence/20260921T145000Z-ALVA015-round2/`。完成后新解锁 ALVA-016 与 ALVA-028；ALVA-013 亦已因 ALVA-012 完成处于 ready。

2026-09-22 ALVA-016 未答看板与退出问卷分析：Lexie 完成。未答统计按全屋/房间独立且排除禁用题；未答项可直接携题目+房间进入 Chat；退出问卷只处理新增 evidence，失败不推进游标、无新增 evidence 重复退出不增 revision。Round 1 API/真实模型与 Round 2 Chromium 均通过，证据位于 `evidence/20260921T151500Z-ALVA016-round1/`、`evidence/20260921T153000Z-ALVA016-round2/`。完成后当前 ready 为 ALVA-013/018/019/020/023/028/031/036/041/043。

2026-09-22 ALVA-018 咨询取消与故障重试：Lexie 完成。Chat 改为专属取消 controller；取消/超时/模型不可用保留完整重试草稿，失败只落 assistant/failure 记录，不落 proposal/pending answer/正式 scene。Round 1 真实取消后重试 8 个增量；Round 2 Chromium 真实供应端不可用后恢复文本+附件并重试成功，console error 0。证据 `evidence/20260922T104500Z-ALVA018-round1/`、`evidence/20260922T112500Z-ALVA018-round2/`。

2026-09-22 ALVA-019 录音转写、纠正与发送：Lexie 在独立 Worktree `task/ALVA-019-lexie` 完成，原实现提交 `c925bcef0fa82bc83a6b16d1df8b8e5345ee8654`。新增独立转写取消 controller/API、录音显式取消与临时分片清理；成功只回填可编辑文字，失败/取消不发送、不持久化音频，最终 Chat 仅保存用户编辑后的文字。Round 1 真实 WAV + 真实 provider 通过，转写前后 revision 不变；Round 2 Chromium fake microphone + MediaRecorder + 真实 provider 通过，取消录音无副作用、编辑后发送正确、console error 0。证据 `evidence/20260922T161500Z-ALVA019-round1/` 与 `evidence/20260922T162000Z-ALVA019-round2/`。实体麦克风因云端 runner 无物理设备保持待验。

2026-09-22 Coding Machine MCP 凭据与旧归档收尾：核对当前 `coding-tools-mcp.service` 实际加载的 `server.env`，确认旧 `config.json`、`connection.txt`、`mcp-login-password.txt` 为失效副本并按用户授权删除。同步 AGENTS、REMOTE-ACCESS、项目结构、文档索引、Handoff、GlobalHandoff、NextTask：`/home/ubuntu/aws-hackthon` 全目录归档不使用，唯一临时例外为 `.venv-mcp` 与 `.mcp-runtime`，迁移到 `alva-*` 前保留。未改服务/Tunnel配置、未重启服务、未迁移旧产品源码或数据；验证仅覆盖文档一致性、旧密码零残留和现役服务环境匹配。
