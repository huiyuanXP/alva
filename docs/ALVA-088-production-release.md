# ALVA-088 生产发布收据

2026-09-30 07:34 UTC，固定main `2c70aec10843f8810e406ef307d0ba9a7d38cffb` 发布至 https://prod.huiyuanxp.com 。发布前确认SHA已在GitHub main；178项产品源码/配置与最终验收Worktree逐字节一致，前端沿用最终构建。行为与验收见[入口合同](ALVA-088-living-entry.md)。

发布目录 `.runtime/20260930T073446Z-ALVA088-production/release`，覆盖配置 `ALVA088-release.conf`。停写备份数据库、上传、用户资料和访问码，tar 2465个成员可读；环境和原systemd配置另存。`bash .runtime/20260930T073446Z-ALVA088-production/rollback.sh` 回退087代码并保留当前数据；需要恢复数据时单独处理备份。MCP、Tunnel与业务密钥配置未变。

服务与公网健康、认证工作区、旧生成/确认控件消失、公共JS/CSS与构建哈希一致、刷新及生产设计/问卷/消息/保存版本/阶段保持通过，页面错误0。临时只读验证会话已注销；浏览器拦截业务POST和自动引导，不替用户采用当前户型。新流程的实际确认和真实Chat/MCP验收在隔离合成项目完成。

发布准备首轮复制受限配置权限失败，尚未停服；次轮临时验证脚本相对导入错误，回滚到087并确认健康；修正脚本路径后本次发布通过。失败备份现场保留，不把失败尝试计作成功发布。

neat-freak：代码、运行态、规则verified-current；文档与交接changed-and-verified；生成记忆out-of-scope。既有bundle体积提示保留；备份、Worktree和复核现场保留，验收产物按24小时管理，全部验收截图查看后已删除。原有根目录两个未跟踪文件未动。
