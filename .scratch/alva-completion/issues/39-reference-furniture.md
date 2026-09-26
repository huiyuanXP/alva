# 39: 参考家具变成可确认实例

**ID:** ALVA-046

**Parent scope:** T14

**Review reference:** R35

**What to build:** 其他功能完成后，将参考家具匹配为可比较、可确认的真实实例。

**Blocked by:** [ALVA-018](11-cancel-retry.md), [ALVA-019](12-voice-transcription.md), [ALVA-022](15-room-purpose.md), [ALVA-025](18-furniture-properties.md), [ALVA-026](19-furniture-return.md), [ALVA-027](20-furniture-transfer.md), [ALVA-037](30-snapshot-preview.md), [ALVA-038](31-snapshot-restore.md), [ALVA-039](32-desktop-walkthrough.md), [ALVA-040](33-sunlight-seasons.md), [ALVA-045](38-delivery-bundle.md)

**Status:** done

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

**Owner:** Lexie

**Branch / Worktree:** `task/ALVA-046-Lexie` / `/home/ubuntu/Alva-worktrees/ALVA-046-Lexie`

- [x] 严格最后实施约束；来源/许可、推断尺寸与实测状态可见，不把图片当可靠几何。
- [x] 至少可比较候选资产，确认后产生新UUID并保留来源，拒绝不改变场景。
- [x] 新实例可编辑、保存和导出，缺可用许可资产时明确失败，不造假资产。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `proposals`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

- Agent: Lexie。新增 `api/reference-furniture.ts`：只有已确认的参考图偏好才能进入家具匹配；服务端只从项目现有许可资产池返回最多3个可比较候选，类别匹配依据来自已确认文字/原话，不从图片估算几何。
- 候选明确返回资产ID、名称、许可、目录宽/深/高、材质/颜色、匹配理由、`dimensionBasis=licensed-asset-defaults`、`measurementStatus=not-measured`、`referenceGeometryReliable=false`。即使原话出现“9米”等视觉尺寸描述，也不会覆盖许可目录参数。
- 新增 `GET /api/reference-furniture/:batchId/candidates`、`POST /api/reference-furniture/confirm`、`POST /api/reference-furniture/reject`。reject 为显式 scene-noop；confirm 会重新验证参考批次、作用房间和候选许可资产，再通过现有 `applyChanges` 边界/碰撞校验创建全新 UUID。任意自造 assetId 或当前无许可资产都明确 422，场景不变。
- Item 增加可选 `referenceSource` 元数据：batch/annotation/asset/license、目录尺寸依据、未实测状态、参考图几何不可靠标记；`sourceId=reference:<batchId>` 继续提供轻量来源链。现有家具更新、快照恢复及 JSON 保存会保留该元数据。
- 前端参考图页对 confirmed batch 提供“匹配许可家具候选”，并逐项显示许可、目录尺寸、未实测、材质标签和匹配理由；确认生成实例或拒绝候选。家具属性面板对已确认参考家具继续显示 batch、许可、尺寸依据、未实测和“参考图几何不可靠”，用户随后可按既有家具流程编辑。
- D04/业主交付的家具行会保留参考 batch、资产许可、目录默认尺寸/未实测状态与参考图几何边界，因此手动快照和交付读取可追溯。
- 第一轮专项：`npm run check` + `tests/alva-reference-furniture.test.ts` → 3/3 pass，0 fail，0 skip。覆盖参考图非几何证据、候选许可/目录尺寸、拒绝scene-noop、新UUID/来源元数据、编辑、底层手动快照与交付读取、无许可池和任意assetId失败。
- 第二轮正式：`npm run check`、`npm run build:alva` 通过；ALVA-046/041/042/025/027/024/037/038/036/044/045 相关扩大回归 40/40 pass，0 fail，0 skip。构建仅保留既有 >500 kB chunk warning。
- Exploratory baseline：额外加入旧 `alva-furniture-return.test.ts` 与 `alva-furniture.test.ts` 时为 40/42；两条失败分别是旧测试未适配 REVIEW_REQUIRED 保存门禁、旧复制坐标触发现行碰撞规则。已在未修改 main 单独复跑，2/2 同样失败，因此不是本票回归，未篡改旧测试绕过主线规则。
- `git diff --check` 通过；未发布生产、未修改真实项目数据。
