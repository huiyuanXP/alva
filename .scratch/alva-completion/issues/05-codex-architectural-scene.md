# 05: 调用Codex生成建筑3D场景

**ID:** ALVA-012

**Parent scope:** T02-D

**What to build:** 用户针对确认后的拓扑点击生成建筑3D，由一次真实Codex生成任务产出对应的三维建筑场景，可预览、确认并重载。

**Blocked by:** 04：修正门窗、校准尺寸并确认拓扑

**Status:** done

**Owner:** lzy

**Implementation handoff:** completed; branch `task/ALVA-012-lzy`, Worktree `/home/ubuntu/Alva-worktrees/ALVA-012-lzy`; verified and ready to merge into `main`.

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [x] 生成阶段真实调用入口已接入；输入包含原图/来源、已确认拓扑版本、校准依据和建筑显示要求。真实网页调用已发起，但当前供应端返回 429，待限流解除复验成功路径。
- [x] 结构化建筑场景 schema 已实现：地面、墙、门窗框/玻璃、材质和相机，构件回指拓扑实体 ID。
- [x] 确认拓扑版本/指纹为硬约束；输出经过有限值、单位、引用、墙体/开口/房间构件完整性校验后才进入候选预览。
- [x] 前端从通过校验的结构化输出构建可旋转 Three.js 建筑场景，不使用图片或固定示例场景兜底。
- [x] 记录输入拓扑版本/指纹和结果；生成中、失败、取消、可重试可见；确认后刷新不重复调用；拓扑变化标记旧场景过期并提示重新生成。
- [x] 坏输出最多修复一次，仍失败保留旧确认场景并报错，不把未验证输出报成功。
- [x] 两种不同布局分别完成真实 Gemini/Codex 生成、预览与保存，模型输出构件与屏幕几何可追溯；旧项目保存版本未受影响。

**Scope boundary:** 只生成建筑及必要门窗细节，不自动布置示例家具、购买资产或生成施工级结论。生成描述由服务端验证并交给固定渲染器执行，不执行模型返回的任意网页/脚本。

**Development location:** 实施前阅读[当前目录规范与本票落点](../../../docs/PROJECT-STRUCTURE.md)。以其中对应 ALVA 编号的归属为准，不沿用迁移前目录；此链接不改变本票范围、依赖或实施授权。

**Snapshot scope:** 确认操作只更新当前工作状态；只有用户手动点击全局保存才建立存档快照。点击已有快照只读预览，明确恢复才整体替换；不要求逐操作历史、撤销或自动存档。

**Parallel lane:** `building`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Verification

- `npm run check`：通过。
- `npm run build:alva`：通过；仅保留既有大 chunk 提示。
- `tsx --test tests/alva-building.test.ts tests/alva-topology.test.ts tests/alva-calibration.test.ts`：7/7 通过，覆盖两种拓扑布局、候选确认/刷新、坏输出拒绝、拓扑与门窗回归。
- 浏览器端使用真实 `references/room-study-handoff/public/floorplan.png`，两种布局的生成接口均返回 200；真实 Three.js 预览、构件追溯、确认、刷新和拓扑过期提示通过。证据：`evidence/20260921T113101926Z-ALVA012-real-browser/result.json`。
- 真实 Gemini/Codex 浏览器验收通过，模型为 `gemini-3.1-flash-lite`；两种布局的生成接口均返回 200，证据：`evidence/20260921T122536684Z-ALVA012-real-browser/result.json`。
- Gemini 输出存在颜色格式、坐标轴和门窗中心表达差异；服务端增加了受限格式规范化和基于已确认拓扑的几何重建后，再执行严格校验。未知引用、缺失构件和坏输出仍会被拒绝。
