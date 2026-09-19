# ALVA-052：当前 Ticket 接入 To Do List

任务类型：用户直接授权的看板维护。独立于44张产品功能票，不改变原票依赖与状态。

来源：用户要求检查当前Ticket和AWS网站逻辑并接入新源，随后确认目标`prod.huiyuanxp.com/todo`。

认领：codex-todo；task/ALVA-052-codex-todo；独立Worktree。

验收：44张ALVA-008–051完整读取，150条验收保留；初始5可认领/39等待/0进行/0完成；源状态变更解锁与署名同步；ID、依赖及环检查；浏览器搜索/筛选/详情/刷新/文档/窄屏无错误；原域名发布验证，业务首页/健康保持有效，MCP不变。

## Implementation handoff

状态：done。适配、main集成验证及原网址公网发布验证完成，记录见PROGRESS。3项看板测试、4项现有基础/入口回归通过；本地浏览器证据`evidence/20260919T165604672Z-ALVA-052-todo/`。使用说明与回滚见[TODO-LIST](TODO-LIST.md)。未实施任何产品票，未操作业务数据。

个人实现SHA：d902557，公网CSP修正SHA：9fae8e6。公网成功证据：`evidence/20260919T165930206Z-ALVA-052-todo/`。失败run保留；当前控制台0错误。原44张票及其150条验收正文未改变。
