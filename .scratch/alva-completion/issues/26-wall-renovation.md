# 26: 非承重墙改造与开口迁移

**ID:** ALVA-033

**Parent scope:** T08

**Review reference:** R21

**What to build:** 预览有证据的非承重墙改造，明确迁移门窗后确认保存。

**Blocked by:** [ALVA-032](25-wall-evidence.md), [ALVA-021](14-candidate-adoption.md)

**Status:** done

**Execution:** 2026-09-26 由 lzy 认领并完成，在独立 Worktree `task/ALVA-033-lzy` / `/home/ubuntu/Alva-worktrees/ALVA-033-lzy` 实施；依赖 ALVA-032/021 已在 main 集成。

- [x] 专业角色提供依据后，业主可比较、确认合法改造；含成功保存与恢复样例。
- [x] 门窗迁移目标明确，整体几何/稳定引用校验后原子提交。
- [x] 越权、缺证据、非法迁移、过期版本均不污染正式数据；旧建筑结果标过期。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `topology`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

- 服务端新增只读预览与原子确认接口：POST /api/professional/remodel/preview、POST /api/professional/remodel/confirm；同时提供 preview_wall_remodel 与 confirm_wall_remodel MCP 工具。
- 只有带 professional-classification: 证据的非承重墙可进入改造；每个关联门窗必须明确目标墙段和位置。确认时保留门窗稳定 ID，创建新的不可变拓扑版本，并将旧建筑结果标为过期。
- 预览不写入正式数据；确认校验基线拓扑、版本和预览指纹，支持同一 requestId 幂等，失败、越权、缺证据、非法迁移和过期版本均不污染场景。
- 前端增加“改造预览”面板，显示专业证据、墙体与门窗迁移目标、三维候选、确认理由及取消路径；拓扑确认后旧建筑结果明确提示过期。
- 验证：ALVA-033 专项测试 4/4 通过；npm run check、npm run build:alva、git diff --check 通过。临时 Cloudflare 通道的真实 Chrome 验收完成专业分类、预览、门窗迁移、确认、保存版本、历史只读预览及明确恢复确认；通道仅用于验收，收尾后释放。

## Lexie independent verification

- 2026-09-26 用户再次要求 Lexie 认领 ALVA-033 时，本票已由 lzy 完成并合入 `main`（`f5bdd9c`），因此未覆盖或伪造第二次认领；改为在现役 `main` 上独立复验。
- 第一轮：`ALVA033_TEST_CODE=<local-test-code> tsx --test tests/alva-wall-remodel.test.ts`，4/4 通过，0 fail，0 skip。覆盖只读预览、开口稳定 ID 迁移、原子确认、新拓扑版本、旧建筑失效、非法迁移/越权/过期拒绝和幂等。
- 第二轮：`npm run check`、`npm run build:alva` 均通过；专业墙体 + ALVA-033 + stage MCP/Chat 扩大回归 18/18 通过，0 fail，0 skip。构建仅保留既有 bundle >500 kB 警告。
