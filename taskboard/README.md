# 任务看板运维

当前 `/todo`、`/todo/api/board` 已由正式 `renovation-workbench.service` 集成提供，统一监听 127.0.0.1:4173。公网 https://prod.huiyuanxp.com 是工作台首页，https://prod.huiyuanxp.com/todo 是看板。

数据源仍是 `.scratch/openplan3d-consultation/` 的 spec、PLAN 和 issues。只读看板每30秒同步；只有完成实际验收的票设 done。

不要在正式服务运行时启动旧 `python3 taskboard/server.py`。旧 PID 文件是历史记录，不能据此停止进程。服务管理、私有数据保护和回滚见 [部署说明](../docs/DEPLOYMENT.md)。
