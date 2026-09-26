# 38: 同版本完整交付包

**ID:** ALVA-045

**Parent scope:** T13

**Review reference:** R34

**What to build:** 下载包含真实场景图、业务文档及数据清单的完整交付包。

**Blocked by:** [ALVA-044](37-audience-documents.md), [ALVA-034](27-room-merge.md), [ALVA-035](28-room-split.md), [ALVA-013](06-example-building-views.md)

**Status:** done

**Execution:** 2026-09-26 由 lzy 在独立 Worktree 实施并完成自动化、真实 Cloudflare 通道网页验收；已生成中文提交并准备合并 main、部署后释放 Worktree。

- [x] 高清平面图、全屋/局部图来自选定保存场景，参考图显式标注。
- [x] DOCX/PDF/JSON/sidecar/manifest版本和校验和一致，不混入未保存工作稿。
- [x] 合并/拆分和退役关系在交付中正确体现，无缺图或悬空引用；不声称重新导入能力。

**Implementation handoff:** `/api/export/:version` 从不可变手动快照生成同版本 ZIP，包含 `scene.json`、`sidecar.json`、`references.json`、参考原图、高清 `floorplan.svg/png`、真实全屋/逐房间渲染图、`designer.docx`、`owner.pdf` 与 `manifest.json`。清单绑定快照指纹并记录所有 payload 的 SHA-256/字节数；参考图标为 reference-only，房间合并/拆分及退役家具关系均保留。未保存工作稿、旧版本或未选定内容不会混入。

**Validation:** `npm run check`、ALVA-044/045 定向测试、`npm run build:alva` 通过；真实 Cloudflare 独立通道完成网页登录、空码禁用、交付包下载、ZIP 文件存在性与每项校验和核对、刷新、退出、重新登录。完整 `npm test` 共 331 项，323 项通过；剩余 8 项为既有家具碰撞/布局复核断言、缺失 ALVA035/ALVA033 测试验证码及未准备 media fixture，与本票无关，未改动。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `delivery`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。
