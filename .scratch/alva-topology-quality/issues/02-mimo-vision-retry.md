# ALVA-056：MiMo真实识图复测与分阶段证据

## 2026-09-25 恢复执行（当前）

**Owner:** chatgpt-recovery

用户明确授权恢复53与56，53已按诊断范围完成并集成`97c0ae7`。本票新分支`task/ALVA-056-recovery-20260925`、Worktree`.runtime/worktrees/ALVA-056-recovery-20260925`，基线`97c0ae7042b208895dd711cb94109406b52dd9f7`。旧`0d7ea5f`、53566b7、全部原始失败和成功run保留。此次认领明确同步本票原未提交文档中的历史结果补充；原8个暂存代码/证据文件仍不随认领提交，待验收后按本票集成。

范围：将旧探针固定的v2.5改为当前原生`codex exec --profile mimo`，从实际profile读取默认模型和catalog，不复制密钥、不改生产配置；修复超时、输出阶段分类和审查结论，保留原5测试并新增回归。前置55与009保持done。只登记`scripts/alva-mimo-vision-check.ts`、`scripts/lib/mimo-*`、本票测试/文档/脱敏证据，不修改057或preview的api/model.ts、api/intake、web。

验收：先验证原分支与main暂存字节并复跑旧5项测试；当前profile配置与两模型元数据只读核验；普通用户user-scope内串行运行默认Pro真实识图，冻结同一原图/提示/schema与完整私有输出，独立分阶段复核，必要时新run显式复测Flash；不降低断言、不把不合格候选写回或自动确认。最终类型检查、相关回归、源码指纹、服务健康和保护核对后独立集成。模型任务CPU60%/MemoryMax900MiB/Tasks128，类型检查1500MiB，预留900MiB；使用`.git/alva-heavy-task.lock`。

## 2026-09-25 重启后恢复状态（历史）

执行状态：**pending / 待恢复集成**，不是仍在运行，也不是已完成 main 集成。用户本轮明确要求将中断工作退回待办；当前执行署名释放，历史负责人 chatgpt-mimo 与全部成果保留。

已核实：个人分支 `task/ALVA-056-chatgpt-mimo` 的最新提交为 `0d7ea5f`（不是旧索引中的 `53566b7`），工作区 `.runtime/worktrees/ALVA-056-chatgpt-mimo` 干净。main 检查基线为 `5e1513a`，8 个本票代码/测试/证据文件仍在原暂存区、2 份本票文档有原未提交修改；本轮不把这些内容冒充已集成，也不代为提交它们。相应工作区当前未发现执行进程，历史鉴权失败不代表最新结果。

2026-09-22 14:07:49 UTC 的 `20260922T140749550Z-ALVA056-mimo-7798b0` 已真实返回 4,602 字符，JSON/schema/几何通过；确认拓扑失败，诊断有约 10.9975 m² 未定义空间及 open boundary。请求为 `mimo-v2.5` / profile `mimo`；最终上游身份仍未独立证实。使用仓库原图及 JSON-object 兼容模式，不是最新标注截图原图的严格配对复测。不能继续写成“只有两次鉴权失败、无模型输出”，也不能写成“户型已修复”。

恢复顺序：先比对 `0d7ea5f`、main 原暂存的8文件和两份文档，保护原补丁；单任务串行复核现有5项离线探针测试及所需类型检查；复查日志/指纹/拓扑边界后再完成独立的 main 集成提交和全局状态同步。未集成前维持 pending；不重复覆盖旧 run，不自动部署、改默认模型或写生产候选。新的截图质量结论仍需要对应未标注原图和新 run，今日凭据未重新发起付费模型调用验证。

前置 ALVA-055、ALVA-009 已 done 并有 main 验收证据，不因重启退回；本票当前缺口是集成/复核收尾，而非这些前置未完成。事故证据及保护清单：`evidence/20260925T034733Z-server-recovery-2cae71/`；详见 `docs/INCIDENT-2026-09-25-server-recovery.md`。

**ID:** ALVA-056

**What to build:** MiMo真实识图复测与分阶段证据，从实际候选到可复查结果，不生成或确认正式设计。

**Blocked by:** ALVA-055、ALVA-009

**Status:** in-progress

**Parallel lane:** topology / import，串行执行。

- [x] 使用当前可用且视觉能力已核对的MiMo路由实际调用Codex；记录请求/返回模型证据，不能从别名或模型自述推断最终提供者。
- [x] 以同一原图、冻结的现役提示和schema做单次首轮复测；保留图像/提示SHA、原始返回、解析/schema/几何/三类诊断、时间和可获得的token计数。
- [x] 失败明确归类且不覆盖线上候选；没有成功路由或缺当前截图原图时如实记录边界，不以合成图冒充用户原图或声明模型更优。
- [x] 提供可复跑探针与脱敏报告，调用原始数据只入私有运行目录；与格式修复中的Worktree不互相覆盖。

## Implementation handoff

用户于2026-09-22直接授权创建并实施。基线HEAD 9454057f93a0f9d5780f6ed71efb095ae1d62366。原44票与旧week/step编号不变。

Owner：chatgpt-mimo。基线main c25fa79；分支 task/ALVA-056-chatgpt-mimo；独立Worktree .runtime/worktrees/ALVA-056-chatgpt-mimo。只新增可复跑Codex识图探针、输出分阶段分析与证据；不修改现役 api/import.ts、生产模型配置或用户场景。正常使用Codex现有鉴权，不读取或复制宿主机凭据。

## 本轮实现与结果交接

探针、失败分类和证据回放测试已完成。此前两次鉴权失败仍按原样保留：正常Codex路径报告刷新令牌被撤销；MiMo官方Responses路径缺少 MIMO_API_KEY。配置profile恢复后新增两轮独立run：

- 20260922T140306429Z-ALVA056-mimo-117cc6：mimo profile 已到达MiMo路由，但供应端拒绝 json_schema 输出格式，0字符模型输出、无token用量，分类为 output-format-unsupported。
- 20260922T140749550Z-ALVA056-mimo-7798b0：使用MiMo支持的JSON-object兼容模式，真实返回4,602字符，input 10,518 / output 2,476 / reasoning 638 tokens，JSON、schema和几何校验通过；10墙、5房间、6门窗、0家具、未校准。

第二轮确认拓扑校验失败：wall_inner_1 的a端点落在 wall_outer_top 中段。三类诊断为1个internal void（约11.00平方米）和1个open boundary，墙连通分量1、主轴角度0度。因此本轮证明MiMo识图链路能返回可解析候选，但候选不写入正式场景、不生成或确认设计，也不据此判断模型能力是用户截图问题的唯一原因。

证据：evidence/20260922T105705151Z-ALVA056-mimo-ff43a8/、evidence/20260922T105903721Z-ALVA056-mimo-455835/、evidence/20260922T140306429Z-ALVA056-mimo-117cc6/、evidence/20260922T140749550Z-ALVA056-mimo-7798b0/。完整JSONL、stderr、模型原文和解析对象只留 .runtime 私有同名run目录；公开目录只保留脱敏结果、指纹、阶段耗时、token计数和离线复核。

本轮使用的是仓库原始 references/room-study-handoff/public/floorplan.png，不是用户最新红色标注截图对应的未标注原图。请求模型固定为 mimo-v2.5，通过Codex --profile mimo；上游最终提供者保持unverified，不由模型名或模型自述推断。由于MiMo Responses不支持 json_schema，成功run把同一schema作为JSON-object结构约束传入，和生产App Server传输不是严格配对比较。

验证：npm run check 通过；tests/alva-mimo-probe.test.ts 5/5通过，0跳过。个人实现提交 0d7ea5f，此前探针提交 53566b7 保留追溯。主线集成不改生产web/dist、不重启服务、不覆盖生产户型；生成记忆out-of-scope，未清理复核Worktree。
