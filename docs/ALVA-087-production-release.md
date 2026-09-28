# ALVA-087 生产发布收据

2026-09-28，固定发布 `9dd0bb682024ee6992f2ff9a60080144f46e0309` 至 https://prod.huiyuanxp.com 。发布前确认该SHA已在GitHub main；176项产品源码/配置与隔离验收工作区逐字节一致，前端沿用最终构建。远端同期README/演示媒体已合并，未覆盖文档工作。功能与真实主Chat/MCP证据见[并发合同](ALVA-087-chat-concurrency.md)。

发布目录 `.runtime/20260928T081000Z-ALVA087-production/release`，systemd覆盖 `ALVA087-release.conf`。发布前停写备份数据库、用户资料、上传和访问码，2474个tar成员可读；环境和既有systemd配置另存。`bash .runtime/20260928T081000Z-ALVA087-production/rollback.sh` 回退082代码，保留当前数据；需要恢复数据时单独使用备份，不以Git替代数据恢复。MCP、Tunnel和业务密钥配置未变。

服务、公网健康与固定release核验通过；认证工作区、JS/CSS哈希、刷新保持及生产设计/问卷/候选/保存版本/消息不变通过，页面错误0，临时会话已注销。登录态只读浏览器复核使用临时内部会话，不轮换验证码；浏览器拦截业务POST避免自动引导写入生产，真实交互验收在隔离合成项目完成。本机旧验证码401，网络客户端部分公网请求403，验收脚本另修正了curl输出缓冲限制及Cloudflare外部脚本筛选，最终采用真实浏览器与curl完成页面/资源复核；不把网络客户端失败当产品业务失败。

neat-freak：代码、运行态、规则 verified-current；相关合同/交接 changed-and-verified；机器生成记忆 out-of-scope。既有大bundle提示保留；备份、Worktree及复核现场保留，验收run按24小时规则清理，无本票截图。原有两个未跟踪根文件未动。
