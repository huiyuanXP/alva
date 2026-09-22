# ALVA-056：MiMo真实识图复测与分阶段证据

**ID:** ALVA-056

**What to build:** MiMo真实识图复测与分阶段证据，从实际候选到可复查结果，不生成或确认正式设计。

**Blocked by:** ALVA-055、ALVA-009

**Status:** blocked

**Parallel lane:** topology / import，串行执行。

- [ ] 使用当前可用且视觉能力已核对的MiMo路由实际调用Codex；记录请求/返回模型证据，不能从别名或模型自述推断最终提供者。
- [ ] 以同一原图、冻结的现役提示和schema做单次首轮复测；保留图像/提示SHA、原始返回、解析/schema/几何/三类诊断、时间和可获得的token计数。
- [x] 失败明确归类且不覆盖线上候选；没有成功路由或缺当前截图原图时如实记录边界，不以合成图冒充用户原图或声明模型更优。
- [x] 提供可复跑探针与脱敏报告，调用原始数据只入私有运行目录；与格式修复中的Worktree不互相覆盖。

## Implementation handoff

用户于2026-09-22直接授权创建并实施。基线HEAD `9454057f93a0f9d5780f6ed71efb095ae1d62366`。原44票与旧week/step编号不变。
Owner：chatgpt-mimo。基线main c25fa79；分支task/ALVA-056-chatgpt-mimo；独立Worktree .runtime/worktrees/ALVA-056-chatgpt-mimo（编辑工具工作区边界内）。只新增可复跑Codex识图探针、输出分阶段分析与证据；不修改现役import.ts、生产模型配置或用户场景。正常使用Codex现有鉴权，不读取/复制宿主机凭据。

## 本轮实现与阻塞交接

探针已实现，类型检查与5项探针逻辑/真实失败证据回放通过；不是MiMo识图成功。正常Codex路径在5.174秒后报告刷新令牌撤销；仅本次设置的MiMo官方Responses路径在2.555秒后明确报告缺少MIMO_API_KEY。两次原始模型输出0字符、token用量未返回，均退出1；没有可供schema/拓扑检查的模型输出，不用失败耗时冒充识图耗时。

证据分别为evidence/20260922T105705151Z-ALVA056-mimo-ff43a8与evidence/20260922T105903721Z-ALVA056-mimo-455835。原始result.json保留，review.json解释前置鉴权根因及分类复核；原始JSONL/stderr只留私有.runtime同名run目录。第一轮没有探针源码SHA，第二轮有；两轮原图、用户提示、schema和现役import源码指纹均已记录。

模型配置仅为调用参数，没有写入用户Codex配置或业务环境；没有生产导入、场景覆盖或服务重启。当前工具终端缺少可用MiMo鉴权，且未取得最新标注截图的未标注原图。本票保持blocked，代码保留在独立分支，不在缺少成功真实调用时合入main冒充done。恢复说明见docs/MIMO-VISION-RETRY.md。

下一动作：由既有受控运行环境向MCP进程提供匹配API或Token Plan的MiMo凭据，再用新run ID运行探针；取得用户当前原图后再对其重测。不读取宿主机凭据或反复重试同一失效令牌。ALVA-055已经独立完成，其告警可以复用于该次候选。

个人探针/证据提交：`53566b744c1bea6240994811e575f2be89aa2de3`。因真实MiMo验收未通过，功能代码未合入main；本次仅同步blocked状态、脱敏证据与恢复文档。
