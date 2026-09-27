# ALVA-080 生产发布收据

依据用户持续授权，2026-09-27 16:34 UTC发布固定main `1993a7793126dd6b0f73302d0997515ac69e6778`，地址 https://prod.huiyuanxp.com 。174项源码/配置与最终验收manifest、Worktree一致，沿用已验构建。

修复范围确认未触发后续家具生成。确认后接续原始需求，通过主Chat/生活MCP生成真实候选；失败持久化且可重试，旧确认范围可继续生成。采用仍经范围/锁定/碰撞校验，成功更新主场景，不自动保存。按钮忙碌禁用，错误在卡内可见。

## 发布及恢复

固定目录 `.runtime/20260927T163346Z-ALVA080-production/release/`，服务覆盖 `ALVA080-release.conf`。停服备份数据及上传至 `.runtime/20260927T163346Z-ALVA080-production/data.tar.gz`，tar读取检查通过；环境与原服务覆盖有备份。

回滚：`bash .runtime/20260927T163346Z-ALVA080-production/rollback.sh`，移除080覆盖恢复079代码，保留当前数据库。脚本语法检查通过。MCP/Tunnel及验证码未改，未手工写入生产家具。

## 验证边界

本地/公网health 200，Chromium登录页正常，JS/CSS SHA256与发布构建一致，页面错误0。见[结果](../evidence/20260927T163346Z-ALVA080-production/result.json)、[页面](../evidence/20260927T163346Z-ALVA080-production/public.png)。缺少当前有效登录会话，生产登录后复验pending。

完整隔离验收包含最终类型、5项回归、构建、5项浏览器及3项真实Chat→生活HTTP MCP→生成两候选→采用→主场景家具/刷新持久化。见[功能验收](ALVA-080-furniture-confirmation.md)。诊断用户数据仅保留在私有快照中，Git证据全部为合成数据。

## neat-freak

代码verified-current；运行态公网表面verified-current、登录后pending；文档changed-and-verified；规则verified-current。生成记忆、远端推送out-of-scope（远端main核验96503ad）。既有bundle提示保留。备份、Worktree、私有诊断及失败现场仍保留，等待用户确认后清场；两项根既有未跟踪残留不变。NextTask已覆盖，其他票不自动开工。
