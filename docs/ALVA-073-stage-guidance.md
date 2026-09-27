# ALVA-073 主 Chat 阶段开场与断点引导

当前实现让页面初始化、阶段切换和业务进度变化触发真实 Agent 引导轮。户型导入首次介绍“我是你的户型规划专家”，生活设计首次介绍能力并实际查询 Home Vision；后续按真实断点接续。刷新同一断点复用已有消息，不重复欢迎。生产发布状态以 CURRENT.md 为准，本票开发不自动上线。

## 断点与交互

| 当前状态 | 下一步 |
|---|---|
| 无户型候选 | 在对话框上传图片/PDF并发送 |
| 识图失败或取消 | 重试原消息，刷新后可重新添加同一附件；不冒称已识别或归咎原图 |
| 候选未校准 | 对照原图核对、删除或修改墙体；门窗可请求 Agent 修改；点击已知长度墙体填写长度及来源 |
| 候选已校准 | 实际调用 inspect_topology，解释告警、位置和修复步骤；无问题时请求拓扑确认 |
| 拓扑已确认 | 引导生成建筑 3D |
| 建筑候选 | 预览并请求建筑确认 |
| 建筑已确认 | 可进入生活设计 |
| 生活设计 | 查询当前填写者问卷，继续下一道可见且未完成的题；复杂题引导独立问卷 |

问卷依据当前条件路径，跳过已回答、明确不知道及跳过项。多人未选择本人时要求选择，不合并偏好。已有有效待确认题卡在阶段往返后复用。自动轮只查询状态和创建待确认卡；不自动编辑设计、猜测墙长、生成家具或代用户确认。

## 唯一路径

`api/consultation/stage-guidance.ts` 同时提供进度查询与当前阶段 MCP 的 `get_stage_guidance`。浏览器通过只读 `GET /api/chat/guidance` 决定是否需要引导，再向现有 `POST /api/chat` 发送 `guidance:{key}`。仍由同一个主 Agent、原阶段 thread、当前阶段 HTTP MCP 执行，不新增模型调用旁路。

引导是系统轮，不创建伪用户消息或用户原话证据。成功 assistant 消息保存 `guidanceKey`；key 取阶段 generation 与实际业务断点，不取每次对话递增的 revision。校准后的几何变化触发重新检查，问卷答案与填写者变化触发重新定位。普通对话结尾也要求读取断点；具有所需工具证据的回复可覆盖该断点，避免紧随一条重复引导。

自动回复发布前核验实际 MCP 调用：必须读断点；校准后必须检查；生活阶段必须读问卷，支持 Chat 的未完题必须生成题卡。没有执行证据时返回 `GUIDANCE_UNVERIFIED` 及重试步骤，不展示未验证的成功文本。项目或阶段变化使旧轮失效。请求互斥、revision检查和持久断点共同阻止并发重复。

`web/src/chat/use-stage-guidance.ts` 只在业主、非快照、页面空闲且无未发送文本/附件/录音/问卷弹窗时启动。忙碌请求延后，失败和取消停止自动重试并显示“重试引导”；切换阶段共用忙碌状态。页面刷新同一已完成断点不额外发送消息；业务断点变化或往返阶段时继续原 thread。

## 验收

已通过18项相关回归（阶段Chat、问卷同步、项目隔离及5项本票用例），run `20260927T085526Z-ALVA066-alva073-regression-346818`。其中问卷专项初次缺少合成授权配置，失败run `20260927T085408Z-ALVA066-alva073-final-tests-346194` 已保留；修复测试夹具后通过，不涉及生产。

首轮真实模型/HTTP MCP/浏览器8步链通过，见 `evidence/2026-09-27T084926441Z-ALVA073-browser/result.json`：首次户型开场、刷新去重、墙/门窗与校准接续、校准后实际检查、异常几何修复指引、首次生活问卷、确认未知后下一题、两阶段原thread往返与题卡复用。页面错误0。最终候选分组类型检查、前端构建和5项本票复验通过，run `20260927T085846Z-ALVA066-alva073-final-check-348389`；最终真实浏览器再次通过同一8步链，见 `evidence/2026-09-27T090052212Z-ALVA073-browser/result.json`，页面错误0。

复现命令：

```bash
bash scripts/alva-066-run.sh alva073-check bash scripts/alva-073-verify.sh
bash scripts/alva-066-run.sh alva073-regression bash scripts/alva-072-tests.sh tests/alva-stage-guidance.test.ts tests/alva-stage-chat.test.ts tests/alva-vision-chat.test.ts tests/alva-projects.test.ts
ALVA066_TASK_SECONDS=1800 bash scripts/alva-066-run.sh alva073-browser node --max-old-space-size=160 --max-semi-space-size=4 --liftoff-only --no-wasm-tier-up --wasm-lazy-compilation --wasm-num-compilation-tasks=1 --import tsx scripts/alva-073-browser.ts
```

重测试与临时预览共用20%总内存预算，按现役runner串行执行；真实模型需要已有环境凭据，不能把其值写入证据。合成户型和建筑只用于覆盖引导断点，不作为识图准确率或建筑生成质量验收。原有建筑确认门禁与用户最终确认保留。


## 知识收尾

neat-freak：代码、隔离运行链与文档 changed-and-verified；项目规则 verified-current，无新增顶层工程或依赖边界。主Chat合同、问卷合同、目录规范与本票交接已同步。生产仍固定 ALVA-072 release，本票发布 out-of-scope；当前生产登录后复验 pending 属于此前发布边界。生成记忆 out-of-scope，未改写宿主管理内容。

已删除本次无用盘点与生成配置；失败run、合成数据、原thread和Worktree保留供复核，不执行破坏性清场。重任务共用CPU80%、总内存20%、swap0预算；验收后恢复068临时预览。既有Vite大bundle提示仍保留，不影响本次构建通过。

## 发布状态更新

2026-09-27用户明确授权后已发布生产aa4f900，覆盖上述开发时未发布状态；服务与公网资源验证通过，登录后复验边界见[发布收据](ALVA-073-production-release.md)。
