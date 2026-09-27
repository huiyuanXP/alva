# ALVA-076 生产发布与登录后验收

2026-09-27 14:02:19 UTC已按用户持续修复/发布授权发布固定main `0a25f98a5b9b6e537001cf4427c95a105dbb62e2`。地址 https://prod.huiyuanxp.com 。个人实现68c6e72，169项源码与已验manifest一致。

生产release `.runtime/20260927T140152Z-ALVA076-production/release/`；覆盖 `/etc/systemd/system/alva.service.d/ALVA076-release.conf`。停写备份alva-data/alva-uploads、配置备份和回滚均已准备并验证。回滚：`bash .runtime/20260927T140152Z-ALVA076-production/rollback.sh`，恢复074075固定release，保留当前数据库，不覆盖发布后数据。

## 登录后生产验证

使用用户提供的有效验证码正常登录owner；不绕过认证。先确认建筑/拓扑已完成，旧版导航真实复现等待模型交接且返回TOOL_FAILED。新版本验证：

- 英文Living/Floorplan连续4次往返通过，892/599/534/483毫秒完成，按钮可立即继续操作。
- 未屏蔽自动引导时，当前回复进行中点击Living，1189毫秒完成取消与切换。
- 最后恢复原floorplan阶段；两条原thread ID不变；scene/candidate/已确认拓扑与建筑/answers/savedVersion组合哈希不变。Chat取消会留下对应消息状态，不声称整个revision不变。
- 页面错误0；公网JS/CSS哈希与已验构建一致，服务active/NRestarts=0。JS `index-C023-QsA.js`，CSS `index-Cn1ruIKk.css`。

证据：`evidence/2026-09-27T140220642Z-ALVA076-public/result.json`、`evidence/20260927T140219Z-ALVA066-alva076-production-verify-394773/`、`evidence/20260927T140152Z-ALVA076-production/result.json`。发布前类型/构建、5项阶段回归、5步真实HTTP流取消浏览器、真实模型/MCP四步通过，详见[功能合同](ALVA-076-stage-navigation.md)。

## neat-freak收尾

代码/生产登录后路径/服务 verified-current；合同与交接 changed-and-verified；规则 verified-current；生成记忆 out-of-scope。075此前登录后pending已由本次实际阶段往返核验补齐。既有bundle体积提示与整页窄屏横向溢出保留。备份、失败与复核现场保留；本次验证码临时副本在验收后删除，不写入Git或报告。MCP/Tunnel配置未变。
