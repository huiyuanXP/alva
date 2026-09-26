# 25: 墙体分类、证据与专业授权

## 2026-09-26 接入等待已解除

ALVA-066 已在 main `e44c23a` 集成，阶段 MCP 接入前置已满足，066 的共享入口开发占用已释放。原负责人可同步最新 main 后完成本票工具挂载和真实主 Chat 联合验收，无需等待066生产发布。本票保持原署名与 in-progress；以下“等待066合main/运行层未实现/禁止修改066共享入口”均为历史记录，不再是当前阻塞。自身验收条件继续有效。


**ID:** ALVA-032

**Parent scope:** T08

**Review reference:** R20

**What to build:** 受明确授权的专业角色录入墙体分类依据，业主能查看其来源。

**Blocked by:** [ALVA-011](04-openings-scale-confirm.md), [ALVA-031](24-designer-readonly.md)

**Status:** in-progress

**Execution:** 2026-09-26 按用户明确指令由 Lexie 认领；独立 Worktree `task/ALVA-032-Lexie` 开发。专业授权与 owner/designer 分离，墙体分类必须保留证据与操作者；unknown/load-bearing/protected 墙的正式拆改由服务端硬拒绝。

- [ ] 专业能力与业主/设计师只读角色区分，可由受控服务端配置授予及撤回并留痕。
- [ ] 分类保留证据来源与操作者，业主或模型不能自行伪造专业授权。
- [ ] 未知、承重、受保护墙禁止正式拆改；校准不授予拆改许可。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `topology`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## Implementation handoff · 2026-09-26 · Lexie

业务实现完成，但按当前 `AGENTS.md` 的阶段 MCP 完成门禁，Ticket 暂时保持 `in-progress`：ALVA-066 尚未合入 main，且其当前 floorplan 工具包尚未挂载本票导出的 `get_wall_professional_evidence`。现役 API/UI 通过不等于阶段 MCP 已接通，不能冒充 done。

已完成实现：新增 `api/topology/professional-access.ts`，将 professional 与 owner/designer 分离。专业授权只能由服务器管理员调用 `scripts/alva-professional-access-admin.ts` 生成/撤销，普通 owner、designer、模型没有授予入口；授权表保留 operatorId、authority、grantEvidence、grantedBy、grantedAt 与 revoke 审计。professional session 只允许 GET/HEAD、本人 logout、受控墙体分类与正式非承重墙移除，其他写接口统一 403。

墙体分类写入独立 `alva_wall_classifications` 审计表，保留 classificationId、wallId、structural、evidenceText、operatorId、authority、grantId、createdAt，并同步 current scene / confirmed topology / 对应 topologyVersion 的 structural + `professional-classification:<id>` evidence marker。owner 可通过只读接口和 WorkspacePanel“墙体证据”页签查看来源；designer 不获得专业授权详情。比例校准只确认尺度，不生成专业 evidence marker。

正式拆改只提供明确的 professional remove 操作：unknown / loadbearing / protected 全部 403；即使 wall 已校准或被写成 nonloadbearing，没有 `professional-classification:*` 证据仍 403；只有仍处于 active grant 的 professional 对专业确认 nonloadbearing 墙才可移除。成功后原 confirmedTopology、建筑3D、方案/功能区等下游状态失效，要求重新确认户型。

为阶段 MCP 预留了只读 `professionalWallReadTools()` / `get_wall_professional_evidence`，主 Chat 后续只能读取墙体分类、操作者和依据，不能授予 professional、不能替专业人员分类、不能把校准当拆改许可。

第一轮验收：`tests/alva-wall-professional.test.ts` 4/4 通过；覆盖角色不可伪造、owner/designer 越权拒绝、分类来源/操作者/资质审计、校准不授予许可、unknown/loadbearing/protected 拒绝、专业 nonloadbearing 移除、管理员撤销即时失效。TypeScript、production build、`git diff --check` 通过。证据：`evidence/20260926T-ALVA032-round1/result.json`。

第二轮验收：真实监听 `127.0.0.1:43132` + 隔离 PGlite + production assets；通过实际服务器管理员脚本 grant professional → 真实登录 → 专业分类 → owner 读取来源 → 服务/数据库关闭重启后分类和授权仍可追溯 → 关闭服务后管理员脚本 revoke → 重启后当前 professional session=401、旧 invite 登录=401。production bundle 包含“墙体证据 / 墙体分类与专业依据 / 提交专业分类 / 确认移除已核实非承重墙”UI。随后复跑 ALVA-011/031/topology/business + ALVA-032 共 24/24，通过 TypeScript、production build、`git diff --check`。证据：`evidence/20260926T-ALVA032-round2/result.json`。

剩余唯一门禁：ALVA-066 合入 main 后，将 `get_wall_professional_evidence` 挂载到 floorplan stage MCP，并在同一集成 SHA 上完成“主 Chat → floorplan MCP → 读取专业墙体证据/来源 → 无权限写入分类”的真实联合验收。当前门禁证据：`evidence/20260926T-ALVA032-mcp-gate/result.json`。
