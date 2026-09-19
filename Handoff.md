# alva Handoff

2026-09-19：核心业务链已发布到 https://prod.huiyuanxp.com 并通过公网真实浏览器冒烟；完整保留范围尚未完成，未 ready_for_review。持久项目名 alva，仓库 /home/ubuntu/Alva/alva。用户要求串行，不派子 Agent。规格以 SPEC.md、SCOPE.md 为准。

## 当前成果与恢复入口

- 应用：apps/alva（Fastify、Codex App Server）、apps/alva-web（React、assistant-ui、Three.js）。`npm run build:alva`、`npm run start:alva`；旧 npm start/build 仍对应保留基线，勿混用。
- 生产服务 alva.service 与 alva-tunnel.service 已安装并 enable，应用监听 127.0.0.1:4173。私有配置 .runtime/alva-prod.env；用户要求公共、多次、跨设备访问，现直接打开 https://prod.huiyuanxp.com/ 即进入同一公共项目。服务端私有 ALVA_PUBLIC_ACCESS_TOKEN 绑定原项目，每个设备独立会话，过期后可重新进入；旧完整链接继续兼容。已有有效的设计师会话保持只读，不被公共入口升级。配置及令牌不提交Git。旧 alva-dev.service 已停用，避免双进程写同一数据库。
- 独立 PGlite 持久化于 .runtime/alva-data/db，保留 PostgreSQL SQL/事务能力但为单写进程的 WASM 数据库；不是已部署网络 PostgreSQL。选择理由：复用核验过的旧持久化依赖，独立目录即可运行，未增加网络数据库服务。备份期间须停唯一写进程。
- 场景为空起步；真实图片/PDF识图生成候选，2D拖墙校正、已知长度校准后确认。手动家具与3D/2D同源；服务端锁定、原子命令、版本校验、幂等与保存失败保护。
- 真实 Codex 仅调用白名单业务工具；咨询增量流、问卷待确认提取、局部候选、录音转可编辑文本。问卷60题，Q58禁用；预算字段独立。
- 保存服务器快照、整版恢复；同版本可编辑 DOCX、PDF、高清平面图、全屋/房间实景渲染、JSON/sidecar/校验清单。

## 最新证据

- 核心5项业务/持久化测试、类型检查、构建：evidence/20260919T111200Z-core。5通过、0失败、0跳过；未统计行覆盖率。
- 完整核心浏览器：evidence/20260919T111932057Z-2c895cc2/result.json，6项通过，页面/控制台错误0。真实导入、校准、添加家具、真实咨询、保存与导出；不是完整八组验收。
- 两图模型识别：20260919T105414691Z-fe593ea8 为用户附件6房间；20260919T111613210Z-a51bbaee 为明确标注的合成2房间对照，均经真实模型。合成图不是另一个真实用户户型；校准测试8m也不是实际测量。
- 导出：20260919T111534041Z-3aa1dd71，14文件校验一致，可编辑DOCX正文与6页PDF；浏览器最终包也通过同版本校验。
- 本轮发布源码安装/类型/构建/启动鉴权：20260919T113939Z-1906c48f，4项退出0；alva-source.tar.gz SHA256 e096c3000cd12fd299c8e9a9064449f9034deb9925f123dc076102abe3fb7cf3。包不含参考附件、运行数据和凭据；包含发布模板与验收脚本，文档后续只补此次结果。先前核心包20260919T112145Z-c6105bd2保留为历史证据。
- 生产配置隔离备份恢复/服务重启：20260919T113809595Z-130d7739，6表行数及SHA一致、恢复健康；先前本地证据20260919T112632846Z-6e1a7470也保留。私有备份保留在结果注明的 .runtime/alva-backups 路径。
- 真实模型文本/图片/公开音频与实际Codex工具流式证据见 PROGRESS；没有实体麦克风验收证据。

## 未完成范围

完整八组与逐保留UI截图仍未完成；核心冒烟不可换算为100%。受控专业角色及证据解锁的正向墙体操作、门窗迁移、空间合并拆分和需求迁移、大范围确认的服务端完整闸门、指代澄清、参考偏好标注、家具款式/参考家具整组、完整风格/行为/动线审查、版本对比、未答题回Chat、全部焦点/漫游/光照场景、文档生成业务Skills、模型失败隔离注入仍需继续。U16必须最后；排后项未删除。NextTask列直接下一任务。

## 发布现状

用户明确授权复用旧Tunnel文件并停掉旧站点，覆盖先前不得接管的限制。已复用 /etc/cloudflared/prod-token 与既有prod域名→localhost:4173路由，未修改DNS。应用 alva.service 与专用启动单元 alva-tunnel.service 已enable；旧 renovation-workbench.service、cloudflared.service 已stop/disable，旧文件保留便于回退。MCP未改。

公网完整核心浏览器：evidence/20260919T113205287Z-c8336560/result.json，6项通过、console/page error 0；可直接下载同版本交付包。公网发布检查 evidence/20260919T113620651Z-7a9de8f6 全部通过：HTTPS健康与HTML连续10/10、未登录401/跨项目403、真实多模态Codex 120个增量/96个网络块、应用与Tunnel重启后项目及保存快照SHA一致、会话仍有效。

Node原生fetch探针被Cloudflare挑战页403拦截（20260919T113516638Z-813476cb），浏览器/curl可访问。使用真实浏览器继续检查，不删除原失败，不改Cloudflare防护配置。部署与可执行回退说明在 ops/alva/DEPLOYMENT.md。

旧库 /home/ubuntu/aws-hackthon/renovation-consultation 源码只读，HEAD 2825f36d7777d2219c6b007ea43735d90ec042ad、工作树干净。运行服务已按用户授权停用；不迁移旧客户数据。

Node24.21.0、npm11.19.0、Codex0.155.1、Python3.12.3、cloudflared2026.9.0；Chromium软件WebGL2可用。保留原始失败证据，不覆盖旧run。每个完成任务提交一次并覆盖Handoff/NextTask。

## ALVA-007 公共入口修复

2026-09-19 用户要求不依赖专属链接，可公共重复跨设备访问。本轮复现：完整旧链接可用；去掉hash后的普通域名在新浏览器会显示会话已过期。现在前端通过/api/public-access引导会话，已有有效会话保持原项目/角色；无会话时进入服务器显式配置的公共项目。未配置时不开放任意其他项目。4项入口/原持久化与鉴权回归通过、0跳过，类型与构建通过；公网跨浏览器检查结果见PROGRESS。完整产品未完范围保持上述记录。

公共入口公网验收：evidence/20260919T123833084Z-97cca135/result.json，两个隔离浏览器环境共6次访问以及原链接兼容通过、控制台错误0。手机环境为浏览器模拟。最初重启未就绪的502已记录，健康后复测成功。
