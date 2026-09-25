# 06: 建筑3D总览、剖切与房间视角

**ID:** ALVA-013

**Parent scope:** T02-E

**What to build:** 在Codex生成的建筑上提供如示例一样能看清室内的总览、剖切和房间视角，能够旋转缩放并对照原图检查。

**Blocked by:** 05：调用Codex生成建筑3D场景

**Status:** in-progress

**Execution:** 已由 lzy 重新认领，分支 task/ALVA-013-lzy，Worktree /home/ubuntu/Alva-worktrees/ALVA-013-lzy；独立开发，验证通过后自动合入 main。

- [ ] 默认总览根据实际建筑边界取景，建筑完整落入视野；支持旋转、缩放及一键复位，不把6个固定房间或固定相机坐标套给任意户型。
- [ ] 提供墙体剖切/完整墙体切换，让室内轮廓可见；剖切只影响显示，不删除建筑实体或改变已确认拓扑。
- [ ] 各真实房间有可用视角，视点不落在墙体内；显示和点选保留Codex输出与拓扑的实体关联。
- [ ] 地面/墙/门窗有清楚的材质区分和可见光影，参数假设可见；延续已有日照能力，不在本票扩展完整漫游系统。
- [ ] 同一参考图下对照example检查完整墙体、剖切、房间视角、玻璃与阴影；另一布局验证自动取景，保存重载后相同。
- [ ] 在WebGL可用且性能充足的理想机器记录真实场景截图和控制台结果；不要求WebGL不可用或低性能降级。

**Scope boundary:** 不包含U16参考家具/整组方案、照片级材质、手机虚拟摇杆或完整自由漫游重做；这些留在冻结的后续范围。

**Development location:** 实施前阅读[当前目录规范与本票落点](../../../docs/PROJECT-STRUCTURE.md)。以其中对应 ALVA 编号的归属为准，不沿用迁移前目录；此链接不改变本票范围、依赖或实施授权。

**Snapshot scope:** 确认操作只更新当前工作状态；只有用户手动点击全局保存才建立存档快照。点击已有快照只读预览，明确恢复才整体替换；不要求逐操作历史、撤销或自动存档。

**Parallel lane:** `render`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Claim release handoff

2026-09-22：yang-chatgpt 按用户要求改领非3D任务，释放本票；无产品代码修改或实施进度。原分支 `task/ALVA-013-yang-chatgpt`、Worktree `/home/ubuntu/Alva-worktrees/ALVA-013-yang-chatgpt` 保留，仅含认领时基线；不再占用 render 或共享文件，接手应从最新 main 建立自己的工作区。
