# alva Handoff

当前任务：已为六张已发布 Ticket 及 tracker 补充统一目录规范入口，并核对迁移旧目录均已移除。票据范围、验收、依赖和状态未改变；未删除仍含独有内容的旧工程、附件或私有迁移备份。

此前已按用户要求完成仓库扁平化。唯一根目录为 `/home/ubuntu/Alva`；后端 `api/`、前端 `web/`、研究 `Research/`，不再有内层 alva 或现役 apps 包装。Git 历史、数据库和附件随原文件保留；结构规范在 [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md)。现役启动、构建、导入和 systemd 路径已适配，alva.service 已重启恢复，MCP/Tunnel 配置未改。

首批 ALVA-008–013 仅定义就绪，尚未实施；原 T03–T15 冻结。统一验证码和新 Codex 建筑生成仍待后续实施指令，不能把目录迁移说成功能上线。正式票据入口 [.scratch/alva-completion/README.md](.scratch/alva-completion/README.md)。

## 已确认方向与本轮边界

- 持久项目名alva；新仓库 /home/ubuntu/Alva；原完整需求在SPEC和references/initial-task，来源在SOURCES。串行，不派子Agent。
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

pending：首批票实施授权、统一验证码和新建筑生成验收；其余功能冻结。生产业务回归与生成记忆不在本次范围。现有大 chunk 构建提示未处理。原根文件的迁移前副本位于 .runtime/root-migration-20260919/，保留供复核，不自动删除；MCP 配置及原 Docs 附件不变。
