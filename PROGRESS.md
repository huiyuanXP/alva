# alva 执行进度

2026-09-19 ALVA-000：新仓库与旧源码隔离；已归档完整任务和附件，36场景矩阵、任务依赖、验收断言与当前入口。

- 根 npm ci --ignore-scripts、npm run check、npm run build:web：退出0。
- engine npm ci --ignore-scripts、npm run check、NODE_ENV=production npm run build：退出0。check回退加载配置后报告0错误7警告；prepare含echo，不以prepare认定通过。
- 首次 npm test 被SIGTERM终止（143），未发现同期内核OOM日志，原因未确证；保留20260919T102353Z-a74a0cf5/unit-tests.log。
- 逐文件全部复跑：20260919T103055Z-9b9353e5/results.json，19/19文件退出0，汇总 {"tests": 53, "pass": 53, "fail": 0, "cancelled": 0, "skipped": 0, "todo": 0}。既有测试包含依赖注入/模拟服务，不能替代新八组真实业务验收。未新增skip；未配置覆盖率统计，不能声称覆盖率100%。
- 参考原型7项浏览器检查通过，evidence/20260919T102812503Z-d32320b2；18/18附件校验和一致。
- 真实模型text/vision/audio调用有返回，20260919T102726Z-28d50713。识图误把厨房称为卧室，准确性未通过。公开语音转写为How old is the Brooklyn Bridge?，非实体麦克风。
- Codex CLI 0.155.1 Responses文字探针退出0，20260919T102845Z-c28b0add。流式业务工具/Codex识图尚待接入。
- 输入映射核验退出0，20260919T103253Z-eeb93520。旧库HEAD及工作树未变。
- 新应用未发布、八组产品验收未执行；产品不标ready_for_review。新验收自动脚本随相应实现落地，ACCEPTANCE已冻结必验断言与公差，不能把脚本未完成算为任务0全通过。

下一步：完成ALVA-000的Codex流式协议验证和新验收入口，推进ALVA-001入口/真实识图/校准/统一场景。正式域名prod.huiyuanxp.com授权已取得，部署切换尚未执行。

ALVA-000协议补验：首次App Server探针因配置对象使用JSON而不是TOML而失败；修正为逐键覆盖后，20260919T103726806Z-19e0dda5实测动态只读工具1次、28个真实delta、拼接与最终文本一致、图片输入返回。该图片提示明确指出厨房特征，只验证图片协议，不替代盲测识图。
