# 恢复索引

全部44张正式Ticket已发布。当前 ALVA-008–012、ALVA-014–019 已完成并集成 `main`；其余按依赖在独立 Worktree 条件并行。

1. [正式tracker](.scratch/alva-completion/README.md)：唯一票据入口、状态与前置依赖。
2. [Handoff](Handoff.md)：现状与边界。
3. [NextTask](NextTask.md)：当前可认领任务、署名及Worktree并行/集成规则。
4. [目录规范](docs/PROJECT-STRUCTURE.md)：根目录 /home/ubuntu/Alva，现役 api/、web/。
5. [远端访问](docs/REMOTE-ACCESS.md)：Coding Machine MCP 地址、唯一现役密码来源、旧归档与迁移边界。
6. [已批准的审核来源](Research/REMAINING-TICKETS-REVIEW.md)：R04/R29已删除，其余映射为正式票。

范围：无预算；理想WebGL机器Demo；仅手动全局快照、预览与恢复，无逐操作存档。ALVA-014 已将预算从现役问卷/API/UI/Chat工具/导出合同移除，但不删除旧快照中的历史数据；其他范围仍按后续 Ticket 实施。

当前依赖就绪：ALVA-013、020、023、028、031、036、041、043；其中 ALVA-028 已由 yang-chatgpt 认领并按用户要求暂不实施，其余未认领。以主目录NextTask实时清单为准，不能使用个人Worktree的旧副本认领。

只读任务网页：https://prod.huiyuanxp.com/todo ；数据直接来自正式tracker与主目录NextTask，说明见[TODO-LIST](docs/TODO-LIST.md)。ALVA-052为独立维护任务，不加入44张产品票。

ALVA-017 已完成真实文字与图片流式咨询：前端模型列表来自 `/api/models`，当前真实可用聊天模型为 `gemini-3-flash`；文字与参考图片均通过真实 Codex App Server 流式验收。

ALVA-015 已完成双向确认：Chat 原话确认后保留 chat evidence，手填答案可被后续 Chat 读取；

ALVA-016 已完成未答看板与增量分析：未答项按全屋/房间 scope 独立统计并排除禁用题；从未答项进入 Chat 会携带题目与房间；退出问卷仅分析 `lastAnalysisEvidence` 之后新增证据，失败不推进游标、重复退出无新证据时不增 revision。

ALVA-018 已完成咨询取消与故障重试：Chat 使用专属取消接口；取消/超时/模型不可用会保留文本、附件、房间与模型重试上下文，正常完成前的候选不会写入正式状态。

ALVA-019 已完成录音转写、纠正与发送：文件音源与 Chromium 模拟麦克风均通过真实转写；转写仅回填可编辑输入框，取消/失败不发送且音频不持久化，最终只保存用户修改后的文字。实体麦克风因云端 runner 无物理设备保持待验。当前依赖就绪：ALVA-013、020、023、028、031、036、041、043，其中 ALVA-028 已认领暂停。
