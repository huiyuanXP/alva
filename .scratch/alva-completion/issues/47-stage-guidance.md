# 47: 主Chat阶段开场与断点引导

**ID:** ALVA-073

**Parent scope:** 用户2026-09-27明确要求首次初始化和Resume时按进度主动引导。

**What to build:** 户型专家自我介绍及上传、墙/门窗修改、校准、自查、建筑确认与阶段交接；生活设计欢迎及实际问卷读取，Resume依据当前上下文只继续未完成步骤。主Chat实际当前阶段MCP链验收。

**Blocked by:** [ALVA-072](46-project-switching.md)

**Status:** done

**Owner:** codex-guidance

**Parallel lane:** `chat`，主Chat和阶段状态串行。

## Implementation handoff

系统引导轮已接入原主Chat/Harness/当前阶段HTTP MCP；初始化、进度变化与阶段往返定位真实断点，首次欢迎、恢复去重、不写伪用户原话。户型校准后强制实际检查；生活阶段实际查问卷并按填写者继续下一题，失败/取消可重试。建筑确认门禁保留。

18项相关回归、最终分组类型与构建、5项专项复验、两轮真实模型/MCP/浏览器8步链均通过，页面错误0。测试夹具授权遗漏的失败run保留。详见 [功能合同与证据](../../../docs/ALVA-073-stage-guidance.md)。

个人实现a15b2e1已在main串行squash集成；不自动发布生产。neat-freak已同步受影响合同与结构说明；生产固定072 release，生成记忆out-of-scope，Worktree/合成复核现场保留。
