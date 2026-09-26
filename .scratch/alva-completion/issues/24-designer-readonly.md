# 24: 设计师只读访问与撤销

**ID:** ALVA-031

**Parent scope:** 补齐U30

**Review reference:** R19

**What to build:** 业主授权设计师查看当前项目，并能撤销该访问。

**Blocked by:** [ALVA-008](01-shared-login-code.md)

**Status:** done

**Execution:** 2026-09-26 由 Lexie 完成；复用现有统一验证码/session/invite 基础，补齐设计师只读授权管理、撤销、跨项目拒绝与服务端硬只读。两轮验收通过后集成 main。

- [x] 设计师也必须通过统一验证码门槛，分享不绕过入口限制。
- [x] 页面可查看授权内容；直接调用编辑/采用/保存/恢复接口也被拒绝，不能仅隐藏按钮。
- [x] 撤销及跨项目请求拒绝；共享验证码不自动升级角色，不建设完整账号平台。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `access`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## Implementation handoff · 2026-09-26 · Lexie

实现完成：新增 `api/access/designer-access.ts`，业主可列出、生成和撤销当前项目的设计师只读邀请；`AlvaStore.listInvites()` 提供只读邀请状态与活跃会话数，撤销仅作用于当前项目。设计师登录仍必须同时提供统一验证码与邀请 token，得到 `role=designer`；服务端 `onRequest` 对设计师所有非 GET/HEAD 项目请求统一 403，仅允许 `/api/logout` 结束自己的 session，因此不是只靠隐藏按钮。跨项目 `/api/projects/:id` 请求在 session 项目校验处 403；邀请撤销后，已有设计师 session 和旧邀请 token 立即失效。未引入账号平台或额外身份系统。

前端新增 `web/src/access/DesignerAccessPanel.tsx` 并挂到 WorkspacePanel“访问”页签：业主可生成新邀请、查看有效/已撤销授权和活跃会话数并撤销；设计师看到明确的只读说明。原顶部“分享”入口保持兼容。

第一轮验收：`tests/alva-designer-readonly.test.ts` 3/3 通过，覆盖统一验证码+invite、当前项目查看、save/restore/commands/proposal accept/answers/invites 直接写接口全部 403、跨项目 403、撤销立即失效、旧邀请不可复用、设计师可正常 logout、GET 授权管理仍 owner-only。TypeScript、production build、`git diff --check` 通过。证据：`evidence/20260926T0955Z-ALVA031-round1/result.json`。

第二轮验收：真实监听 `127.0.0.1:43131` + 隔离 PGlite + production assets；首页 200，构建产物包含“设计师只读访问 / 生成新的只读邀请 / 撤销访问 / 只读查看”UI，真实 cookie 登录后 designer GET 当前项目=200、save=403、跨项目=403、GET invite management=403；关闭并重启服务/数据库后 designer session 仍按原授权恢复，业主撤销后当前 designer session=401、旧 invite 登录=401，owner 不受影响。随后复跑 access/public-entry/foundation/snapshot/topology 相关回归共 33/33，通过 TypeScript、production build、`git diff --check`。证据：`evidence/20260926T1005Z-ALVA031-round2/result.json`。main 集成态再次执行同一第二轮链路与 33 项相关回归均通过，证据：`evidence/20260926T1005Z-ALVA031-round2-main/result.json`。
