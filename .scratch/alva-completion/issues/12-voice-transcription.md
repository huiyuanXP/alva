# 12: 录音转写、纠正与发送

**ID:** ALVA-019

**Parent scope:** T04

**Review reference:** R07

**What to build:** 录音转成可编辑文字，用户纠正后再发送。

**Blocked by:** [ALVA-017](10-multimodal-chat.md)

**Status:** done

**Execution:** Lexie 已完成实现与两轮验收；原实现提交 `c925bcef0fa82bc83a6b16d1df8b8e5345ee8654`，随后 squash 集成到 `main`。

- [x] 真实转写可编辑，取消/失败不误发送；发送以用户修改后的文字为准。
- [x] 成功、失败和取消后清除录音临时内容，不作为项目永久附件。
- [x] 文件音源、模拟麦克风、实体麦克风分开留证；未测实体设备保持待验。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `chat`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## Implementation handoff

- 完成独立 /api/transcribe/cancel 链路，转写使用项目级独立 AbortController；取消不会误取消聊天或导入任务。
- 转写成功只把文字返回浏览器，不写项目消息、证据或附件；失败与取消同样不产生业务写入。前端只在成功后把转写放入可编辑输入框，发送时以用户当前编辑后的文字为准。
- 录音增加显式“取消录音”，取消会停止 MediaRecorder、停止媒体轨道并丢弃内存分片；转写中“取消转写”调用独立接口。成功/失败/取消后音频临时内容都不进入项目永久附件。
- 第1轮验收：evidence/20260922T161500Z-ALVA019-round1/result.json。真实公开 WAV 文件 + 真实 provider 转写通过；转写前后 project revision 不变；修改后的文字才进入 user message/evidence。
- 第2轮验收：evidence/20260922T162000Z-ALVA019-round2/。Chromium 原生 fake microphone + MediaRecorder + 浏览器 WAV 归一化 + 真实 provider 转写通过；取消录音不发送且保留原输入；编辑后发送只持久化编辑文本；console error 0。实体麦克风因云端 runner 无物理设备，按票要求明确保持待验。
- 自动化：tests/alva-voice-transcription.test.ts 覆盖成功、provider 失败、取消、无副作用；scripts/alva-019-check.ts / scripts/alva-019-browser.ts 为两轮验收入口。
