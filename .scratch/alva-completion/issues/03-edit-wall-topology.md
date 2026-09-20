# 03: 修改墙线与房间轮廓

**ID:** ALVA-010

**Parent scope:** T02-B

**What to build:** 用户在导入的二维候选上修正墙的位置、连接点和房间轮廓，并保存修正后的候选。

**Blocked by:** 02：导入户型图并由Codex生成二维初稿

**Status:** done

**Execution:** 已实施并完成验收。实现先在独立 Worktree `task/ALVA-010-lzy` 完成，验证通过后合入 `main`。

- [x] 选择、拖动和数值修改墙端点；补画、分段或移除误识别墙线时能看到候选变化；房间轮廓可修正。
- [x] 共用连接点保持连接；实体ID尽量保留，分段/替换记录来源；影响已有门窗时显示迁移或待核对，不静默丢失引用。
- [x] 零长度、重复/自交、非有限坐标和无效引用被明确定位；失败不写入坏候选，可修正后重试。
- [x] 修改后刷新仍保持同一候选和稳定引用；任何影响标尺的修改撤回旧校准确认，等待下一票重新校准。
- [x] 至少用非矩形或多房间案例验证连接变化；这是原图识别校正，不产生任何专业拆改许可，也不覆盖已确认设计。

**Scope boundary:** 不做已确认房屋的承重判断、专业拆墙、房间需求合并拆分；不包含门窗专门编辑和最终尺寸确认。

**Development location:** 实施前阅读[当前目录规范与本票落点](../../../docs/PROJECT-STRUCTURE.md)。以其中对应 ALVA 编号的归属为准，不沿用迁移前目录；此链接不改变本票范围、依赖或实施授权。

**Snapshot scope:** 确认操作只更新当前工作状态；只有用户手动点击全局保存才建立存档快照。点击已有快照只读预览，明确恢复才整体替换；不要求逐操作历史、撤销或自动存档。

**Parallel lane:** `topology`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## Implementation handoff

- Owner: lzy
- Branch: `task/ALVA-010-lzy`
- Worktree: `/home/ubuntu/Alva-worktrees/ALVA-010-lzy`
- Shared files registered: `api/api.ts`, `api/model.ts`, `api/store.ts`, `web/src/main.tsx`, `api/topology/commands.ts`, `api/topology/validate.ts`
- Verification port: `4183`
- Scope: 墙端点数值/拖动修正、共享连接点同步、房间顶点修正、墙线补画/分段/移除、门窗引用保护、拓扑定位校验、校准失效与候选持久化。

## Verification

- `npm run check`：通过。
- `npm run build:alva`：通过；仅保留既有大 chunk 提示。
- `node_modules/.bin/tsx --test tests/alva-topology.test.ts`：3/3 通过，覆盖非矩形多房间、共享连接、稳定 ID、分段来源、无效拓扑定位、门窗引用保护、刷新和幂等。
- 隔离浏览器证据：`evidence/20260920T151500000Z-ALVA010-browser/result.json`；登录、数值端点、房间顶点控制、补画墙线、刷新保留和退出门禁核心断言通过；`topology-editor.png` 为实际界面截图。
- 浏览器控制台残留仅为验收过程的首次未登录 401、一次拖动与后续请求竞争产生的 409、favicon 404，未影响业务断言。
- 带媒体 fixture 的全量 `npm test`：Worktree 状态下 69/70；唯一失败为票仍处于 in-progress 时 tracker ready 预期与既有 ALVA-031 frontier 偏差的组合。合入 main 标记 done 后需复跑，ALVA-031 仍为既有无关偏差。
