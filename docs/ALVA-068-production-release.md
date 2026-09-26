# ALVA-068 生产发布收据

2026-09-26用户授权发布生产。固定候选main `6eef743`，包含068先猜需求→结果式问答→确认同步，以及已集成030/033。生产地址 https://prod.huiyuanxp.com 。

## 发布与回滚

08:30:08 UTC切换完成，本机healthz=200。发布前停止alva.service并备份144M数据目录，压缩包完整列读通过；私有环境与旧静态资源一并保留。没有替换验证码、生产Tunnel或Coding Machine MCP配置。

备份及回滚：`.runtime/20260926T082943Z-ALVA068-production/`；执行`bash .runtime/20260926T082943Z-ALVA068-production/rollback.sh`可撤下本次service drop-in并恢复旧静态资源，保留当前数据库。数据恢复须先停写并备份发布后的数据，不能直接覆盖用户新修改。

本次把源码和静态资源固定在该目录的`release/`，通过`/etc/systemd/system/alva.service.d/ALVA068-release.conf`启动。以后只在main构建或提交不会更新生产，下一次发布须显式切换release目录。node_modules仍复用现役安装，私有.runtime仍使用原目录；To Do List的.scratch、NextTask.md、SPEC.md链接回main，保持看板实时更新。MCP仍为仅本机HTTP端点，协议/工具由已验代码提供。

服务切换前曾在08:16自动/外部重启，但没有充分发布收据，本次不据此宣称此前已验收上线。旧后端启动时main产品与本次候选相同，旧首页资源独立备份。

## 验证

发布前分组类型检查、问卷8/8和墙体改造4/4回归、完整前端构建通过。首次033检查未设测试专用ALVA033_TEST_CODE而未启动，补隔离测试值后通过；未改生产验证码。所有验证使用共享heavy锁、CPU80%、20%总内存/0swap。构建保留既有大包警告。

源码门禁：`evidence/20260926T082641Z-ALVA068-release-gate-121714/`、`evidence/20260926T082833Z-ALVA068-release-gate-retry-122768/`。发布：`evidence/20260926T082943Z-ALVA068-production/`，资源封装run为`20260926T082942Z-ALVA068-production-deploy-123446`。

公网首页、真实浏览器登录和JS/CSS字节与已验构建一致。生产项目当前为floorplan，未替用户确认建筑或进入生活阶段；068问卷确认同步沿用已通过的隔离真实Chat/MCP/浏览器证据，不冒充生产项目已执行确认。

验收失败run完整保留：脚本初稿语法错误未启动、直接资源请求403后改浏览器内请求通过、脚本预期living而当前floorplan、首次只读Chat前后状态比较不等。Chat完成逻辑会初始化缺省visionQuestions为空数组；首次比较未保留逐字段差异，不能宣称已证实唯一原因。后续以当前项目重读复验记录为准。

最终公网复验通过：`evidence/20260926T083309650Z-ALVA068-production-public/`；实际inspect_topology成功、同一floorplan阶段、问卷/设计/候选/保存状态严格比较不变，独立问卷可打开，页面错误0。资源run `20260926T083307Z-ALVA068-production-stable-state-125209`通过。生产生活设计问卷MCP与确认写入未执行，保持上述边界。

neat-freak：固定源码/发布运行态/文档changed-and-verified；原规则verified-current；生成记忆及其他票重新验收out-of-scope。备份、失败run和私有复核现场保留；临时068预览已恢复，旧066预览仍停止。
