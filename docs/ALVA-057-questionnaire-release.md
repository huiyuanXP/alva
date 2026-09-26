# ALVA-057 英文问卷独立发布

2026-09-26 用户明确要求先上线已完成的英文问卷，暂不以 ALVA-066 两阶段 MCP 完成作为问卷发布门禁。该决定仅覆盖问卷入口、题库、条件流程、按人保存和现有 Chat 的只读摘要接线；ALVA-066 的独立运行层、阶段切换、持久 thread 和确认后家具建议仍由原票完成，不以本次发布声称通过。ALVA-057 的 MCP 联合验收仍由原负责人继续，票不标 done。

代码从 `task/ALVA-057-xuanpu-chat-6pro` 已提交业务实现提取到独立 `release/ALVA-057-questionnaire`，基于本轮 main，保留现有其他任务和旧问卷数据。问卷参考原文及 Q01/Q05/Q07 的 ZIP 提取母版见 `references/home-vision-v4/`。新版记录使用独立 `home-vision-v4` 版本，不将旧题号重用。预算只作为问卷采集字段，不提供自动报价。

在独立工作区按共享重任务锁/CPU80%/1200M（浏览器1600M）验证：类型检查和生产构建退出0；40/40 问卷、Chat、权限、快照相关测试通过；保存/恢复与隔离模型 Chat 的 7 组浏览器检查，以及界面、Q1/Q5/Q7、iPhone 设备模拟的 6 组检查通过，页面错误0。证据 `evidence/20260926T015534Z-ALVA057-release-typecheck-655385/`、`...015606Z-ALVA057-release-regression-655590/`、`...015729Z-ALVA057-release-build-656195/`、`...015731Z-ALVA057-release-recovery-browser-656269/`、`...015752Z-ALVA057-release-layout-browser-656484/`，详细浏览器结果及截图在同次 `evidence/2026-09-26T015735191Z-ALVA057-recovery-browser/` 与 `...015756015Z-ALVA057-browser/`。

生产部署与登录后核验结果另记，未完成前不得把隔离验收称为线上通过。原接力工作区保留，ALVA-066 与其他未完成票状态不变。

## 生产发布收据

main集成 `817c253`。发布前备份原代码、dist与停止服务后的127MiB数据库副本于 `.runtime/alva057-questionnaire-20260926T020017Z/`；保留旧资源，原服务工作目录不变，重启仅 `alva.service`。新版首页资源 `/assets/index-MGEQ5jJb.js` 已经公网200，首页与健康200，未鉴权问卷API401。使用用户提供的现役验证码进行只读公网Chromium核验：登录200、新入口/Q01显示、GET新版问卷 `home-vision-v4`、关闭后revision不变、页面脚本错误0。证据 `evidence/2026-09-26T020331622Z-ALVA057-questionnaire-public/result.json`。没有在生产填写新答案，也没有声称 ALVA-066 阶段MCP可用。

## 2026-09-26 界面反馈修订

用户按两张生产截图要求：入口改为左侧咨询栏右上角小号鼠尾草色按钮；从流程移除地点问题Q02，保留历史填写值但不计入当前摘要；住宅类型等有语义图标的选项采用房屋/公寓图标，其余无对应图标时不显示默认方格；删除选项下方只改变答案状态而不前进的单字“Skip”，底部“Skip for now”负责实际跳过；“Something else?”明确提示可填写并显示输入占位文字。无地区回答时默认展示通用住宅类型，不推断用户所在地或预算货币。历史Q02光标在打开时定位到Q03，不重写历史答案。

基于当时主线 `bef7cfb` 在隔离工作区复验：类型检查、41项回归和生产构建通过；7组保存/Chat、6组原有布局/手机浏览器及针对反馈的入口/无Q02/图标/自填/跳过浏览器检查通过。详细证据分别见 `evidence/20260926T022948Z-ALVA057-release-typecheck-664684/`、`...023021Z-ALVA057-release-regression-664887/`、`...023146Z-ALVA057-release-build-666902/`、`...023148Z-ALVA057-release-recovery-browser-666977/`、`...023211Z-ALVA057-release-layout-browser-667611/`、`...023233Z-ALVA057-release-feedback-browser-668067/`；视觉截图见 `evidence/2026-09-26T023237409Z-ALVA057-feedback/`。生产发布详情见下方反馈修订收据。

## 界面反馈生产发布收据

main 集成 `39bc74f`，生产静态资源 `/assets/index-OlKM2r75.js` 公网返回 200。切换前备份代码和静态资源、停服后的数据库于 `.runtime/alva057-feedback-20260926T023523Z/`，仅重启系统级 `alva.service`，当前 active；未鉴权问卷接口返回 401。使用用户提供的现役访问码经公网 Chromium 只读核验：入口宽 143px、高 34px、浅绿背景，打开现有答卷直接显示 `What kind of home is it?`，无页面脚本错误；未新填答案。结果 `evidence/2026-09-26T024129886Z-ALVA057-feedback-public/result.json`。ALVA-066 阶段 MCP 联合验收继续单列，057 仍 in-progress。

## 2026-09-26 问题与选项文案精简

每个用户可见问题最多一个问号：Q21a 的远程工作问题和 Q50d 的既往设计合作问题合并为单问句。99 个带 `or`、`&`、`/` 的选项标签改为简短词组；需要保留并列含义时以逗号表达，尤其 Look & feel 阶段的氛围、色板和风格题。只改展示文案，选项 ID、类型和条件规则不变；测试阶段不以旧保存答案兼容作为验收门禁。浏览器验收脚本随 `Apartment` 标签同步。

隔离工作区类型检查、41/41 回归、生产构建以及 7 组恢复/Chat、6 组桌面/手机和反馈浏览器均通过。证据 `evidence/20260926T030124Z-ALVA057-release-regression-693337/`、`evidence/20260926T030251Z-ALVA057-release-build-694079/`、`evidence/20260926T030253Z-ALVA057-release-recovery-browser-694146/`、`evidence/20260926T030315Z-ALVA057-release-layout-browser-694354/`、`evidence/20260926T030337Z-ALVA057-release-feedback-browser-694588/`。生产收据如下。

### 文案精简生产发布收据

main `23a79da` 已发布；生产资源 `/assets/index-1gXRCXyU.js` 返回 200，包含 `Warm, cozy`、`Warm whites, light wood` 和新的单问句文案。发布前备份原静态资源、源码及停止服务后的 132MiB 数据库于 `.runtime/alva057-copy-20260926T030543Z/`，重启系统级 `alva.service` 后服务 active。公网登录只读浏览器验收通过：新资源、问卷弹窗可用，脚本错误 0；证据 `evidence/2026-09-26T030838473Z-ALVA057-copy-public/result.json`。ALVA-066 阶段 MCP 仍待联验，057 保持 in-progress。

## 2026-09-26 入口图标、长题提示与选项图标

入口保留左侧咨询栏右上角的小号按钮，房屋符号换为带话筒的 Headset 图标。截图里的 Q09 只以 “Got pictures you love?” 作标题；Pinterest/Houzz/Instagram 等例子移到下方灰色说明。Q06、Q08、Q11、Q31、Q38、Q39、Q45、C2、C4、C5 等共 23 个长题或带额外指令的题目同步拆分；第一题使用标题下的 14px 灰字，卡内后续题目用字段说明，不修改题目 ID 和答题结构。Look & feel 的 Q06 氛围和 Q10 排斥项、以及同类 Q26 照明和 Q32 材料选项加入语义线条图标；Q07 色板和 Q08 风格图沿用现有图像方案，不填充无意义的通用方框。

隔离工作区类型检查、41/41 回归、生产构建、恢复与 Chat 7 组、桌面/手机 6 组、入口反馈浏览器检查均通过。Q06 桌面截图见本轮 `evidence/2026-09-26T033514706Z-ALVA057-browser/q06-icons.png`。专项视觉验收通过：Q09 标题和灰字分层、Q06 的 10 个选项图标、Q10 的 8 个图标及入口耳麦均在合成项目真实浏览器中核对，页面错误 0。证据 `evidence/2026-09-26T033640287Z-ALVA057-visual/`。生产收据待部署后补记。
