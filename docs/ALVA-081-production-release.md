# ALVA-081 生产发布收据

2026-09-27 17:09 UTC，按用户直接发布授权上线固定main `e4755c0d3787a904b1cf378d1b6af7658c5c4108`，地址 https://prod.huiyuanxp.com 。175项源码/配置逐文件与已验manifest及个人Worktree一致，前端沿用已验构建。

修复范围确认后家具生成：精简可用资产与房间几何、完整add参数、工具错误修正提示、同thread/原总时限内一次空结果纠正、整批候选校验。详细模型接续保留原始需求；实际候选仍须用户采用，不自动保存。见[功能与验收](ALVA-081-furniture-generation.md)。

## 备份与回滚

固定release：`.runtime/20260927T170845Z-ALVA081-production/release/`；服务覆盖`ALVA081-release.conf`。发布前停写备份`.runtime/20260927T170845Z-ALVA081-production/data.tar.gz`，tar完整读取检查通过；原环境和systemd覆盖已备份。

回滚命令：`bash .runtime/20260927T170845Z-ALVA081-production/rollback.sh`。脚本语法检查通过，移除081覆盖恢复080代码，保留当前数据库；完整数据备份另存。MCP、Tunnel及验证码配置未改。

## 运行验证

服务active、NRestarts=0，本地/公网health 200；公网Chromium登录页正常、页面错误0；JS/CSS哈希与发布构建一致。[结果](../evidence/20260927T170845Z-ALVA081-production/result.json)、[页面](../evidence/20260927T170845Z-ALVA081-production/public.png)。当前私有运行配置没有有效验证码，生产登录后复验pending，未绕过鉴权或修改用户设计。

最初Node fetch公网探针收到Cloudflare 403校验页，curl和真实浏览器正常；没有把它当应用失败或修改Cloudflare策略，失败与诊断保留在独立run及发布证据。

完整隔离验收：最终API/web/脚本/测试类型检查、2项范围专项、此前7项相关回归、构建、5项浏览器与3项真实Chat/HTTP MCP/浏览器通过。真实多房间模型修正两次参数错误后生成两套方案，均包含沙发/书桌/床/柜，采用5件家具后刷新保持。

## neat-freak

代码与公网运行态verified-current；文档changed-and-verified；规则verified-current；生产登录后pending；生成记忆/远端推送out-of-scope（远端main仍96503ad）。既有Vite bundle提示保留。备份、Worktree、失败及真实调用现场保留供复核；原两项根未跟踪文件未动。NextTask已覆盖且081无执行署名，不自动开工其他票。
