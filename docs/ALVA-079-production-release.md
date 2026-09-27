# ALVA-079 生产发布收据

用户授权“开发完成后直接部署上线”。2026-09-27 15:52 UTC发布固定 main `480b8c5682e2dfe9d6a2fa7d8f928593b0deb7cc` 至 https://prod.huiyuanxp.com 。173项源码/配置与已验manifest和Worktree一致，沿用验收构建。

漫游与全屋统一SceneView门窗渲染；保留穿门通行、墙窗/家具碰撞及暂停控制；生活MCP set_view(mode=walk)进入相同场景。

## 备份与回滚

固定发布目录 `.runtime/20260927T155154Z-ALVA079-production/release/`，服务覆盖 `ALVA079-release.conf`。停服后备份数据与上传至 `.runtime/20260927T155154Z-ALVA079-production/data.tar.gz`，归档读取检查通过；私有环境与原服务配置备份保留。

回滚命令：`bash .runtime/20260927T155154Z-ALVA079-production/rollback.sh`。移除079覆盖恢复078代码，保留用户最新数据库；脚本语法检查通过。业务密钥、验证码、MCP及Tunnel配置不变。

## 验证

本地/公网health 200，Chromium登录页正常，页面错误0，公网JS/CSS SHA256与release一致。见[结果](../evidence/20260927T155154Z-ALVA079-production/result.json)及[页面](../evidence/20260927T155154Z-ALVA079-production/public.png)。当前无可用生产验证码或已登录会话，登录后漫游复验pending；未修改凭据或业务数据。

隔离环境真实按键穿门往返、全屋/漫游网格一致、碰撞/暂停/房间切换、真实主Chat→生活HTTP MCP→applied回执、全屋回归已通过，见[功能验收](ALVA-079-walkthrough-renderer.md)。

## neat-freak

代码verified-current；运行态公网表面verified-current、登录后pending；文档与授权规则changed-and-verified。生成记忆/远端同步out-of-scope；远端main核验96503ad，本轮仅发布不推送。既有bundle提示保留。备份、Worktree和复核现场仍保留，等待用户确认后清场；根两项既有未跟踪文件未改。NextTask已覆盖，其他票不自动开工。
