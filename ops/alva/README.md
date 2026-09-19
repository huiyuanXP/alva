# 本地运行与恢复（历史本地配置）

当前生产配置请优先读取 [DEPLOYMENT.md](DEPLOYMENT.md)。alva-dev.service 已停用，不能与生产服务同时启动；本页本地配置只用于恢复旧验收环境。

alva-dev.service 是专用常驻单元，仅监听 127.0.0.1:4180。环境文件 .runtime/alva.env 权限600；样例 .env.example 不含密钥。Node/Codex执行路径由环境 PATH 配置。部署前先 `npm ci --ignore-scripts`、`npm run check`、`npm run build:alva`。

安装单元：`sudo install -m 644 ops/alva/alva-dev.service /etc/systemd/system/alva-dev.service`；`sudo systemctl daemon-reload`；`sudo systemctl enable --now alva-dev.service`。健康 `curl -f http://127.0.0.1:4180/healthz`；日志 `sudo journalctl -u alva-dev.service`。不要输出环境文件或完整项目链接到公开日志。

备份验收：`node_modules/.bin/tsx scripts/alva-backup-check.ts`，会停止本服务、归档本项目数据、在隔离目录逐表比对、重启本服务。证据入 evidence，数据备份仅入忽略且私有的 .runtime/alva-backups。备份文件包含项目私有链接/数据，不得作为源码交付。恢复操作须先停本服务，保留现有数据目录副本，再将选定归档恢复到 .runtime/alva-data，确保ubuntu所有权后启动并检查；不可热覆盖PGlite目录。

干净安装复现：`python3 scripts/alva-clean-install.py`。新隔离目录 npm ci/check/build，隔离端口4182健康与鉴权检查，成功后清理临时副本；证据和不含凭据的源码包保留。此脚本不替代完整八组验收。

回滚代码：停本服务，在独立目录检出明确的已验收提交、按锁文件安装构建，再调整本专用单元WorkingDirectory/ExecStart；不要对有未提交修改的工作树执行reset。数据若需回滚按上述备份恢复流程执行。正式版本发布后补充该版本的具体回滚命令与Tunnel重启验证；当前核心公网部署已完成，具体见DEPLOYMENT.md。

首轮备份验收发现临时systemd单元停止后消失，已改成本目录持久单元，后续恢复检查通过。未修改旧workbench和任何MCP/Tunnel配置。
