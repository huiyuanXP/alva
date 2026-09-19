# alva 验收合同

所有本轮证据写入独立 evidence/<UTC-run-id>；旧基线不计入新八组通过率。缺实现为失败/未执行，不能计作 skip 或通过；不删测试、不放宽断言、不 mock 产品链路。

## 当前可复跑命令

- `python3 scripts/preflight.py`：12 个已映射附件必须存在；保留 SHA-256、主机、版本、端口、旧 HEAD 和干净状态。
- `npm ci --ignore-scripts`、`npm run check`、`npm run build:web`：锁文件安装、真实 tsc 和 Vite，不是 echo lint。
- `npm --prefix vendor/openplan3d ci --ignore-scripts`；`NODE_ENV=production npm --prefix vendor/openplan3d run check`；`NODE_ENV=production npm --prefix vendor/openplan3d run build`。
- `python3 scripts/prepare-media-fixtures.py --output .runtime/fixtures`；`python3 scripts/baseline-tests.py`：逐文件执行全部现有 19 个测试文件，任何退出码非 0 则失败，单文件 100 秒超时，不改断言。
- `node scripts/probe-reference.mjs`：真实 Chromium/WebGL2，7 个参考原型断言，太阳方向距离平方 >0.05，6 个房间；页面和 console error 必须 0。
- `OPENAI_API_KEY=... OPENAI_BASE_URL=... python3 scripts/probe-models.py`：真实模型文字、提供的户型图片、公开音频；仅连通性，人工评价识图内容，不能据非空回复判定户型准确。
- `OPENAI_API_KEY=... python3 scripts/probe-codex.py`：真实 Codex 0.155.1 Responses JSONL，必须退出 0 且 agent_message 精确等于 ALVA_CODEX_OK。业务工具及 Codex 图片探针另验。

命令中的密钥由执行环境传入，不把值写入命令记录或 Git。`vendor` 的 prepare 含 `|| echo`，安装通过不能替代显式 check/build；已单独实跑。

## 八组产品断言（实现期间逐组接入测试入口，尚未执行）

| 组 | 必验断言 |
|---|---|
| 1 导入 | 两张不同真实图像经模型生成不同候选；每个墙/门窗/房间稳定 ID；指定一条已知边校准，长度误差≤0.01m；未校准值明确估算；自交/零长度/非有限坐标拒绝且正式数据不变 |
| 2 Chat | 真实 Codex 文字和图像、音频转可编辑文字；发送/取消/重试；每次调用和附件只属当前项目；后台工具白名单；流式事件至少两个非空增量 |
| 3 问卷 | Q01–Q60 唯一，Q58 保留但禁用；手填与 Chat 双向同步；每轮1题、相关最多2题；A/B/C/D+自由；未知/跳过/不适用独立；锁定值不覆盖；退出问卷增量分析 |
| 4 痛点 | 首次分析与调整后保存前两阶段；咖啡操作台、宠物玩具、绿植遮光各正反例；原话/理由/作用空间/置信/确认状态；无专业证据只列待核实 |
| 5 编辑 | 增删复制/跨房间/旋转吸附/尺寸颜色材质/资产替换；用途与布局分开；模糊请求≥2个可旋转缩放3D候选；选定范围原子提交；版本校验、幂等与组失败回滚；锁定/未知墙不可提交 |
| 6 保存 | 每次保存服务器快照+不足50字简介；整版回退；失败不新增版本、保留未保存草稿和重试；重启恢复；故障注入后无正式污染 |
| 7 交付 | 同版本 DOCX可编辑正文、业主PDF、高清平面图、全屋/局部图、JSON+sidecar+manifest；文件校验和与版本一致；实际场景图；U01–U05/D01–D10内容；不使用示例预算 |
| 8 桌面体验 | 每个保留UI截图；WASD前后横移、鼠标视角、门洞通行/碰撞；Esc/失焦/输入暂停；昼夜/季节实际光照与阴影；地理假设可见；控制台error 0 |

交付闸门：八组100%通过、skip 0；公网固定HTTPS连续10/10、真实流式Chat、跨项目拒绝、服务/隧道重启后保存项目恢复、隔离备份恢复与干净安装各一次。模型失败、保存失败、越权各一次隔离故障必须被检测。仅全部满足后标 ready_for_review。

已实现真实流式/工具/图片探针：`OPENAI_API_KEY=... node_modules/.bin/tsx scripts/probe-codex-stream.ts`。要求工具调用恰好1次、非空delta至少2、拼接逐字等于最终回复；图片接口非空仅代表协议通过。
