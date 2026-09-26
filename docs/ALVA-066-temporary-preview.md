# ALVA-066 临时公网预览

用户于 2026-09-26 要求将最新 main 合入当前 Worktree，再通过临时 Cloudflare Tunnel 验证上下文修复。此预览不代表整票或生产验收完成。

- Worktree：`/home/ubuntu/Alva-worktrees/ALVA-066-codex-stage-mcp`。
- 合并：`c2b73c7` 合入 main `e0cff4e`；`73194d2` 再合入问卷修订 `f9fd9ef`；`22d7e24` 同步最新 main `a5bcb51` 发布文档。
- 保留新版 Your Home Vision、快照历史预览、阶段 MCP 和上下文精简；冲突逐项合并。快照预览测试补齐保存前布局复核，不绕过保存门禁。
- 临时入口：<https://passes-submissions-cia-sim.trycloudflare.com>。验证码仅在私有验收项目 `access-code` 文件和用户交付消息中，不入 Git。
- 用户级服务：`alva066-preview-app.service` 和 `alva066-preview-tunnel.service`；应用回源 `127.0.0.1:4186`。Quick Tunnel 进程重建后地址可能变化，以 `.runtime/alva066-preview/url` 与 journal 为准。
- 运行配置和入口脚本：本 Worktree `.runtime/alva066-preview/`。主 Chat 随 main 更新为 Gemini 3.8 Flash High；识图保持 Gemini 3.8 Flash High。
- 数据：原隔离验收项目 `.runtime/20260925T202946472Z-ALVA066-floorplan-upload/`，保留用户修改及原阶段 thread；2026-09-26 重启后只读验证为 revision 176、户型阶段、拓扑已确认、建筑待生成，诊断告警 0。未恢复旧备份覆盖用户操作。尺寸与需求包含明确合成验收数据，不是生产客户项目。
- 启动前备份：`.runtime/alva066-preview/pre-start-backup/`。预览运行时，禁止对同一验收数据库同时启动 CLI 实测脚本；公网检查通过 HTTP 操作现有服务。
- 生产 `alva.service`、生产 Tunnel、MCP 远端服务配置未改。

## 运行管理

查看：`systemctl --user status alva066-preview-app alva066-preview-tunnel`。
停止：`systemctl --user stop alva066-preview-app alva066-preview-tunnel`。
该实例为用户验收保留，当前不清场。后续重建隧道地址须同步 ALVA_ORIGIN、重启预览应用并再次验证公网登录及 Chat。

## 验证

- `evidence/20260926T033933Z-ALVA066-main-merge-final-verify-709497/`：类型检查、12/12 相关回归、前端构建通过；保留已有大于 500 KB 的 bundle 提示。
- `evidence/20260926T034156715Z-ALVA066-public-preview/`：公网浏览器登录、新版问卷、快照历史、原 living thread 实际 get_snapshot 通过；场景与 savedVersion=2 不变、页面脚本错误 0，截图已保存。
- **已知回复错误**：模型虽然实际读取 get_snapshot，却把 savedVersion=2 误述为没有正式保存记录；页面/API 数据正确。此项未修复，公网记录仅证明传输、UI 和实际工具执行，不证明模型复述全部正确。
- 前序失败证据保留，066/029/057 的完整 MCP 联合验收仍 pending。

## 2026-09-26 阶段恢复与诊断修复

主机重启后原 Quick Tunnel 失效，已重建上述入口。确认卡不再计算内容哈希，改用持久化的 topology/building/design 数字版本；只有相关内容变化才失效，聊天或无关回答不使建筑卡过期。旧卡可刷新，刷新不等于确认。阶段按钮显示不能进入的原因，并可请求建筑生成或确认卡。

户型 `inspect_topology` 与生活设计只读 `get_topology_diagnostics` 复用页面诊断，包含告警 code、墙/房/门窗 ID、坐标、检查边界和修复建议。自动修复 issue 为空不代表诊断没有告警。

本次所有验证、应用、Tunnel 和浏览器共用 `alva066.slice`，合计 MemoryMax=20%（本机 803680256 字节）、MemorySwapMax=0、CPUQuota=80%。安装模板：`install -m 644 ops/alva/alva066.slice ~/.config/systemd/user/alva066.slice` 后 `systemctl --user daemon-reload`。用 `scripts/alva-066-run.sh <run-name> bash scripts/alva-066-verify.sh types|tests|build` 顺序验证；测试逐用例进程隔离。完整根类型检查超出预算，改用 API/web/受影响测试分组检查通过，未声称完整根检查通过。

- 分组类型：`evidence/20260926T044820Z-ALVA066-stage-versions-typecheck-7551/`。
- 最终版本回归：`evidence/20260926T044929Z-ALVA066-stage-versions-regression-7821/`，阶段、确认恢复、诊断、快照保存和重启通过。
- 构建：`evidence/20260926T045119Z-ALVA066-stage-versions-build-8791/`。
- 真实浏览器与现役 Agent：`evidence/20260926T045201321Z-ALVA066-stage-recovery-browser/`，过期卡刷新后单独确认、往返阶段、实际 inspect_topology 返回 open_boundary/墙 ID/坐标及修复指导通过，无几何修改、页面错误 0。
- 公网只读验证：`evidence/20260926T045750478Z-ALVA066-stage-recovery-public/`，登录、当前阶段可点击、诊断与截图通过，原项目 revision 176 不变。两个最终浏览器 run 无 OOM；此前预算调试 OOM 和重启中断证据保留。

neat-freak：代码、预览运行、合同及规则 changed-and-verified；整票联合验收和已知保存状态复述问题 pending；生产和生成记忆 out-of-scope。该次验证时未合回 main，066/029 保持 in-progress。验收现场保留。

## 用户授权合并后的联合候选（2026-09-26）

已同步 main `9fdf91c`：保留 ALVA-067 的 Gemini 3.8 主 Chat 与圆点上方进度，以及 ALVA-038 快照恢复。解决页面入口和交接文件冲突；恢复测试先准备当前审查，不绕过保存门禁。

- 分组类型通过：`evidence/20260926T050457Z-ALVA066-merge-main-types-fixed-14058/`；首次 JSX 冲突未完全解决的失败 run 保留。
- 16 项回归通过：`evidence/20260926T050537Z-ALVA066-merge-main-regression-14391/`。
- 构建通过：`evidence/20260926T050929Z-ALVA066-merge-main-build-17355/`；保留已有 bundle 提示。
- Gemini 3.8 实际 MCP 与浏览器通过：`evidence/20260926T050959624Z-ALVA066-stage-recovery-browser/`。确认卡刷新/单独确认、往返阶段、完整告警读取、进度显示和结束清除通过；场景未修改，页面错误 0。

这些检查覆盖此次合并影响，不代表 066/029 所有验收项完成。生产服务未重启、生产资源未构建或替换；预览与验收继续共用 20% 内存 slice。

合并后预览公网登录与页面只读复验通过：`evidence/20260926T051132532Z-ALVA066-stage-recovery-public/`；地址保持不变，revision 176、页面错误 0。
