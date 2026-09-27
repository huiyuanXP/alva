# 48: 中英文界面与Agent输出语言

**ID:** ALVA-074

**Status:** done

**Owner:** codex-i18n

**Blocked by:** [ALVA-073](47-stage-guidance.md)

用户明确要求：全部界面内容可切换中文/英文；Prompt增加输出语言参数，跟随用户界面语言。覆盖两阶段、引导/Resume、问卷、提示和确认卡；保留用户原始内容与业务标识。真实主Chat/MCP及浏览器双语验收，不自动部署。

## Implementation handoff

实现与两轮真实 Chat/MCP 双语验收已完成，最终类型/构建及阶段导航回归通过，已集成 main（个人实现 16ae8db）。语言保持在浏览器与每轮 Prompt，thread 和业务值不变；目录、证据和边界见 [ALVA-074](../../../docs/ALVA-074-bilingual-interface.md)。已合并 ALVA-075 导航修复，未部署生产。
