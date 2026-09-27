# 46: 新建与切换项目

**ID:** ALVA-072

**Parent scope:** 用户2026-09-27明确要求“实现一个新建&切换入口”

**What to build:** 顶部新建与切换入口；新项目从空白户型导入开始，旧项目、设计、聊天和手动保存版本保留；设备会话独立选择；同票接入当前阶段 MCP。

**Blocked by:** [ALVA-008](01-shared-login-code.md)

**Status:** done

**Owner:** codex-projects

**Parallel lane:** `access`；会话、api装配、主Chat与页面入口修改串行。现役ALVA-066阶段MCP已在main集成，复用其受控UI回执与授权。

- [x] 业主新建空项目，往返旧项目保持数据，刷新与重启保持选择。
- [x] 新建幂等、会话隔离、旧标签页拒绝、设计师邀请固定项目。
- [x] 当前阶段主Chat真实MCP调用打开同一确认面板，等待页面回执及用户点击。
- [x] 最终回归、main集成、交接；生产发布独立记录。

## Implementation handoff

实现、证据、失败及限制统一见 [ALVA-072](../../../docs/ALVA-072-project-switching.md)。

个人实现提交 `d6172be`，已squash集成main；16项相关回归与真实主Chat/MCP/浏览器/重启验收通过。生产未发布。
