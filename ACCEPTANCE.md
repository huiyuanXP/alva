# alva 验收合同

所有本轮证据写入独立 evidence/<UTC-run-id>；旧基线不计入新八组通过率。缺实现为失败/未执行，不能计作 skip 或通过；不删测试、不放宽断言、不 mock 产品链路。

## 当前范围修订：预算、运行环境与存档

用户最新决定覆盖下文及原始附件中的冲突要求：不考虑预算；Demo只在支持WebGL且性能充足的理想机器运行，不建设WebGL不可用或低性能降级。仅手动点击保存创建完整全局快照；编辑/确认/生成不创建存档，不要求逐操作记录或撤销。点击快照只读预览，明确恢复后整体替换工作状态；恢复不自动创建新快照。原话与需求来源仍是业务数据，当前工作稿不等于可恢复存档。代码尚待按修订票实施，不宣称已删除现有预算或历史记录实现。

## 当前可复跑命令

- `python3 scripts/preflight.py`：12 个已映射附件必须存在；保留 SHA-256、主机、版本、端口、旧 HEAD 和干净状态。
- `npm ci --ignore-scripts`、`npm run check`、`npm run build:web`：锁文件安装、真实 tsc 和 Vite，不是 echo lint。
- `npm --prefix vendor/openplan3d ci --ignore-scripts`；`NODE_ENV=production npm --prefix vendor/openplan3d run check`；`NODE_ENV=production npm --prefix vendor/openplan3d run build`。
- `python3 scripts/prepare-media-fixtures.py --output .runtime/fixtures`；`python3 scripts/baseline-tests.py`：逐文件执行全部现有 19 个测试文件，任何退出码非 0 则失败，单文件 100 秒超时，不改断言。
- `node scripts/probe-reference.mjs`：真实 Chromium/WebGL2，7 个参考原型断言，太阳方向距离平方 >0.05，6 个房间；页面和 console error 必须 0。
- `OPENAI_API_KEY=... OPENAI_BASE_URL=... python3 scripts/probe-models.py`：真实模型文字、提供的户型图片、公开音频；仅连通性，人工评价识图内容，不能据非空回复判定户型准确。
- `OPENAI_API_KEY=... python3 scripts/probe-codex.py`：真实 Codex 0.155.1 Responses JSONL，必须退出 0 且 agent_message 精确等于 ALVA_CODEX_OK。业务工具及 Codex 图片探针另验。

命令中的密钥由执行环境传入，不把值写入命令记录或 Git。`vendor` 的 prepare 含 `|| echo`，安装通过不能替代显式 check/build；已单独实跑。

## 八组产品断言（仅部分入口已执行，完整八组尚未通过）

| 组 | 必验断言 |
|---|---|
| 1 导入 | 两张不同真实图像经模型生成不同候选；每个墙/门窗/房间稳定 ID；指定一条已知边校准，长度误差≤0.01m；未校准值明确估算；自交/零长度/非有限坐标拒绝且正式数据不变 |
| 2 Chat | 真实 Codex 文字和图像、音频转可编辑文字；发送/取消/重试；每次调用和附件只属当前项目；后台工具白名单；流式事件至少两个非空增量 |
| 3 问卷 | Q01–Q60 唯一，Q58及预算题Q19–Q22/Q60保留ID但禁用；其余预算选项移除；手填与 Chat 双向同步；每轮1题、相关最多2题；A/B/C/D+自由；未知/跳过/不适用独立；锁定值不覆盖；退出问卷增量分析 |
| 4 痛点 | 首次分析与调整后保存前两阶段；咖啡操作台、宠物玩具、绿植遮光各正反例；原话/理由/作用空间/置信/确认状态；无专业证据只列待核实 |
| 5 编辑 | 增删复制/跨房间/旋转吸附/尺寸颜色材质/资产替换；用途与布局分开；模糊请求≥2个可旋转缩放3D候选；选定范围原子提交；版本校验、幂等与组失败回滚；锁定/未知墙不可提交 |
| 6 保存 | 只有手动点击保存创建完整全局快照；点击快照只读预览且不改工作稿；明确恢复后全局替换；编辑/确认/恢复不增存档、无逐操作撤销；保存失败不增快照并保留当前工作稿；已有快照重启可读；故障无部分污染 |
| 7 交付 | 同版本 DOCX可编辑正文、业主PDF、高清平面图、全屋/局部图、JSON+sidecar+manifest；文件校验和与版本一致；实际场景图；U01–U05/D01–D10的保留内容，预算部分已移出；所有导出无预算章节 |
| 8 桌面体验 | 每个保留UI截图；WASD前后横移、鼠标视角、门洞通行/碰撞；Esc/失焦/输入暂停；昼夜/季节实际光照与阴影；地理假设可见；控制台error 0 |

交付闸门：八组100%通过、skip 0；公网固定HTTPS连续10/10、真实流式Chat、跨项目拒绝、服务/隧道重启后保存项目恢复、隔离备份恢复与干净安装各一次。模型失败、保存失败、越权各一次隔离故障必须被检测。仅全部满足后标 ready_for_review。

已实现真实流式/工具/图片探针：`OPENAI_API_KEY=... node_modules/.bin/tsx scripts/probe-codex-stream.ts`。要求工具调用恰好1次、非空delta至少2、拼接逐字等于最终回复；图片接口非空仅代表协议通过。

## 新核心入口与证据边界

- `npm run build:alva`：构建新产品，勿以旧build:web替代。
- `node_modules/.bin/tsx --test tests/alva-foundation.test.ts tests/alva-business.test.ts`：5项测试包含真实本地数据库/API、保存故障注入和越权，以及编辑/问卷/三类痛点正反例。无模型mock；不覆盖所有Chat和专业正向流程。
- `node_modules/.bin/tsx scripts/probe-layout.ts [图片路径]`：真实模型识图并执行几何校验；两图证据见Handoff，合成来源明确登记。
- `node_modules/.bin/tsx scripts/alva-browser.ts`：6项核心真实浏览器流程与同版本文件检查，console/page error须0；不是每个保留UI的验收。
- `node_modules/.bin/tsx scripts/alva-export-probe.ts`：独立导出验证，使用已识别场景fixture，不能计作重新识图。
- `node_modules/.bin/tsx scripts/alva-backup-check.ts`：6表停写备份/隔离恢复校验，本地service恢复；不替代公网或Tunnel重启。
- `python3 scripts/alva-clean-install.py`：干净安装/类型/构建/独立启动健康鉴权，任何命令非0失败；不是完整八组复跑。

上述入口实际结果、准确run ID及历史失败见PROGRESS/Handoff。实体麦克风未验；公网未验；受控墙体正向流程等未实现仍为待完成，不是跳过。全范围闸门保持原样。

公网入口：`ALVA_TEST_ORIGIN=https://prod.huiyuanxp.com node_modules/.bin/tsx scripts/alva-browser.ts`；`node_modules/.bin/tsx scripts/alva-public-check.ts`。后者实际浏览器10次HTTPS health+HTML、至少2真实非空增量且至少2网络块、401/403隔离、服务与命名Tunnel重启后完整项目及快照SHA不变。真实执行通过见PROGRESS。原生Node探针Cloudflare403单独保留，不计作浏览器通过。

ALVA-007公共入口：`npx tsx --test tests/alva-public-entry.test.ts tests/alva-foundation.test.ts`；`npx tsx scripts/alva-public-entry-check.ts`。公共模式为服务器显式开启：两独立会话同项目，重复/过期可重建，有效设计师会话不升级，配置缺失不开放；桌面/手机模拟首次、刷新、清Cookie后普通域名进入，内容SHA一致，旧链接兼容、console error 0。

本次范围修订必验：无预算交互/提问/模型工具写入或导出；Demo验收环境具备WebGL，不要求不可用降级；连续编辑/确认不增加存档，手动保存一次只增加一个全局快照，点快照可预览且不修改工作稿，明确恢复仅使用该快照、不新增存档，无快照时不提供恢复。历史测试中已删除范围的旧断言需随实现明确修订并保留原因，不以旧范围测试掩盖新要求。
