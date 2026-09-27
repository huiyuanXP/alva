# alva

业主通过 Chat 整理生活需求、校准户型、预览确认修改，再导出设计师可编辑的同版本交付。当前核心链已发布于 https://prod.huiyuanxp.com ，登录需统一验证码。登录后左侧“咨询”栏是主 Chat Agent 入口；其 Agent/Harness 合同见[ALVA-065](docs/ALVA-065-main-chat-agent.md)。完整保留范围仍未完成，不是最终验收状态。

本地当前版本提供中文 / English 切换：登录页、顶部工作区和问卷均有语言入口，Agent 后续回复跟随界面语言，历史对话与用户原文保留。实现与验收见 [ALVA-074](docs/ALVA-074-bilingual-interface.md)，上线状态以交接记录为准。

开发必读[文件结构与工程归属](docs/PROJECT-STRUCTURE.md)，专题索引见[docs](docs/README.md)。

恢复入口 [Handoff.md](Handoff.md)，规格 [SPEC.md](SPEC.md)，范围 [SCOPE.md](SCOPE.md)，验证 [ACCEPTANCE.md](ACCEPTANCE.md)。

安装 `npm ci --ignore-scripts`；检查 `npm run check`；构建 `npm run build:alva`；按 `.env.example` 将配置传入进程环境后运行 `npm run start:alva`。配置文件不会自动加载。本地默认 127.0.0.1:4180，未配置公共入口时使用私有初始链接；线上已启用统一验证码。空项目需上传自己的户型，不载入固定样例。

核心测试：`node_modules/.bin/tsx --test tests/alva-foundation.test.ts tests/alva-business.test.ts`。真实浏览器链：`node_modules/.bin/tsx scripts/alva-browser.ts`（须先启动本地服务并配置真实模型，约数分钟，生成独立合成验收项目）。运维入口 [ops/alva/README.md](ops/alva/README.md)。

`apps/api`、`apps/web`、`vendor/openplan3d` 是只读来源复用到本仓库的保留基线；旧 `start`、`build` 与旧测试入口保留兼容，新产品使用带 `alva` 的命令。

全部44张正式票见[本地tracker](.scratch/alva-completion/README.md)，研究见[登录与建筑3D](Research/LOGIN-IMPORT-3D.md)。原主题保留在[范围来源](TICKET-PROPOSAL.md)，现役执行定义以正式 tracker 和 [NextTask](NextTask.md) 为准。

并行协作从[NextTask认领表](NextTask.md)进入：署名认领、每票独立Worktree、main串行集成后解锁后继。
