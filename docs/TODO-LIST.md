# alva To Do List

入口：https://prod.huiyuanxp.com/todo 。只读看板；JSON 数据：`/todo/api/board`。

权威源为 `.scratch/alva-completion/issues/*.md` 的44张产品票；主目录 `NextTask.md` 提供认领署名、分支/Worktree和协调说明。维护任务ALVA-052独立记录，不混入产品范围。

每次请求重读源文件，网页每30秒自动刷新，也支持手动刷新。main中的Ticket状态、认领和文档更新不需要重新上传或重启；个人Worktree完成未集成时不影响线上。`ready-for-agent`只表示定义就绪；所有前置done才进可认领列，已署名/进行中进入进行中列，未完成依赖或显式blocked进入等待依赖列。done仅以正式票状态为准，勾选验收项不自动判done；维护者仍须遵守NextTask的验收与集成规则。

解析兼容首批票的本地编号依赖与后续票的ALVA链接。ID重复、未知状态、依赖缺失或成环时接口报错，前端显示同步失败，不用空列表或全部就绪掩盖坏数据。内容版本基于源文件内容计算，刷新时间不参与版本计算。搜索覆盖正文，支持并行组筛选和`#ticket-ALVA-xxx`详情深链；Ticket间相对Markdown链接转换为看板详情链接，其他仓库文档相对链接保留为文本。

源码：`api/todo/board.ts`读数据，`api/todo/routes.ts`提供路由，`web/todo/index.html`提供独立页面，`api/api.ts`注册。不读业务数据库、上传和运行配置，不提供状态修改或上传接口。旧`taskboard/`及`apps/api/board.ts`保留为历史参考，不再作为alva看板服务入口。复用来源为本仓库旧看板UI及其状态显示方式，已适配正式ID、并行组和认领表。

验证/导出：

```bash
node_modules/.bin/tsx --test tests/alva-todo.test.ts
node_modules/.bin/tsx scripts/alva-todo-export.ts > /tmp/alva-tickets.json
node_modules/.bin/tsx scripts/alva-todo-check.ts
ALVA_TODO_ORIGIN=https://prod.huiyuanxp.com node_modules/.bin/tsx scripts/alva-todo-check.ts
```

浏览器本地检查只启独立只读Fastify服务，动态选择空闲端口，不启动数据库。公网检查比对当前源版本，验证44票、搜索、详情/刷新深链、并行组筛选、文档标签、窄屏布局和控制台；不调用模型或创建业务会话。证据写入独立`evidence/*-ALVA-052-todo/`。

发布使用已有alva.service，保持MCP、Tunnel和业务数据不变。发布前把`api/api.ts`保存到私有`.runtime/alva-todo-rollback/<run-id>/api.ts`。若本次路由有问题，将该备份复制回`api/api.ts`后重启alva.service即可撤销注册；再以Git审查恢复的源码，不执行全库reset，不删除Ticket或数据库。
