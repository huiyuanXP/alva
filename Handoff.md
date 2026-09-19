# alva Handoff

当前任务：已完成首批研究并发布6张细化本地Ticket，用户明确本轮只发票、不实施上线。正式索引为 [.scratch/alva-completion/README.md](.scratch/alva-completion/README.md)，研究在 [LOGIN-IMPORT-3D.md](docs/research/LOGIN-IMPORT-3D.md)。原T03–T15冻结，未继续细化或发布。核心可运行，但全保留范围与八组验收未完成，未 ready_for_review。

## 已确认方向与本轮边界

- 持久项目名alva；新仓库 /home/ubuntu/Alva/alva；原完整需求在SPEC和references/initial-task，来源在SOURCES。串行，不派子Agent。
- 用户已授权复用旧Tunnel并停旧站点，旧文件保留、MCP不改。本轮不做部署或生产会话/数据操作。
- 用户已明确把公共免验证入口改为统一登录验证码：验证码由用户分发，持有人可重复、跨设备登录当前授权项目；不建设短信或个人账号体系。当前线上仍是上一轮公共owner入口，尚未改为验证码登录，不可误称已限制。
- 用户明确“先发布细化后的Ticket”。验证码在实施ALVA-008时生成并交给用户，本轮没有生成生效凭证或发给第三方。
- 原T01粒度保留，成为ALVA-008；原T02拆成ALVA-009至013：导入识图、墙线修改、门窗/校准、Codex建筑生成、示例视角。
- 用户强调建筑3D生成需要调用Codex。已写入独立建筑生成步骤，区别于已有识图调用和固定Three.js渲染；以确认拓扑为约束生成可渲染构件，校验后显示。
- 本地Markdown tracker已建立，一票一文件，状态ready-for-agent仅表示定义就绪；未获本轮实施授权。未创建外部Issue、不改旧父票。其余主题冻结。

## 当前代码与运行态

产品代码基线仍是e943d26（公共入口）；之前核心提交a6eefa7、发布提交41b3895；上轮文档整理提交737a9be。本轮仅研究/票据/交接文档与隔离示例证据，未改产品代码。

上轮只读核验记录：alva.service/alva-tunnel.service active/enabled，healthz返回alva/ok。本轮只观察本地示例，不重新访问生产项目、不读取客户内容、不调用模型或变更会话；不将历史在线验收冒充本轮业务复测。

应用：React/assistant-ui/Three.js与Fastify/Codex App Server，入口apps/alva-web、apps/alva；`npm run check`、`npm run build:alva`、`npm run start:alva`。旧start/build对应复用旧基线，不是新应用入口。

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
| 代码 | verified-current | 只读核对入口权限与Git；不改产品代码 |
| 运行态 | pending（本轮不复测生产） | 仅隔离示例浏览器观察；生产沿用历史证据 |
| 文档 | changed-and-verified | 六张正式本地票、依赖与研究依据对齐；其余冻结 |
| 规则 | verified-current | 上级AGENTS为规则来源；技能工作流不自动授予线上变更权限 |
| 记忆 | out-of-scope | 不读写生成记忆；仅按项目约定更新GlobalHandoff指针 |
| 工作区 | changed-and-verified | 本轮只有文档/盘点记录；无分支、库、证据清场 |

pending：首批实施指令、验证码实际生成/上线及新建筑生成链路验收；其余产品范围冻结。原Cloudflare原生Node挑战记录保留为已知限制，不在本轮调整防护配置。没有需要本轮删除的旧证据或工作区；复核现场保留。
