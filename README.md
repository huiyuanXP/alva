# alva

业主通过 Chat 整理生活需求、校准户型、预览确认修改，再导出设计师可编辑的同版本交付。当前核心链已发布于 https://prod.huiyuanxp.com ，当前公共域名可进入共享项目；访客编辑权限待Ticket确认，现状与授权边界见Handoff。完整保留范围仍未完成，不是最终验收状态。

恢复入口 [Handoff.md](Handoff.md)，规格 [SPEC.md](SPEC.md)，范围 [SCOPE.md](SCOPE.md)，验证 [ACCEPTANCE.md](ACCEPTANCE.md)。

安装 `npm ci --ignore-scripts`；检查 `npm run check`；构建 `npm run build:alva`；按 `.env.example` 将配置传入进程环境后运行 `npm run start:alva`。配置文件不会自动加载。本地默认 127.0.0.1:4180，未配置公共入口时使用私有初始链接；线上公共入口的权限决策尚未闭合。空项目需上传自己的户型，不载入固定样例。

核心测试：`node_modules/.bin/tsx --test tests/alva-foundation.test.ts tests/alva-business.test.ts`。真实浏览器链：`node_modules/.bin/tsx scripts/alva-browser.ts`（须先启动本地服务并配置真实模型，约数分钟，生成独立合成验收项目）。运维入口 [ops/alva/README.md](ops/alva/README.md)。

`apps/api`、`apps/web`、`vendor/openplan3d` 是只读来源复用到本仓库的保留基线；旧 `start`、`build` 与旧测试入口保留兼容，新产品使用带 `alva` 的命令。

本轮先整理上下文和拆票，查看 [Ticket草案](TICKET-PROPOSAL.md)；草案不是执行授权。
