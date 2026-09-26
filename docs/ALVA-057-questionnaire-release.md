# ALVA-057 英文问卷独立发布

2026-09-26 用户明确要求先上线已完成的英文问卷，暂不以 ALVA-066 两阶段 MCP 完成作为问卷发布门禁。该决定仅覆盖问卷入口、题库、条件流程、按人保存和现有 Chat 的只读摘要接线；ALVA-066 的独立运行层、阶段切换、持久 thread 和确认后家具建议仍由原票完成，不以本次发布声称通过。ALVA-057 的 MCP 联合验收仍由原负责人继续，票不标 done。

代码从 `task/ALVA-057-xuanpu-chat-6pro` 已提交业务实现提取到独立 `release/ALVA-057-questionnaire`，基于本轮 main，保留现有其他任务和旧问卷数据。问卷参考原文及 Q01/Q05/Q07 的 ZIP 提取母版见 `references/home-vision-v4/`。新版记录使用独立 `home-vision-v4` 版本，不将旧题号重用。预算只作为问卷采集字段，不提供自动报价。

在独立工作区按共享重任务锁/CPU80%/1200M（浏览器1600M）验证：类型检查和生产构建退出0；40/40 问卷、Chat、权限、快照相关测试通过；保存/恢复与隔离模型 Chat 的 7 组浏览器检查，以及界面、Q1/Q5/Q7、iPhone 设备模拟的 6 组检查通过，页面错误0。证据 `evidence/20260926T015534Z-ALVA057-release-typecheck-655385/`、`...015606Z-ALVA057-release-regression-655590/`、`...015729Z-ALVA057-release-build-656195/`、`...015731Z-ALVA057-release-recovery-browser-656269/`、`...015752Z-ALVA057-release-layout-browser-656484/`，详细浏览器结果及截图在同次 `evidence/2026-09-26T015735191Z-ALVA057-recovery-browser/` 与 `...015756015Z-ALVA057-browser/`。

生产部署与登录后核验结果另记，未完成前不得把隔离验收称为线上通过。原接力工作区保留，ALVA-066 与其他未完成票状态不变。

## 生产发布收据

main集成 `817c253`。发布前备份原代码、dist与停止服务后的127MiB数据库副本于 `.runtime/alva057-questionnaire-20260926T020017Z/`；保留旧资源，原服务工作目录不变，重启仅 `alva.service`。新版首页资源 `/assets/index-MGEQ5jJb.js` 已经公网200，首页与健康200，未鉴权问卷API401。使用用户提供的现役验证码进行只读公网Chromium核验：登录200、新入口/Q01显示、GET新版问卷 `home-vision-v4`、关闭后revision不变、页面脚本错误0。证据 `evidence/2026-09-26T020331622Z-ALVA057-questionnaire-public/result.json`。没有在生产填写新答案，也没有声称 ALVA-066 阶段MCP可用。
