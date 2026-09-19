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
