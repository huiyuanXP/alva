# ALVA-066 生产发布

2026-09-26 用户明确要求发布生产。候选 main `5bb823b`，产品实现与已验 `c53d3ac` 一致；066 集成提交为 `e44c23a`。复用对应已验构建，发布前逐文件核对 API、web/src 与共享合同和真实浏览器验收的源码清单，无产品差异。

## 切换与回滚

- 2026-09-26 05:32 UTC 已停止旧服务、备份数据、启动新版后端，健康检查通过后原子切换首页。生产仍为 `https://prod.huiyuanxp.com`，服务为 `alva.service`，回源 `127.0.0.1:4173`。
- 私有备份：`.runtime/20260926T053154Z-ALVA066-production/`。包含停服后的 `data.tar.gz`、原私有环境文件、旧版 `189fa20` 源码与静态资源，以及 `rollback.sh`。压缩包完整列读通过，脚本语法检查通过；未为测试回滚而再次中断生产。
- 回滚命令：`bash .runtime/20260926T053154Z-ALVA066-production/rollback.sh`。它将服务固定到备份旧代码及静态资源，保留现有数据库；如需数据库恢复，必须先停服并备份发布后的数据，再从上述压缩包恢复，不能覆盖新用户修改。
- 自动启动失败路径可恢复停服时数据并启动旧代码；本次未触发。历史静态资源 URL 保留，兼容已打开页面。
- 未修改验证码、生产 Tunnel 或 Coding Machine MCP 配置。应用内两阶段 MCP 随本次服务重启加载，保持仅本机短期凭据访问。

发布收据：`evidence/20260926T053154Z-ALVA066-production/result.json`。资源证据：`evidence/20260926T053153Z-ALVA066-production-deploy-30756/`。发布和验收通过共享重任务锁串行运行，并使用合计 MemoryMax=20%、MemorySwapMax=0 的 alva066.slice；未改其他任务或现役生产服务资源配置。

## 验收边界

发布前已通过：分组类型、16 项合并回归、构建、Gemini 3.8 两阶段切换与实际 MCP 诊断、进度展示和临时公网只读验证。详见 [临时预览](ALVA-066-temporary-preview.md)。

生产本机健康通过。生产登录后的两个阶段实际 MCP 调用、可见性与原会话恢复现已通过（见下节）；066 标记 done。其他票的业务验收保持各票职责。

首轮公网脚本将资源字节数组传入 Node，触及其128MiB堆上限，退出134；已改为浏览器内计算摘要，保留失败证据 `evidence/20260926T053241Z-ALVA066-production-public-31576/`。此为验收进程失败，生产服务未退出。

公网复验通过：`evidence/20260926T053609623Z-ALVA066-production-public/result.json`。真实浏览器访问生产健康与首页200，JS/CSS摘要与已验构建一致，JS包含阶段入口与进度展示，未登录阶段接口401，页面错误0。资源受限复验 `evidence/20260926T053607Z-ALVA066-production-public-bounded-35138/` 退出0。有效验证码尚未收到，authenticated=false，未做生产项目写入或实际Chat调用。

neat-freak：发布代码/公网资源 changed-and-verified；文档与回滚入口 changed-and-verified；登录后的生产业务验收 pending，生成记忆 out-of-scope。临时预览已恢复，私有备份、失败证据和原工作区保留。

## 生产登录与实际 MCP 最终验收

用户提供有效验证码后，登录验证通过，原项目revision471只读检查不变；证据 `evidence/20260926T053806166Z-ALVA066-production-public/`。随后在同一已发布产品候选上通过真实主Chat执行生活设计 `get_topology_diagnostics`、户型 `inspect_topology`，两次均完成且isError=false。真实Codex rollout的 `mcp_list_tools` 返回目录按阶段隔离：户型目录没有request_save，生活目录没有edit_topology/generate_building。只归档工具名，不归档真实项目内容。

往返两阶段，分别恢复原有thread ID；没有新建thread冒充恢复。场景、候选、已确认拓扑/建筑、回答、样式、用户分类、保存版本和家具提案均与验收前一致；只追加了明确的只读验收对话和阶段交接，最终回到原living阶段。页面错误0，未执行用户确认或设计采用操作。证据：`evidence/20260926T054023117Z-ALVA066-production-mcp/result.json` 与 `catalogs.json`。资源run `evidence/20260926T054021Z-ALVA066-production-mcp-39465/` 退出0、oom_kill=0。

验证码临时文件已删除，未轮换生产验证码。临时预览已恢复。066以既有隔离业务证据、最终候选受影响回归、生产真实调用/目录/Resume验收闭环完成；没有把历史不同候选的测试冒称在发布SHA重新完整跑过。029定位/非空取舍等专项验收仍由029负责；既有模型保存状态复述错误仍作为已知限制保留，不宣称所有回复内容均可靠。

最终neat-freak：代码、集成、生产实际MCP/页面及文档 changed-and-verified；其他票的业务验收 out-of-scope；生成记忆 out-of-scope。既有bundle警告未消除，失败证据、私有回滚和复核工作区保留。
