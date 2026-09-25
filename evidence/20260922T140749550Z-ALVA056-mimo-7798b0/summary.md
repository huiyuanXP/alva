# ALVA-056 MiMo 复测结果

本目录是脱敏报告；原始 JSONL、stderr、模型完整返回和解析对象只保留在同名 `.runtime` 私有目录。

| 项目 | 结果 |
|---|---|
| 模型请求 | `mimo-v2.5`，Codex `--profile mimo` |
| 原图 | `references/room-study-handoff/public/floorplan.png`，36,268 bytes，SHA-256 `01dc27e90296a1bd81af0a65589b3220137156f1011dfb530b778b3a8dd4f1e8` |
| 冻结用户提示词 | SHA-256 `5d249f10905294151d5edc3df256f60cecb17b59dd6eb59a15e6fc67b11b75ed` |
| schema | SHA-256 `b897471f10e3548a33f30428780852ea9b8a8c0d1f510cb32c8d5dc7068c5db4`；因 MiMo 不支持 `json_schema`，本轮作为 JSON-object 结构约束传入 |
| 调用阶段 | 47.950 秒，exit 0，`turn.completed` |
| 模型输出 | 4,602 字符，JSON 解析通过 |
| token | input 10,518；output 2,476；reasoning 638 |
| schema / 几何 | 通过 / 通过 |
| 确认拓扑 | 失败：`wall_inner_1` 的 a 端点落在 `wall_outer_top` 中段 |
| 三类诊断 | 1 个 internal void（约 11.00 m²），1 个 open boundary，墙连通分量 1，主轴角度 0° |
| 候选规模 | 10 墙、5 房间、6 门窗、0 家具、未校准 |

结论：MiMo 识图链路已经返回真实可解析候选，但候选未通过确认拓扑，因此不写入正式场景、不生成或确认设计，也不据此宣称最新红色标注截图问题已修复。该原图不是最新标注截图对应的未标注原图。
