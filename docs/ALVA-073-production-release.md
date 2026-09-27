# ALVA-073 生产发布收据

用户2026-09-27明确授权“直接部署即可”。09:08:09 UTC已发布固定main `aa4f900221e363c94e5efb008cc7a5ea77edeb29`，地址 https://prod.huiyuanxp.com 。首次进入主动开场、阶段切换与Resume按真实断点接续、户型校准后自查和生活问卷引导已包含。

## 发布与回滚

固定release `.runtime/20260927T090745Z-ALVA073-production/release/`，systemd覆盖 `/etc/systemd/system/alva.service.d/ALVA073-release.conf`。产品源码与已验个人实现一致，使用最终真实浏览器验收的 `index-BinsdSTn.js` / `index-vcxkhEhD.css`；后续main改动不自动发布。To Do List继续读取main协调记录。

发布前停写备份alva-data及alva-uploads，压缩包完整列读通过；旧072 release及配置保留。备份、配置和回滚脚本位于 `.runtime/20260927T090745Z-ALVA073-production/`。业务数据、验证码、MCP与Tunnel配置保留。

回滚：`bash .runtime/20260927T090745Z-ALVA073-production/rollback.sh`，移除073覆盖后恢复072，保留当前数据库；本票仅新增可选消息断点字段，无需数据库回退。不得用旧备份覆盖发布后的用户数据。

## 验证与边界

- alva.service active、WorkingDirectory固定073 release、本机healthz=200。
- 公网首页、健康、JS/CSS哈希与已验构建一致，页面错误0，未登录项目API正确返回401。
- JS SHA256 `150d99963ffd8ddd193a28b4d81580dbbf6c3d001f1f93fca90ab67539a4d216`；CSS SHA256 `ce1f676dd2c414da56db8efdfa090bc9c7e3d54fab90bf4921d7599c4d4bb92e`。
- 未持有当前有效验证码，登录后生产交互复验pending；未绕过认证或自动修改生产项目。真实模型/MCP/浏览器两轮8步验收及18项回归见[功能合同](ALVA-073-stage-guidance.md)。

证据：`evidence/20260927T090745Z-ALVA073-production/result.json`；部署过程 `evidence/20260927T090744Z-ALVA066-alva073-production-deploy-353744/`；公网 `evidence/20260927T090829564Z-ALVA073-production-public/result.json`，过程 `evidence/20260927T090827Z-ALVA066-alva073-production-public-354092/`。使用共享heavy锁、CPU80%/总内存20%/swap0，生产与068预览资源配置不变。

neat-freak：代码/固定发布/公网资源verified-current；文档与交接changed-and-verified；规则verified-current；登录后复验pending；生成记忆out-of-scope。备份、回滚与复核现场保留，未执行破坏性清场。
