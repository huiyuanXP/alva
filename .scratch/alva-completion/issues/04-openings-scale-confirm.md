# 04: 修正门窗、校准尺寸并确认拓扑

**ID:** ALVA-011

**Parent scope:** T02-C

**What to build:** 用户核对门窗所在墙段、开口位置与尺寸，用已知墙长校准比例，确认可作为3D生成依据的拓扑版本。

**Blocked by:** 03：修改墙线与房间轮廓

**Status:** done

**Owner:** lzy

**Implementation handoff:** completed by lzy; branch `task/ALVA-011-lzy`, Worktree `/home/ubuntu/Alva-worktrees/ALVA-011-lzy`; implementation commit `b113ba9`, integrated into `main`.

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [x] 可以添加、移动、调整和移除误识别的门窗，明确其墙体关联、门/窗类型、宽高和窗台高度。
- [x] 选择已知墙长及测量来源后同比例校准；已知边误差不超过0.01m，其余推导尺寸与层高假设清楚区分。
- [x] 门窗不越出墙段或墙高、不互相重叠；房间连通、开口异常和待核对项可定位修正，不能把几何问题隐藏在模型回复里。
- [x] 用户确认后产生不可变的拓扑版本及来源指纹，包含稳定ID、校准依据和待确认假设；重载一致。
- [x] 后续编辑产生新候选，旧确认版本不被悄悄改写；校准不是结构改造授权。

**Verification:** `npm run check`、`npm run build:alva`、ALVA-010/011 定向测试 5/5 通过；真实 `floorplan.png` 网页验收通过，墙线分段/门窗增删改/非法几何 422/比例校准/拓扑确认/刷新重载均通过，`/api/candidate/topology` 未出现 404。证据：`evidence/20260921T100146840Z-ALVA011-real-browser/`。实时 Codex 识图复试受供应商 429 usage limit 阻断，未将其冒充成功；网页验收使用真实附件及既有实际识别候选来源。

**Scope boundary:** 不生成建筑3D，不做专业改造审批；交付物是用户可复查的、带版本的确认拓扑。

**Development location:** 实施前阅读[当前目录规范与本票落点](../../../docs/PROJECT-STRUCTURE.md)。以其中对应 ALVA 编号的归属为准，不沿用迁移前目录；此链接不改变本票范围、依赖或实施授权。

**Snapshot scope:** 确认操作只更新当前工作状态；只有用户手动点击全局保存才建立存档快照。点击已有快照只读预览，明确恢复才整体替换；不要求逐操作历史、撤销或自动存档。

**Parallel lane:** `topology`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
