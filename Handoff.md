# alva Handoff

当前任务：整理上下文并审阅Ticket拆分，不继续产品实现或权限变更。草案为 [TICKET-PROPOSAL.md](TICKET-PROPOSAL.md)，尚未发布正式Issue、没有新票执行授权。核心可运行，但全保留范围与八组验收未完成，未 ready_for_review。

## 用户意图与权限待决

- 持久项目名alva；新仓库 /home/ubuntu/Alva/alva；原完整需求在SPEC和references/initial-task，来源在SOURCES。串行，不派子Agent。
- 用户已授权复用旧Tunnel和停用旧站点；旧文件保留，MCP不改。这是部署授权，不意味着可公开所有项目或给所有访客写入权。
- 用户要求公共网址多次、跨设备可访问；没有明确确认“任意访客共同编辑同一项目”。此前Agent把公共入口绑定owner链接，扩大了编辑范围。现有实现仍保持该状态，本轮只整理文档，没有降权、撤销或扩大权限。
- 用户将这件事改为Ticket中的任务：T01“公共入口与角色权限”内先确认访客读写、项目共享/隔离及业主身份恢复，再实施。当前不再追问权限选项，也不以现状作为授权依据。
- 正式tracker/triage未配置；本地to-tickets存在且已读取。建议本地Markdown，一票一文件；须先审阅草案粒度和依赖，并选定tracker。旧taskboard不属于现役alva看板。

## 当前代码与运行态

整理前源码HEAD e943d26bca808ad64279353524224a44e983cd30，main、工作树干净。该提交实现公共入口，之前核心提交a6eefa7、发布提交41b3895。

本轮只读核验：alva.service/alva-tunnel.service均active/enabled，https://prod.huiyuanxp.com/healthz 返回alva/ok。未登录项目、未读取客户内容、未调用模型或变更会话；公共owner行为依据当前代码及上一轮证据，本轮没有重跑业务链。

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

## 剩余范围与已纠正文档

T01–T15草案覆盖入口权限、导入拓扑、问卷、真实多模态恢复、范围/候选、家具编辑、痛点审查、专业墙改、空间合并拆分、版本、漫游日照、参考偏好、交付、U16和最终验收；票内列行为验收及真正阻塞边。

U12/U33/U34–U36删除；Q58禁用。U17原表误标删除：原任务明确保留家具增删，审批U17标题“删除家具”不表示删除功能，已恢复“移回家具库、保留证据”范围。排后项仍保留，U16最后实施。

README旧入口说明、旧taskboard现役声明、SPEC的权限授权误述已改正；PLAN保留历史阶段编号，并指向草案，未关闭或改动旧父Issue。

## 本轮知识整理检查

| 事实面 | 状态 | 边界 |
|---|---|---|
| 代码 | verified-current | 只读核对入口权限与Git；不改产品代码 |
| 运行态 | verified-current（仅健康/服务） | 业务状态引用历史证据，不冒充本轮重测 |
| 文档 | changed-and-verified | 草案依赖、范围映射、当前入口和待决权限对齐 |
| 规则 | verified-current | 上级AGENTS为规则来源；技能工作流不自动授予线上变更权限 |
| 记忆 | out-of-scope | 不读写生成记忆；仅按项目约定更新GlobalHandoff指针 |
| 工作区 | changed-and-verified | 本轮只有文档/盘点记录；无分支、库、证据清场 |

pending：草案批准、tracker选择、T01权限决定及剩余产品验收。原Cloudflare原生Node挑战记录保留为已知限制，不在本轮调整防护配置。没有需要本轮删除的旧证据或工作区；复核现场保留。
