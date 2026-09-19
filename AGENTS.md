# alva 项目约束

持久项目名为 alva；根目录 /home/ubuntu/Alva/alva。上级 AGENTS.md 生效。

新任务单独编号 ALVA-000 起，不重排旧库 week/step。旧库 /home/ubuntu/aws-hackthon/renovation-consultation 只读；不读取业主数据。用户后续已授权查找旧发布凭据并使用prod.huiyuanxp.com；发布切换仅在验收后执行并准备回滚，MCP不变。

恢复读取 CURRENT.md、Handoff.md、NextTask.md、SPEC.md、ACCEPTANCE.md 和 PROGRESS.md。每票完成提交一次并覆盖 Handoff/NextTask；失败和证据按新 run ID 保留。

本轮用户要求串行执行，不派子 Agent。新服务及数据用 alva-* 名称；端口选择前核验占用。业务密钥不进入 Git；只通过环境或私有运行配置传入。

附件权威来源 references/ 与 SOURCES.md。旧实现只作经验证的复用候选；其样例、旧票 done 与旧部署状态都不构成本项目验收。
