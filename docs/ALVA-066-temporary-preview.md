# ALVA-066 临时公网预览

用户于 2026-09-26 要求将最新 main 合入当前 Worktree，再通过临时 Cloudflare Tunnel 验证上下文修复。此预览不代表整票或生产验收完成。

- Worktree：`/home/ubuntu/Alva-worktrees/ALVA-066-codex-stage-mcp`。
- 合并：`c2b73c7` 合入 main `e0cff4e`；`73194d2` 再合入问卷修订 `f9fd9ef`；`22d7e24` 同步最新 main `a5bcb51` 发布文档。
- 保留新版 Your Home Vision、快照历史预览、阶段 MCP 和上下文精简；冲突逐项合并。快照预览测试补齐保存前布局复核，不绕过保存门禁。
- 临时入口：<https://symbol-nurses-worldwide-stan.trycloudflare.com>。验证码仅在私有验收项目 `access-code` 文件和用户交付消息中，不入 Git。
- 用户级服务：`alva066-preview-app.service` 和 `alva066-preview-tunnel.service`；应用回源 `127.0.0.1:4186`。Quick Tunnel 进程重建后地址可能变化，以 `.runtime/alva066-preview/url` 与 journal 为准。
- 运行配置和入口脚本：本 Worktree `.runtime/alva066-preview/`。业务模型沿用 Gemini 3.1 Flash Lite；识图 Gemini 3.8 Flash High。
- 数据：原隔离验收项目 `.runtime/20260925T202946472Z-ALVA066-floorplan-upload/`，预载建筑、家具、房间样式及保存版本 v2，保留原阶段 thread。尺寸与需求包含明确合成验收数据，不是生产客户项目。
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
