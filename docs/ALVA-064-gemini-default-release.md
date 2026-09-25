# ALVA-064 Gemini 3.8 户型识别默认模型与生产发布

2026-09-25 用户明确授权提交当前内容、保留 Gemini 3.8 为户型生成默认模型、集成 main 并发布。此票只切换**图片户型识别**，不改变普通聊天模型、既有生产数据库或 MCP 配置。

`api/import.ts` 在未显式设置 `OPENAI_VISION_MODEL` 时选择 `gemini-3.8-flash-high`，并对该模型使用 `high` 推理强度；生产私有环境显式固定 `OPENAI_VISION_MODEL=gemini-3.8-flash-high` 和 `OPENAI_VISION_REASONING_EFFORT=high`，防止未来聊天模型调整带动识图模型。既有生产 New API 凭据可真实调用 Gemini 3.8，无需把密钥复制入 Git。

ALVA-062/063 的真实模型回复两轮都未满足严格 Scene schema，实际出现两种字段差异：`doors/windows` 分列且房间缺少 `purpose`，或已有 `openings` 但地理字段在顶层。现役识图仍先执行原生严格解析和仅一次同图修正；只有 Gemini 3.8 修正回复仍在 schema 阶段失败时，才尝试已观察到的字段映射。映射仅合并门窗并标 kind、用房间名补缺失 purpose、把原地理字段移入 geography；不移动墙/房多边形、不改变门窗尺寸与中心偏移，不接受空候选，最终仍执行原 Scene/schema/几何校验。其他模型不启用该兼容路径。自查 Skill 是显式调用的隔离工作流，生产识图不会自动声称自查通过或确认设计。

两份既有真实原始输出回放见 `evidence/20260925T120458387Z-ALVA064-replay-fc5c99/result.json`，20/6/9 和 19/5/7 均通过业务解析、确认拓扑与三类诊断。生产密钥的真实图片调用返回 18/5/9，旧兼容解析首先拒绝了新的地理字段形状，原失败保存在 `evidence/20260925T120518698Z-ALVA064-gemini-prodkey-d7528e/initial-result.json`；加入该形状后同一原始回复回放通过，见 `evidence/20260925T121030404Z-ALVA064-replay-b206bd/result.json`。生产密钥另以 Gemini 3.8 的真实最小调用返回 `OK`。7 项相关测试、类型检查与构建通过。这些检查只证明路径可用，不证明候选与原图一致。

## 发布与验收

实现于 main 提交 `4870b0d`，2026-09-25 已重启 `alva.service` 发布。运行进程使用 Gemini 3.8 Flash High 识图和 `high` 推理强度；普通聊天仍为 Gemini 3.1 Flash Lite。停写备份在私有目录 `.runtime/alva-064-release-20260925T121555Z/`，旧代码回滚 Worktree 在 `/home/ubuntu/Alva-worktrees/ALVA-064-codex-release/.runtime/worktrees/ALVA-064-rollback`，基于 `18a08cf` 且已构建。未改预览 tunnel、MCP 或生产数据库内容。

本机和公网健康检查、首页 200；公网未登录浏览器结果为 `evidence/20260925T121954894Z-ALVA064-public-a12367/result.json`。用户提供有效验证码后，登录后的只读浏览器验收通过：项目可读取、两次读取 revision 不变、页面脚本及登录后控制台错误均为 0；结果为 `evidence/20260925T122229677Z-ALVA064-live-21accd/result.json`。登录前 `/api/session` 返回预期 401。旧本机验证码文件与数据库不匹配，先前失败以及定位 run 均独立保留；没有轮换验证码，验证码值未入库或证据。

此轮未在生产界面提交新的户型导入，也未由用户对照原图验收几何准确性。ALVA-028 继续暂停；隔离预览和同会话自查的历史结论见 ALVA-062/063。
