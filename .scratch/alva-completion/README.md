# alva 首批 Ticket

本地Markdown tracker，一票一文件，依赖顺序编号。用户本轮要求优先研究并发布T01与细分T02；用户已明确本轮仅发票不实施。本次仅发布这两个主题的6张执行票，不创建外部Issue、不向第三方发送消息。既有ALVA-000至007及旧库父票不改号、不关票。

状态词：`ready-for-agent`（定义已就绪，依赖完成且获得执行范围后可启动）、`in-progress`、`blocked`、`done`。只有验收通过并完成提交/交接才标done；研究完成或票已发布不代表功能完成。

| 本地号 | 正式ID | 原草案 | 交付 | 前置 |
|---|---|---|---|---|
| 01 | ALVA-008 | T01 | [统一登录验证码与多设备访问](issues/01-shared-login-code.md) | 无 |
| 02 | ALVA-009 | T02-A | [导入户型图并由Codex生成二维初稿](issues/02-import-codex-draft.md) | 01 |
| 03 | ALVA-010 | T02-B | [修改墙线与房间轮廓](issues/03-edit-wall-topology.md) | 02 |
| 04 | ALVA-011 | T02-C | [修正门窗、校准尺寸并确认拓扑](issues/04-openings-scale-confirm.md) | 03 |
| 05 | ALVA-012 | T02-D | [调用Codex生成建筑3D场景](issues/05-codex-architectural-scene.md) | 04 |
| 06 | ALVA-013 | T02-E | [建筑3D总览、剖切与房间视角](issues/06-example-building-views.md) | 05 |

串行顺序：01 → 02 → 03 → 04 → 05 → 06。02的用户入口建立在01受限登录完成之上；其余每票消费上一票的可验收产物。

实施前读取[研究结论](../../docs/research/LOGIN-IMPORT-3D.md)及项目Handoff/NextTask。本轮不生成登录验证码，不更改线上入口；实施01时再生成有效验证码交给用户。原T03–T15冻结，不继续细分或发布，待首批研究/票据处理完后另行推进。
