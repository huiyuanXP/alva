# ALVA-056：MiMo真实识图复测与分阶段证据

**ID:** ALVA-056

**What to build:** MiMo真实识图复测与分阶段证据，从实际候选到可复查结果，不生成或确认正式设计。

**Blocked by:** ALVA-055、ALVA-009

**Status:** in-progress

**Parallel lane:** topology / import，串行执行。

- [ ] 使用当前可用且视觉能力已核对的MiMo路由实际调用Codex；记录请求/返回模型证据，不能从别名或模型自述推断最终提供者。
- [ ] 以同一原图、冻结的现役提示和schema做单次首轮复测；保留图像/提示SHA、原始返回、解析/schema/几何/三类诊断、时间和可获得的token计数。
- [ ] 失败明确归类且不覆盖线上候选；没有成功路由或缺当前截图原图时如实记录边界，不以合成图冒充用户原图或声明模型更优。
- [ ] 提供可复跑探针与脱敏报告，调用原始数据只入私有运行目录；与格式修复中的Worktree不互相覆盖。

## Implementation handoff

用户于2026-09-22直接授权创建并实施。基线HEAD `9454057f93a0f9d5780f6ed71efb095ae1d62366`。原44票与旧week/step编号不变。
Owner：chatgpt-mimo。基线main c25fa79；分支task/ALVA-056-chatgpt-mimo；独立Worktree .runtime/worktrees/ALVA-056-chatgpt-mimo（编辑工具工作区边界内）。只新增可复跑Codex识图探针、输出分阶段分析与证据；不修改现役import.ts、生产模型配置或用户场景。正常使用Codex现有鉴权，不读取/复制宿主机凭据。
