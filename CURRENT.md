# 恢复索引

## 当前状态：ALVA-053、ALVA-056已完成

项目根 `/home/ubuntu/Alva`。53诊断与解析修复已集成`97c0ae7`；56原生MiMo复测与输出修复已完成本次main集成，个人实现`fbfe8e8`，源码验收基线`b34cc23`。两票均done，不再恢复为进行中，也不重复旧鉴权失败探针。

MiMo使用正常用户`codex exec --profile mimo`，默认请求Pro、目录限Pro/Flash。最后一次显式纠错耗时554.416秒，26墙/5房/12开口通过JSON/schema/几何/确认拓扑与三类诊断；它不是首轮成功，也不自动确认用户设计。空候选、中心offset语义、仅一次纠错及同源指纹约束已修复；识图每次600秒、普通Chat120秒。

最终类型检查、36项相关回归、5轮真实输出独立回放通过。扩大校准回归曾触及1500MiB任务上限，未计通过；最终拆分检查保持原限额且无OOM。证据：[最终复核](evidence/20260925T081435Z-ALVA056-final-b68614/summary.json)、[主线集成](evidence/20260925T084025Z-ALVA056-integration-3bc356/integration.json)、[53证据](evidence/20260925T064257Z-ALVA053-recovery-acceptance/summary.json)。

## 边界与下一个动作

未部署、未重启生产、未改生产设计/数据或Codex/MCP配置。原生CLI证据不等于业务App Server长时SSE/取消链路验收；最新标注截图的未标注原图仍缺。裸systemd任务不继承用户NEWAPI_KEY时会在预检被拒，复跑用既有正常鉴权会话，不复制凭据。需要上线时按发布流程补上述检查，不因done自动发布。

主目录[NextTask](NextTask.md)保留020、036、057等在途署名，ALVA-028继续用户暂停；其他票的状态/范围由单票与实时认领表决定，本轮未接管。旧056暂存成果已按本票验收吸收，AGENTS及其他工作不覆盖，所有Worktree和私有原始模型结果保留。私有集成保护基线`.runtime/20260925T081435Z-ALVA056-final-b68614/`。

## 权威入口

单票：[53](docs/ALVA-053-model-topology-audit.md)、[56](.scratch/alva-topology-quality/issues/02-mimo-vision-retry.md)；[MiMo复测/命令](docs/MIMO-VISION-RETRY.md)、[Handoff](Handoff.md)、[44张产品票](.scratch/alva-completion/README.md)、[拓扑补充票](.scratch/alva-topology-quality/README.md)。053/056是额外维护任务，不计入44票产品完成数。

[目录规范](docs/PROJECT-STRUCTURE.md)、[SPEC](SPEC.md)、[ACCEPTANCE](ACCEPTANCE.md)保持权威；不以旧week/step重排票号。[服务器事故](docs/INCIDENT-2026-09-25-server-recovery.md)记录历史内存/网络问题及Power key关机。所有重型任务串行且设cgroup限制，保留OS余量；不放宽断言，不删除证据。
