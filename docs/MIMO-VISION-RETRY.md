# ALVA-056：原生MiMo识图复测与10分钟预算

检查日期：2026-09-25。当前为个人工作区实现，集成前最终复核：已完成（最新main基线、类型检查、36项回归及53离线重放通过；待main集成）。运行入口是普通ubuntu会话中的 `codex exec --profile mimo`；不是MCP旧CODEX_HOME，也不是业务App Server鉴权路径。用户profile、密钥和生产配置未改。

## 当前结果

正常profile默认请求 `mimo-v2.6-pro`，未加CLI模型覆盖；目录仍为Pro/Flash两款。最后一次显式纠错调用用时 **554.416秒（9分14秒）**，在600000ms上限内完成：26墙、5房间、12门窗；JSON、生产解析器、schema、非空内容、几何、确认拓扑及三类诊断均通过。三类检查均complete，告警计数为空、未定义面积0、墙连通分量1。它是已通过当前程序校验的候选，不是测绘真值、施工许可或自动采用。

成功run：`20260925T075949811Z-ALVA056-mimo-1947ac`。原始回复/JSONL/解析对象仅在独立Worktree `.runtime/<run>/`；公开结果在 `evidence/<run>/result.json`，综合证据 `evidence/20260925T081726Z-ALVA056-recovery-acceptance/`。

## 实际尝试与边界

| run后缀 | 模式与性质 | 模型用时 | 实际结果 |
|---|---|---:|---|
| 071425…7842c7 | 原生JSON schema，10分钟追加前 | 50.621秒 | 5621字符；JSON末尾多余内容，失败保留 |
| 072626…13f83c | 原生JSON schema，600秒预算 | 28.012秒 | 140字符空户型，不能采用；旧result不改，追加recovery-review |
| 073159…7c7aa6 | 同图/原提示/schema的新run复核 | 9.497秒 | 相同SHA的空户型，被新空候选闸门明确拒绝 |
| 074740…0b62e3 | 显式schema-in-prompt实验 | 311.969秒 | 9339字符，25墙/5房/12门窗；JSON/schema通过，12处开口越界 |
| 075949…1947ac | 对上一失败结果的一次显式纠错 | 554.416秒 | 26墙/5房/12门窗，全部上述程序检查通过 |

两次空返回都是供应端自行结束，不是600秒超时。没有据此宣称供应端“不支持JSON schema”。schema-in-prompt只是把同一schema放入提示文本，不等同于API原生json_object模式；参数与有效提示哈希明确记录。成功证据是带上一轮错误输出的纠错，不冒充新首轮一次成功，也未另跑修改后首轮提示的完整盲测。

所有图像均为仓库原始 `references/room-study-handoff/public/floorplan.png`，SHA256 `01dc27e90296a1bd81af0a65589b3220137156f1011dfb530b778b3a8dd4f1e8`。不是用户最新标注截图的未标注原图。请求模型和客户端目录不是最终上游身份的独立证据；不作模型质量排名。

## 已修复的具体问题

旧探针写死 `mimo-v2.5` 且profile可缺省；现默认读取实际mimo profile的模型，不传 `--model` 覆盖，显式选择只允许当前MiMo目录中的视觉模型。读取白名单配置元数据及指纹，不读取登录文件或复制密钥。运行前后profile指纹一致。

单次probe与业务识图预算均为 **600000ms**，普通业务Chat默认 **120000ms**。首次识别和最多一次修正分别计时；这不是整个两轮流程总共10分钟。取消、进程组TERM/KILL清理、输出尺寸与时间上限继续有效。模型任务最高300/512MiB、CPU60%，最终类型/数据库回归1500MiB，均保存实际cgroup证据；外层runner625秒与用户服务650秒给清理留余量，不让MCP单请求600秒上限先截断模型。

空Scene仍可用于项目初始化，但**识图输出**必须至少有墙和房间；零墙/零房不会被当导入成功。JSON/schema/几何错误仍共用一次修正机会，第二次失败向上传递，不覆盖既有候选。

开口offset的初始提示原先没有明确“中心”而非“左边缘”。此次25墙输出的12个offset按左边缘解释均能放进墙段，但按系统中心定义全部越界；这支持字段语义误解的诊断，不是对模型内部意图的证明。现已明确中心定义、不等式与数值例子，并在修正提示要求逐一核对全部开口、T/X交点分段和门窗关联。**没有在程序中机械平移、钳制或缩窄开口来通过校验。**

原始输出比对证明：纠错结果5个房间对象未变，12个开口只改offset；其余24面墙对象不变，1面墙由模型分成2段。新增两段共线、总长与原始端点保持。详见综合证据的candidate-repair-comparison和wall-split-review。模型生成的这些变化仍需用户对照原图校准确认。

主线期间另一任务更改了识图入口和归一化函数；本票已同步主线，探针调用当前 `normalizeStructuredOutput`/`parseLayoutOutput`，53和56共用识别 `runCodex`/`codex` 的唯一提示提取器，不覆盖他人的编辑/UI实现。

## 可复跑入口

在独立Worktree、有现成profile鉴权的普通ubuntu会话运行；下列命令不含密钥值。资源任务外层应使用本轮记录的用户级cgroup和共享重任务锁，不并行运行重型测试。

```bash
npm run check
node_modules/.bin/tsx --test --test-concurrency=1 tests/alva-mimo-probe.test.ts tests/alva-import-response.test.ts tests/alva-import.test.ts
# 默认：原生profile默认模型，单次JSON schema首轮，最多600秒
ALVA_VISION_PROBE_TIMEOUT_MS=600000 node_modules/.bin/tsx scripts/alva-mimo-vision-check.ts
# 明确选择兼容模式；不是自动fallback
ALVA_VISION_PROBE_OUTPUT_MODE=schema-in-prompt node_modules/.bin/tsx scripts/alva-mimo-vision-check.ts
# 唯一显式纠错：用本Worktree已有失败run的私有输出；仍只调用一次
ALVA_VISION_PROBE_OUTPUT_MODE=schema-in-prompt \
ALVA_VISION_PROBE_REPAIR_FROM="$PWD/.runtime/<失败run>/raw-response.txt" \
node_modules/.bin/tsx scripts/alva-mimo-vision-check.ts
```

脚本默认不自动重试、不改正式设计；返回1代表传输、输出或质量检查失败，不能忽略退出码。只有成功候选满足当前全部结构检查才返回0；自动确认标志始终false。CLI内部可能有传输重试，脚本的attempts=1指一次CLI调用，不是供应端HTTP请求数统计。

显式纠错还必须匹配首轮公开报告中的run ID、原图SHA256、schema SHA256和原始响应SHA256；缺报告、换图、换schema、改写响应或对纠错结果再次纠错，均在模型调用前拒绝。旧成功纠错发生于这一来源闸门新增之前，本轮独立回放核实它满足这些约束，并新增正反例测试；不将离线来源校验冒充又一次真实模型调用。

## 验证与保留范围

源版本的类型检查及35项定向回归已通过（0失败/跳过/取消），同步最新main后含新增纠错来源约束的36项回归及类型检查均通过，收据见综合证据final-execution.json。测试包含纯逻辑/受控接口回归，真实模型证据单独列在上表；不把单元测试数量当作真实模型调用数。

初始类型检查重复import、资源保护拒绝启动等失败均保留。本轮扩大到校准数据库回归时也触及1500MiB任务限额，未计通过；随后将类型检查与本票相关测试分开执行，仍使用1500MiB上限，均通过且无OOM，生产服务未重启。ALVA-053的资源受限失败另在该票证据中；不把失败当通过，也未放宽几何断言。新结果与旧0d7ea5f成果、2026-09-22四次历史run同时保留，历史说明见[恢复前快照](history/20260925-mimo-before-recovery.md)。

本轮**未部署或重启生产**、未写生产候选/数据库、未改用户Codex/MCP/Tunnel配置；业务600秒App Server路径和生产网页长时间SSE未新增端到端实测。原生CLI模型验收与业务配置/单元验证分开陈述。ALVA-036、057和用户AGENTS修改不属于本票；028继续暂停。所有工作区与原始证据保留，未清场。回滚仅撤本票集成增量，不重置用户工作树。


最终追加纠错来源闸门绑定同一原图、schema和首轮raw SHA，禁止对纠错再递归纠错。真实调用发生在该额外闸门加入前；最终代码以实际保存的输入/输出进行离线重放：新闸门通过，有效提示和CLI参数逐字相同，业务校验器源码指纹相同，未再发起模型调用。证据final-recorded-output-replay.json，不把离线重放伪装成新增live调用。
