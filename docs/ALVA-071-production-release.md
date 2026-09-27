# ALVA-070/071 生产发布收据

2026-09-27 用户要求发布生产。05:14:35 UTC已发布固定main `0c52ea080de95f7811e7bc03d5a1159cf75d2556`，入口 https://prod.huiyuanxp.com 。包含SceneView交互/门窗/阴影修复及家具细节模型、生活MCP生成与三视角critic。

## 版本与回滚

产品源码与已验个人实现901dcd6一致，复用其已通过构建和真实主Chat/MCP/浏览器验收的静态资源。发布前停服务备份生产数据，压缩包完整列读通过；未修改业务数据、验证码或MCP服务配置。

固定发布目录 `.runtime/20260927T051413Z-ALVA071-production/release/`，新增service drop-in `/etc/systemd/system/alva.service.d/ALVA071-release.conf`，显式指定现有Chromium供家具真实截图使用。旧069 drop-in保留，移除071覆盖后恢复旧release。To Do List仍读取main协调文件。

备份、旧service配置、私有环境和回滚脚本在 `.runtime/20260927T051413Z-ALVA071-production/`。回滚执行 `bash .runtime/20260927T051413Z-ALVA071-production/rollback.sh`，保留当前数据库；数据恢复必须另行先备份新写入，不能直接覆盖。

## 验证与边界

- 本机healthz=200，alva.service=active，WorkingDirectory指向071固定release。
- 公网JS/CSS哈希与已验构建逐字相同，见 `evidence/20260927T051558070Z-ALVA071-production-public/result.json`。该run整体失败是登录旧验证码401，不能作为登录通过。
- 生产家具渲染页面与实际服务端截图程序已输出正前右/背左/正面三张PNG，11部件/12084三角形，见 `evidence/20260927T051648919Z-ALVA071-production-render/result.json`。
- 登录后只读检查pending：本机旧验证码失效，已向用户请求现行验证码，未重置认证。没有在生产自动生成或采用家具，完整生成/critic链以071隔离真实验收为据。
- 首次公网脚本把整个JS资源序列化为数字数组，达到验收进程180MB堆上限；改为浏览器内SHA256计算后资源检查通过。该失败不影响生产服务。失败run均保留，未隐去或算作通过。

发布及验证均使用共享heavy锁、CPU80%/总内存20%/swap0，未改变生产资源配置。过程证据：`evidence/20260927T051413Z-ALVA029-alva071-production-deploy-318903/`、`evidence/20260927T051511Z-ALVA029-alva071-production-public-319244/`、`evidence/20260927T051556Z-ALVA029-alva071-public-retry-319653/`、`evidence/20260927T051646Z-ALVA029-alva071-live-render-319926/`。

neat-freak：代码/固定release/公网资源/真实渲染verified-current；发布文档changed-and-verified；登录后检查pending；规则verified-current；生成记忆out-of-scope。备份、私有复核脚本、Worktree、失败证据保留，未清场。历史未发布记录以本收据为最新状态。
