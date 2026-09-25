# 20: 跨房间转移与来源关系

**ID:** ALVA-027

**Parent scope:** T06

**Review reference:** R15

**What to build:** 将家具原子转移到另一房间，保留新旧实例来源。

**Blocked by:** [ALVA-023](16-furniture-add-copy.md)

**Status:** done

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [x] 退役旧实例并新建目标实例，ID不同且来源关系可查询。
- [x] 目标不明先确认；锁定、非法目标或中途失败整组回滚。
- [x] 两个房间、需求引用及2D/3D同步，不出现双份或悬空家具。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `furniture`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## 实施交接

- 认领人：lzy
- 实现：transfer 原子变更退役旧实例、在目标房间生成新 UUID 实例并写入 sourceId；旧实例进入 archivedFurniture，保留房间、资产和需求来源上下文。
- 防护：服务端校验目标房间、锁定状态、边界与碰撞；失败不写入部分结果。
- 验证：tests/alva-furniture-transfer.test.ts 覆盖成功转移、非法房间回滚、锁定对象拒绝；npm run check、npm run build:alva 通过。
- 生产：本票合入 main 后重启 alva.service，通过公网浏览器验证家具面板转移、刷新和 2D/3D 数据一致。
