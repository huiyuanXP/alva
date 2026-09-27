# ALVA-074 / ALVA-075 联合发布收据

用户2026-09-27明确授权“和另外一个英文多语言适配的修改一起发布”。10:09:03 UTC已发布固定main `96503ade0505fa09410f5d70a29cc709801449a7`，地址 https://prod.huiyuanxp.com 。包含中英文界面/主Chat输出语言，以及左右阶段导航和会话同步修复。

## 固定版本、备份与回滚

发布前对照074最终验收source manifest及个人Worktree核验169个产品/配置文件，全部一致。直接复制已验构建 `index-BzsMfRCN.js` / `index-srOQRtdU.css`，不发布未验候选。

release：`.runtime/20260927T100837Z-ALVA074075-production/release/`；systemd覆盖 `/etc/systemd/system/alva.service.d/ALVA074075-release.conf`。后续main提交不自动上线，To Do List继续读取main。原数据、验证码、MCP与Tunnel配置保留。

发布前停写备份alva-data及alva-uploads，压缩包完整列读通过；私有运行配置及原服务覆盖也已备份。备份及回滚脚本位于 `.runtime/20260927T100837Z-ALVA074075-production/`，旧073 release保留。

回滚命令：`bash .runtime/20260927T100837Z-ALVA074075-production/rollback.sh`。移除本次覆盖后恢复073，保持当前数据库；不得用旧备份覆盖发布后的用户数据。

## 验证结果

- `alva.service` active，WorkingDirectory固定新release，NRestarts=0，本机及公网healthz=200。
- 公网JS/CSS与已验构建哈希一致。JS SHA256 `cb17c8e9f222f5b558b7d07d6486790ad0294c43305cf681ba80c41e9ec266af`；CSS SHA256 `8bd319b0051979403120737e6392c3f1d699b0384af361a4788d36450c249306`。
- 真实Chromium验证登录页中文→English→刷新保持→中文通过；未登录项目API返回401，页面错误0。
- 当前私有配置中的验证码登录返回401，登录后的生产交互复验 **pending**；未绕过认证或写生产项目。发布前两轮真实双语Chat/MCP、原thread恢复、7步阶段导航回归见[074](ALVA-074-bilingual-interface.md)和[075](ALVA-075-stage-navigation.md)，不冒充本次登录后的线上复验。

证据：`evidence/20260927T100837Z-ALVA074075-production/result.json`；部署过程 `evidence/20260927T100837Z-ALVA066-alva074075-production-deploy-v2-375555/`；公网 `evidence/2026-09-27T101051223Z-ALVA074075-public/result.json` 与 `evidence/20260927T101050Z-ALVA066-alva074075-production-public-v3-376565/`。

失败run全部保留：100723配置备份因历史覆盖文件权限失败（尚未停服），改用sudo复制配置后发布成功；100913探针的独立HTTP客户端被公网返回403，改走真实浏览器fetch；100957探针把整个JS字节数组跨浏览器传递触发160MB Node堆上限，改在浏览器内计算SHA256后通过。未提高资源预算、未降低断言，产品本身无对应报错。

## 知识收尾

neat-freak：固定发布、服务和公网入口 verified-current；文档/交接 changed-and-verified；项目规则 verified-current；登录后复验 pending，生成记忆 out-of-scope。既有bundle体积警告及主工作区窄屏横向溢出仍保留。备份、失败证据和复核现场保留，未执行破坏性清场。
