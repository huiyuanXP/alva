# 37: 设计师任务书与业主说明

**ID:** ALVA-044

**Parent scope:** T13

**Review reference:** R33

**What to build:** 同一保存版本产生可编辑设计师任务书与业主PDF。

**Blocked by:** [ALVA-016](09-unanswered-followup.md), [ALVA-030](23-professional-unknowns.md), [ALVA-036](29-manual-snapshot.md), [ALVA-042](35-preference-confirmation.md), [ALVA-043](36-business-guidance.md)

**Status:** done

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

**Owner:** Lexie

**Branch / Worktree:** `task/ALVA-044-Lexie` / `/home/ubuntu/Alva-worktrees/ALVA-044-Lexie`

- [x] 逐项映射业务D01–D10/U01–U05：原话、需求、偏好、痛点、取舍、未决、家具材料、实施计划。
- [x] DOCX有可编辑正文，PDF与之使用同一版本；不是截图Word，不包含预算或金额章节。
- [x] 未决与专业未知不被写成已解决；业务指导可追溯，不宣称施工图。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `delivery`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

- Agent: Lexie。新增 `api/delivery-content.ts` 作为同一保存版本的人类可读交付投影；`api/export.ts` 的 DOCX/PDF/sidecar 都复用该投影，不从当前工作稿重新拼接。
- 设计师文档完整保留 D01–D10 编号：项目摘要、现状与依据、房间任务书、家具/设备/材料、原话与证据、方案决策与取舍、范围边界、实现计划与业务指导、待核实与风险、交接/版本/权限。D07 不再承载已移出当前产品范围的旧商业章节，而是只说明交付范围与专业边界。业主说明完整保留 U01–U05。
- 原话、确认需求、偏好、参考图偏好、首次痛点、方案状态、用户取舍、未决、专业未知、家具/房间样式、实施依赖均按状态分层。专业未知即使已知悉也保持“状态：未决”，不会因用户偏好/知悉操作写成已解决。
- 只有真实咨询记录中出现的 `[BGxx · references/...]` citation 才进入 D08，标为业务指导来源；不会凭空把通用 Skill 写成项目事实。交付范围声明明确不是施工图、BIM 或工程批准文件。
- 文档投影与 sidecar 增加金额类内容防漏：停用问题及包含旧商业金额语义的 evidence/proposal/change/context 不进入人类交付与对应 sidecar 投影；不修改保存快照本身。
- `designer.docx` 继续由 Word XML 正文生成，可编辑，不是图片或 PDF 截图；`owner.pdf` 使用同一 snapshot/version 的 U01–U05。sidecar 写入 `documentSourceVersion` 与两端 deliverySections，便于审计同版本来源。导出若 snapshot.savedVersion 与请求版本不一致会拒绝。
- 新增 `tests/alva-audience-documents.test.ts` 与 `scripts/alva-044-verify.ts`。第一轮正式验收：ALVA-044 + 030 + 042 + 043 + 014 相关回归 14/14 pass，0 fail，0 skip。期间发现并修复 D06/D09 标题和参考图固定措辞兼容问题。
- 第二轮正式验收：`npm run check`、`npm run build:alva` 通过；ALVA-044/043/031/042/030/014/034/037/038/036 扩大回归 40/40 pass，0 fail，0 skip。构建仅有既有 >500 kB chunk warning。
- 真实交付链使用 Worktree 私有 Playwright Chromium 复验成功：实际生成 ZIP，包含 designer.docx、owner.pdf（6页）、floorplan PNG/SVG、whole-home/room 截图、scene.json、sidecar.json、manifest.json；DOCX 为 D01–D10，PDF 为 U01–U05，三者均核对 version=1，交付文本金额类内容扫描为 0 命中。浏览器仅安装在 `.runtime/playwright`，未入库。
- `git diff --check` 通过；未修改生产数据或公网部署。
