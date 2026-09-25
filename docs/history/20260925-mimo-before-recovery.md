# ALVA-056 历史恢复记录快照

以下为本次完成前保留的原文，当前结果以 docs/MIMO-VISION-RETRY.md 和单票为准。

# ALVA-056 MiMo识图复测记录

## 2026-09-25 重启后恢复状态（当前权威）

执行状态：**pending / 待恢复集成**，不是仍在运行，也不是已完成 main 集成。用户本轮明确要求将中断工作退回待办；当前执行署名释放，历史负责人 chatgpt-mimo 与全部成果保留。

已核实：个人分支 `task/ALVA-056-chatgpt-mimo` 的最新提交为 `0d7ea5f`（不是旧索引中的 `53566b7`），工作区 `.runtime/worktrees/ALVA-056-chatgpt-mimo` 干净。main 检查基线为 `5e1513a`，8 个本票代码/测试/证据文件仍在原暂存区、2 份本票文档有原未提交修改；本轮不把这些内容冒充已集成，也不代为提交它们。相应工作区当前未发现执行进程，历史鉴权失败不代表最新结果。

2026-09-22 14:07:49 UTC 的 `20260922T140749550Z-ALVA056-mimo-7798b0` 已真实返回 4,602 字符，JSON/schema/几何通过；确认拓扑失败，诊断有约 10.9975 m² 未定义空间及 open boundary。请求为 `mimo-v2.5` / profile `mimo`；最终上游身份仍未独立证实。使用仓库原图及 JSON-object 兼容模式，不是最新标注截图原图的严格配对复测。不能继续写成“只有两次鉴权失败、无模型输出”，也不能写成“户型已修复”。

恢复顺序：先比对 `0d7ea5f`、main 原暂存的8文件和两份文档，保护原补丁；单任务串行复核现有5项离线探针测试及所需类型检查；复查日志/指纹/拓扑边界后再完成独立的 main 集成提交和全局状态同步。未集成前维持 pending；不重复覆盖旧 run，不自动部署、改默认模型或写生产候选。新的截图质量结论仍需要对应未标注原图和新 run，今日凭据未重新发起付费模型调用验证。

前置 ALVA-055、ALVA-009 已 done 并有 main 验收证据，不因重启退回；本票当前缺口是集成/复核收尾，而非这些前置未完成。事故证据及保护清单：`evidence/20260925T034733Z-server-recovery-2cae71/`；详见 `docs/INCIDENT-2026-09-25-server-recovery.md`。

## 2026-09-22 过程记录（历史）

独立Worktree：/home/ubuntu/Alva/.runtime/worktrees/ALVA-056-chatgpt-mimo；分支 task/ALVA-056-chatgpt-mimo。

状态：pending（待恢复集成；最新已完成的模型调用和结果边界见上方恢复记录）。

## 实际执行

四轮均使用仓库原始 references/room-study-handoff/public/floorplan.png，36,268 bytes，SHA-256 01dc27e90296a1bd81af0a65589b3220137156f1011dfb530b778b3a8dd4f1e8。这不是用户最新红色标注截图对应的未标注原图。现役识图用户提示词逐字提取并冻结，其SHA-256为 5d249f10905294151d5edc3df256f60cecb17b59dd6eb59a15e6fc67b11b75ed；schema从当前Scene生成，SHA-256为 b897471f10e3548a33f30428780852ea9b8a8c0d1f510cb32c8d5dc7068c5db4，保持严格required规则。

请求模型固定为 mimo-v2.5。官方Codex文档将该型号列为文本/图片输入，mimo-v2.5-pro示例为仅文本；官方同时提供Responses接入。来源：https://mimo.mi.com/docs/zh-CN/tokenplan/integration/codex-configuration ，核对日期2026-09-22。请求模型和profile是路由证据；上游最终提供者保持unverified，不由模型名或模型自述推断。

| 独立run | UTC开始 | 调用阶段耗时 | 结果 |
|---|---|---|---|
| 20260922T105705151Z-ALVA056-mimo-ff43a8 | 2026-09-22 10:57:05.424Z | 5174.052 ms | 正常Codex配置路径：刷新令牌被撤销，登录刷新失败 |
| 20260922T105903721Z-ALVA056-mimo-455835 | 2026-09-22 10:59:03.824Z | 2555.246 ms | MiMo官方Responses provider：缺少环境变量 MIMO_API_KEY |
| 20260922T140306429Z-ALVA056-mimo-117cc6 | 2026-09-22 14:03:06.580Z | 1774.294 ms | Codex --profile mimo 已到达MiMo路由；Responses拒绝 json_schema，仅支持 text/json_object |
| 20260922T140749550Z-ALVA056-mimo-7798b0 | 2026-09-22 14:07:49.987Z | 47949.723 ms | JSON-object兼容模式真实完成，返回4,602字符，token用量10,518输入/2,476输出/638推理 |

最后一轮JSON解析、schema和几何校验通过，生成10墙、5房间、6门窗、0家具、calibration为null的候选。确认拓扑失败：wall_inner_1 的a端点落在 wall_outer_top 中段，请连接或分段。三类诊断返回1个internal void（约11.00平方米）和1个open boundary，墙连通分量1、主轴角度0度。结果可用于复核，不构成正式候选采用、模型质量排名或截图修复结论。

第一版探针曾把空输出记录为JSON.parse失败；根因仍是前置鉴权失败，后续版本已把空输出改为not-run。json_schema格式失败也单独分类为 output-format-unsupported，不和模型不支持、鉴权失败或JSON解析失败混在一起。原 result.json 不重写，复核解释保留在各run的 review.json。

## 探针范围

scripts/alva-mimo-vision-check.ts 记录唯一run ID、源码/输入/提示/schema指纹、请求型号、Codex profile、输出模式、时间、exit code、协议错误、可获得的token用量及解析/几何/三类诊断。原始文本/JSONL/stderr只保留在私有 .runtime/<run>/，公开evidence只含脱敏结果；不读取或复制凭据文件、不读取生产数据库、不上传生产项目，不修改Codex用户配置。

模型没有权限改正式设计：调用使用read-only、禁用shell/patch/multi-agent/web与MCP工具，输出只保留为本次证据。只做一次首轮识别，不自动修正或采用。现役用户提示和schema相同，但成功run因MiMo Responses不支持 json_schema 而把schema作为JSON-object结构约束传入，且使用CLI profile而非业务App Server provider，因此系统上下文/传输不同，不把本轮当严格配对模型质量比较。

## 复跑命令

在本票独立Worktree中运行；不在main或生产目录构造业务项目。凭据只由受控环境注入，不在命令中写值：

    npm run check
    node_modules/.bin/tsx --test tests/alva-mimo-probe.test.ts

    ALVA_VISION_PROBE_ROUTE=configured-codex \
    ALVA_VISION_PROBE_PROFILE=mimo \
    ALVA_VISION_PROBE_MODEL=mimo-v2.5 \
    ALVA_VISION_PROBE_OUTPUT_MODE=json-object \
    node_modules/.bin/tsx scripts/alva-mimo-vision-check.ts

供应端将来支持 json_schema 时，可把 ALVA_VISION_PROBE_OUTPUT_MODE 改为 json-schema。提供经过授权的未标注原图路径可作为脚本唯一位置参数；不能用红色错误标注叠图或合成夹具冒充盲测原图。若要判断用户最新标注截图的问题，必须先取得其对应未标注原图，再用新run ID复测并核对原始输出、四层检查和三类告警。
