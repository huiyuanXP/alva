# alva Handoff

2026-09-19：核心业务链已在本机运行并通过真实浏览器冒烟；完整保留范围尚未完成，未 ready_for_review。持久项目名 alva，仓库 /home/ubuntu/Alva/alva。用户要求串行，不派子 Agent。规格以 SPEC.md、SCOPE.md 为准。

## 当前成果与恢复入口

- 应用：apps/alva（Fastify、Codex App Server）、apps/alva-web（React、assistant-ui、Three.js）。`npm run build:alva`、`npm run start:alva`；旧 npm start/build 仍对应保留基线，勿混用。
- 本地服务 alva-dev.service 已安装到 /etc/systemd/system 并 enable，监听 127.0.0.1:4180。仓库模板 ops/alva/alva-dev.service。私有配置 .runtime/alva.env，初始业主链接 .runtime/alva-data/initial-access-link，均禁止提交或输出密钥。
- 独立 PGlite 持久化于 .runtime/alva-data/db，保留 PostgreSQL SQL/事务能力但为单写进程的 WASM 数据库；不是已部署网络 PostgreSQL。选择理由：复用核验过的旧持久化依赖，独立目录即可运行，未增加网络数据库服务。备份期间须停唯一写进程。
- 场景为空起步；真实图片/PDF识图生成候选，2D拖墙校正、已知长度校准后确认。手动家具与3D/2D同源；服务端锁定、原子命令、版本校验、幂等与保存失败保护。
- 真实 Codex 仅调用白名单业务工具；咨询增量流、问卷待确认提取、局部候选、录音转可编辑文本。问卷60题，Q58禁用；预算字段独立。
- 保存服务器快照、整版恢复；同版本可编辑 DOCX、PDF、高清平面图、全屋/房间实景渲染、JSON/sidecar/校验清单。

## 最新证据

- 核心5项业务/持久化测试、类型检查、构建：evidence/20260919T111200Z-core。5通过、0失败、0跳过；未统计行覆盖率。
- 完整核心浏览器：evidence/20260919T111932057Z-2c895cc2/result.json，6项通过，页面/控制台错误0。真实导入、校准、添加家具、真实咨询、保存与导出；不是完整八组验收。
- 两图模型识别：20260919T105414691Z-fe593ea8 为用户附件6房间；20260919T111613210Z-a51bbaee 为明确标注的合成2房间对照，均经真实模型。合成图不是另一个真实用户户型；校准测试8m也不是实际测量。
- 导出：20260919T111534041Z-3aa1dd71，14文件校验一致，可编辑DOCX正文与6页PDF；浏览器最终包也通过同版本校验。
- 干净源码安装/类型/构建/启动鉴权：20260919T112145Z-c6105bd2，4项退出0；包不含参考附件、运行数据和凭据。该包对应核心代码快照，未包括后续运维模板及文档更新，不冒充最终发布包。
- 隔离备份恢复/本地服务重启：20260919T112632846Z-6e1a7470，6表行数及SHA一致、恢复健康。私有备份保留在结果注明的 .runtime/alva-backups 路径。
- 真实模型文本/图片/公开音频与实际Codex工具流式证据见 PROGRESS；没有实体麦克风验收证据。

## 未完成范围

完整八组与逐保留UI截图仍未完成；核心冒烟不可换算为100%。受控专业角色及证据解锁的正向墙体操作、门窗迁移、空间合并拆分和需求迁移、大范围确认的服务端完整闸门、指代澄清、参考偏好标注、家具款式/参考家具整组、完整风格/行为/动线审查、版本对比、未答题回Chat、全部焦点/漫游/光照场景、文档生成业务Skills、模型失败隔离注入仍需继续。U16必须最后；排后项未删除。NextTask列直接下一任务。

## 发布边界

用户已指定 prod.huiyuanxp.com 并授权查找旧AWS hackthon发布配置。用户最新明确允许复用旧站点文件及Tunnel并停用旧站点，覆盖先前不得接管旧Tunnel的限制。将复用 /etc/cloudflared/prod-token 和既有域名路由，保留旧文件用于回退。当前尚未切换；公网10/10、公网流式、隧道重启等下一任务执行。MCP保持不变。

旧库 /home/ubuntu/aws-hackthon/renovation-consultation 只读，HEAD 2825f36d7777d2219c6b007ea43735d90ec042ad；旧服务 renovation-workbench.service 端口4173、MCP配置均保持原状。不迁移旧客户数据。

Node24.21.0、npm11.19.0、Codex0.155.1、Python3.12.3、cloudflared2026.9.0；Chromium软件WebGL2可用。保留原始失败证据，不覆盖旧run。每个完成任务提交一次并覆盖Handoff/NextTask。
