# ALVA-057 Your Home Vision

Status: in-progress
Owner: xuanpu-chat-6pro
Branch: task/ALVA-057-xuanpu-chat-6pro

用户要求：突出英文入口；新版52张主卡+5张条件卡，7阶段；Q1/Q5/Q7的ZIP优先，按三种母版；轻微英文润色。自动保存/随时关闭恢复、阶段总结、条件过滤、单间/探索路径、货币单位明确确认、不同填写者分开保存。旧问卷ID不能与新版混用，历史答案保留。

验收：定向逻辑/API与真实浏览器、桌面/窄屏截图、保存失败/恢复；生产准备回滚并核对资源与服务。源附件与覆盖明细随实现入库。

## 当前交接

业务代码与验收保存在 `task/ALVA-057-xuanpu-chat-6pro`，恢复提交 `53a39fc`；工作区 `/home/ubuntu/Alva/.runtime/worktrees/ALVA-057-xuanpu-chat-6pro`。完整来源、数据合同和证据见该分支同名票据，复验入口 `bash scripts/alva-057-validate.sh`。

类型检查、40/40相关测试、构建、7组恢复/Chat和6组桌面/设备模拟浏览器检查通过，页面脚本错误0。CPU80%、内存1200M（浏览器1600M），最终验收无OOM；构建仍有大chunk提示。新版预算仅采集，货币/单位明确确认，不恢复旧预算题或扩展自动报价、预算导出。

仍为in-progress：最新 [ALVA-066](ALVA-066-stage-mcp.md) 要求同票接入生活设计MCP；当前运行代码尚无阶段MCP。现有get_snapshot与SSE的隔离验收不替代阶段MCP验收。英文问卷业务已按用户2026-09-26指令独立合入main并发布生产，见 [发布收据](ALVA-057-questionnaire-release.md)；ALVA-066运行层及本票阶段MCP联合验收仍待完成，整票继续in-progress。

原yang-chatgpt分支/Worktree及独有内容保留，未清场；其他票、未提交规则与原暂存内容未纳入本票。测试进程不常驻，后续执行仍需核对共享文件和重任务锁。
