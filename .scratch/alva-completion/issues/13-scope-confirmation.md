# 13: 作用范围澄清与确认

**ID:** ALVA-020

**Parent scope:** T05

**Review reference:** R08

**What to build:** 全屋或模糊指代请求先明确对象范围，再生成建议。

**Blocked by:** [ALVA-017](10-multimodal-chat.md)

**Status:** done

**Execution:** 已由 lzy 在独立 Worktree 完成并合入 main；集成提交 8364468，实现提交和浏览器证据见下方交接记录。

- [x] 指代不唯一先澄清，大范围修改先确认；默认排除锁定房间和物品。
- [x] 服务端拒绝未确认范围、越界或锁定目标，不能只依赖Prompt。
- [x] 取消范围确认不改设计；已确认范围与后续候选关联。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `proposals`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## Implementation handoff

- 完成人：lzy；Worktree：/home/ubuntu/Alva-worktrees/ALVA-020-lzy。
- 服务端：api/scope.ts 增加待确认/已确认/已取消范围合同、锁定目标排除、越界校验和候选绑定；api/chat.ts 增加 propose_scope、范围确认/取消路由，并在预览/采用时重复校验。
- 前端：web/src/Panels.tsx 与 web/src/main.tsx 增加范围确认卡片；取消不触碰场景，确认后候选必须绑定范围。
- 验证：tests/alva-scope.test.ts 2/2；npm run check；npm run build:alva；Chromium 真实交互证据见 evidence/20260925T-ALVA020-real-browser/，结果 pass: true。
- 全量 npm test：133 项中 127 项通过；6 项为既有基线问题（ALVA-017 旧模型断言、tracker 旧状态断言、ALVA-055 既有文案断言、media 测试环境变量缺失），与本票范围无关。
