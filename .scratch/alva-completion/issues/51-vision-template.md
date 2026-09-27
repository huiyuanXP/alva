# 51: 全局 Vision 模板与分段问卷循环

**ID:** ALVA-078

**Status:** done

**Owner:** codex-vision

**Parallel lane:** questions / chat / proposals

**Depends on:** ALVA-077

将 Home Vision 的苹果风格作为问卷/选择的公共模板。右侧逐题填写、每段最多四题，Submit 合并为一条消息发送左侧 Chat，生活 MCP 读取批次并生成下一段；房间范围和方案采用使用 Room Vision 弹窗，取消右侧家具等独立选项卡。

实现、验证入口、失败证据及交接统一见 [ALVA-078](../../../docs/ALVA-078-vision-template.md)。只有最终候选验收并集成后标 done；本票不改变生产发布。

个人实现94415d4，已同步最新main并完成squash集成。12项相关回归、类型/构建、8项浏览器与6项真实Chat/MCP通过；未发布生产，原临时预览已恢复。
