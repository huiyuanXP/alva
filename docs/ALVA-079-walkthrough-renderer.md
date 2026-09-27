# ALVA-079 漫游复用全屋渲染

Status: in-progress
Owner: codex-walk

用户要求：Walk Through 与 Whole Room 使用同一门窗渲染，能够穿门跨房间。

范围：主工作区统一 SceneView，复用现有拓扑碰撞和暂停控制；既有视图 MCP 入口保持共用。验收覆盖真实门窗网格、键盘穿门、墙窗及家具阻挡、输入暂停和房间切换。
