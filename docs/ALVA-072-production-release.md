# ALVA-072 生产发布收据

用户2026-09-27明确授权“发布”。08:16:26 UTC已发布固定main `30156f7d9d13fdeb5998c5d860c4e090eb8dc466`，入口 https://prod.huiyuanxp.com 。顶部项目名提供新建/切换，空项目从主Chat户型附件开始；原项目与验证码保留。

## 发布与回滚

固定release `.runtime/20260927T081603Z-ALVA072-production/release/`，systemd覆盖 `/etc/systemd/system/alva.service.d/ALVA072-release.conf`。源码与已验个人实现产品目录逐字一致，复用真实浏览器验收的 `index-BWPRAzdC.js` / `index-vcxkhEhD.css`；后续main改动不自动发布。To Do List继续读取main协调记录。

发布前停止应用、备份 `.runtime/alva-data`，压缩包完整列读通过；旧release与071覆盖保留。配置、source归档、数据备份和回滚脚本位于 `.runtime/20260927T081603Z-ALVA072-production/`。未修改MCP服务、Tunnel、原设计或验证码，没有自动创建生产验收项目。

回滚：`bash .runtime/20260927T081603Z-ALVA072-production/rollback.sh`，移除072覆盖并恢复071源码，保留当前数据库。此次数据库增量为授权目录和导航幂等表，旧版本不读取它们。若发布后已创建新项目，回滚后数据仍在库中，但071没有切换入口；重新登录进入原默认项目。重新发布072可恢复新项目入口。不得用旧备份直接覆盖发布后写入的数据。

## 验证与边界

- alva.service active、WorkingDirectory指向072固定release、本机healthz=200。
- 公网首页、健康与JS/CSS哈希通过；JS SHA256 `c108d379e2c77f5e14092c0e410a17212c7ae13014dc984e88785509b2009555`，CSS SHA256 `ce1f676dd2c414da56db8efdfa090bc9c7e3d54fab90bf4921d7599c4d4bb92e`。
- 本机配置的旧验证码在现役应用返回401，未修改认证。已请求用户当前验证码；登录后入口/项目列表只读复验pending，不能冒称线上新建切换已测。完整新建/切回、16项回归及真实Chat/MCP验证见[功能验收](ALVA-072-project-switching.md)。
- 第一轮公网检查的Playwright APIRequestContext请求在边缘返回403，浏览器已成功加载健康页、首页与静态资源；改为真实页面同源fetch复核API拒绝状态，未放宽应用或边缘规则。失败run保留。

发布使用共享heavy锁及CPU80%/总内存20%/swap0任务限制，生产服务与068测试预览保持原资源配置。

证据：`evidence/20260927T081603Z-ALVA072-production/result.json`；发布过程 `evidence/20260927T081603Z-ALVA066-alva072-production-deploy-336738/`；首轮公网 `evidence/20260927T081716551Z-ALVA072-production-public/`。最终公网复核 `evidence/20260927T081753679Z-ALVA072-production-public/`：资源一致、页面错误0、真实页面未登录API返回401；过程 `evidence/20260927T081751Z-ALVA066-alva072-public-browser-fetch-337383/`。

neat-freak：固定发布/代码/公网资源 verified-current；发布文档与交接 changed-and-verified；登录后复验 pending；规则 verified-current；生成记忆 out-of-scope。备份、失败证据和私有复核现场保留。
