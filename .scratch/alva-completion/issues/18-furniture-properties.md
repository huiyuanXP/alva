# 18: 家具属性与款式替换

**ID:** ALVA-025

**Parent scope:** T06

**Review reference:** R13

**What to build:** 修改支持的尺寸、颜色、材质或许可款式，并看到持久变化。

**Blocked by:** [ALVA-023](16-furniture-add-copy.md)

**Status:** done

**Execution:** 已完成。由 lzy 在独立 Worktree 实施，完整验证通过后自动合入 main。

- [x] 尺寸影响显示与碰撞，外观影响渲染，2D/3D与刷新后数据一致。
- [x] 资产来源/许可可查；替换保留实例关联需求，不修改共享资产定义。
- [x] 批量调整全成或全败；无效尺寸、锁定与版本冲突拒绝，Chat和手动一致。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `furniture`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## Implementation handoff

- 负责人：lzy；分支 task/ALVA-025-lzy；Worktree /home/ubuntu/Alva-worktrees/ALVA-025-lzy。
- 实现：服务端家具更新合同支持许可 assetId 款式替换，替换时保留实例 UUID、房间关联和来源关系，只复制许可资产默认参数；尺寸、位置、旋转、颜色、材质、底部空隙严格校验。批量更新在 applyChanges 的克隆场景上原子执行，非法尺寸、越界/碰撞、锁定实例和过期 revision 拒绝且不写入；手动界面与 Chat 候选共用同一服务端规则。
- 前端：家具面板可选择许可款式并显示 CC0 · alva程序几何 来源，尺寸/颜色/材质更新同步 2D 与 Three.js 3D，刷新后从项目状态重载。
- 验证：npm run check；ALVA-025 3 项服务端/Chat 回归全通过；npm run build:alva；真实 Chromium 证据 evidence/20260925T114528711Z-ALVA025-browser-94ac4a/result.json 全通过（7 项网页检查、控制台无异常）。全量测试 184 项中 179 项通过；5 项为现有环境/基线问题：ALVA-017 模型目录断言与当前 Gemini 配置不一致 2 项、媒体夹具未提供 2 项、tracker 期望与当前主线状态不一致 1 项，均与本票修改无关。
- 交付提交：实现提交待集成 Agent 记录；未部署生产服务。
