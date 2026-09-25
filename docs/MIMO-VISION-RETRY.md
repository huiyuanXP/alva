# ALVA-056 MiMo识图复测记录

## 2026-09-25 重启后恢复状态（当前权威）

执行状态：**pending / 待恢复集成**，不是仍在运行，也不是已完成 main 集成。用户本轮明确要求将中断工作退回待办；当前执行署名释放，历史负责人 chatgpt-mimo 与全部成果保留。

已核实：个人分支 `task/ALVA-056-chatgpt-mimo` 的最新提交为 `0d7ea5f`（不是旧索引中的 `53566b7`），工作区 `.runtime/worktrees/ALVA-056-chatgpt-mimo` 干净。main 检查基线为 `5e1513a`，8 个本票代码/测试/证据文件仍在原暂存区、2 份本票文档有原未提交修改；本轮不把这些内容冒充已集成，也不代为提交它们。相应工作区当前未发现执行进程，历史鉴权失败不代表最新结果。

2026-09-22 14:07:49 UTC 的 `20260922T140749550Z-ALVA056-mimo-7798b0` 已真实返回 4,602 字符，JSON/schema/几何通过；确认拓扑失败，诊断有约 10.9975 m² 未定义空间及 open boundary。请求为 `mimo-v2.5` / profile `mimo`；最终上游身份仍未独立证实。使用仓库原图及 JSON-object 兼容模式，不是最新标注截图原图的严格配对复测。不能继续写成“只有两次鉴权失败、无模型输出”，也不能写成“户型已修复”。

恢复顺序：先比对 `0d7ea5f`、main 原暂存的8文件和两份文档，保护原补丁；单任务串行复核现有5项离线探针测试及所需类型检查；复查日志/指纹/拓扑边界后再完成独立的 main 集成提交和全局状态同步。未集成前维持 pending；不重复覆盖旧 run，不自动部署、改默认模型或写生产候选。新的截图质量结论仍需要对应未标注原图和新 run，今日凭据未重新发起付费模型调用验证。

前置 ALVA-055、ALVA-009 已 done 并有 main 验收证据，不因重启退回；本票当前缺口是集成/复核收尾，而非这些前置未完成。事故证据及保护清单：`evidence/20260925T034733Z-server-recovery-2cae71/`；详见 `docs/INCIDENT-2026-09-25-server-recovery.md`。

## 2026-09-22 过程记录（历史）

独立Worktree：`/home/ubuntu/Alva/.runtime/worktrees/ALVA-056-chatgpt-mimo`；分支 `task/ALVA-056-chatgpt-mimo`。

状态：pending（待恢复集成；最新已完成的模型调用和结果边界见上方恢复记录）。

## 实际执行

两次均使用仓库原始 `references/room-study-handoff/public/floorplan.png`，36268字节，SHA-256 `01dc27e90296a1bd81af0a65589b3220137156f1011dfb530b778b3a8dd4f1e8`。这不是用户最新红色标注截图对应的未标注原图。现役识图用户提示词逐字提取并冻结，其SHA-256为 `5d249f10905294151d5edc3df256f60cecb17b59dd6eb59a15e6fc67b11b75ed`；schema从当前Scene生成，保持严格required规则。

请求模型为 `mimo-v2.5`。官方Codex文档将该型号列为文本/图片输入，`mimo-v2.5-pro`示例为仅文本；官方同时提供Responses接入。来源：https://mimo.mi.com/docs/zh-CN/tokenplan/integration/codex-configuration ，核对日期2026-09-22。型号支持图片不代表本机已经具备可用鉴权。

| 独立run | UTC开始 | 调用阶段耗时 | 结果 |
|---|---|---|---|
| `20260922T105705151Z-ALVA056-mimo-ff43a8` | 2026-09-22 10:57:05.424Z | 5174.052 ms | 正常Codex配置路径：刷新令牌被撤销，登录刷新失败 |
| `20260922T105903721Z-ALVA056-mimo-455835` | 2026-09-22 10:59:03.824Z | 2555.246 ms | 仅本次使用MiMo官方Responses provider：Codex明确报告缺少环境变量MIMO_API_KEY |

以上是**鉴权/启动失败耗时，不是识图推理耗时**。两次exit code均为1，原始模型文本0字符，token usage未返回，没有生成候选。后续JSON/schema/几何/三类诊断没有有效输出可运行，不能据此评价MiMo能力，更不能声称修好了用户截图。

第一版探针曾把空输出记录为JSON.parse失败；根因仍是前置鉴权失败，后续版本已把空输出改为not-run。第二次原始报告的泛化failureClass还受到Codex后台旧账号刷新告警影响；权威turn.failed明确是Missing environment variable: MIMO_API_KEY。已修正分类优先使用turn错误，并用两份真实脱敏记录离线回放验证。原result.json不重写，复核解释在review.json中保留。

## 探针范围

`scripts/alva-mimo-vision-check.ts`记录唯一run ID、源码/输入/提示/schema指纹、请求型号、时间、exit code、协议错误、可获得的token用量及解析/几何/三类诊断。原始文本/JSONL/stderr只保留在私有 `.runtime/<run>/`，公开evidence只含脱敏结果；不读取或复制凭据文件、不读取生产数据库、不上传生产项目，不修改Codex用户配置。

模型没有权限改正式设计：调用使用read-only、禁用shell/patch/multi-agent/web与MCP工具，输出只保留为本次证据。只做一次首轮识别，不自动修正或采用。现役用户提示和schema相同，但使用CLI既有鉴权而非业务App Server provider，因此系统上下文/传输不同，不把本轮当严格配对模型质量比较。

## 恢复条件与命令

需要让**当前MCP进程**能通过受控环境取得有效 `MIMO_API_KEY`，并使用与凭据类型相匹配的官方API或Token Plan入口。现有终端的路由声明不替代当前MCP的实际调用证据；不在聊天或Git中传递密钥，也不通过读取宿主机凭据绕过当前边界。当前阻塞是工具进程没有取得可用调用凭据。

在本票独立Worktree中运行；不在main或生产目录构造业务项目：

```bash
npm run check
node_modules/.bin/tsx --test tests/alva-mimo-probe.test.ts
# MiMo按量API：凭据须已由服务环境注入，不在命令中写值。
ALVA_VISION_PROBE_ROUTE=mimo-api node_modules/.bin/tsx scripts/alva-mimo-vision-check.ts
# 或使用匹配现有Token Plan凭据的入口。
ALVA_VISION_PROBE_ROUTE=mimo-token-plan node_modules/.bin/tsx scripts/alva-mimo-vision-check.ts
```

提供经过授权的未标注原图路径可作为脚本唯一位置参数；不能用红色错误标注叠图或合成夹具冒充盲测原图。恢复后必须生成新run ID，再核对原始输出、四层检查和三类告警；在得到真实输出与证据之前，本票保留blocked，不自动合入未验收的模型接入或修改默认模型。
