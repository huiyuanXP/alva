# ALVA-067 主 Chat 模型与行内处理进度

2026-09-26，用户要求把 Ticket 66 验收使用的主 Chat 从 Gemini 3.1 换为 Gemini 3.8；后续明确保留已有黑色等待圆点，把工具读取/调用进度移到圆点上方，以浅色字体仅显示最新一条，不用顶部横幅。

负责人 codex-chat-feedback；分支 task/ALVA-067-codex-chat-feedback；独立 Worktree /home/ubuntu/Alva-worktrees/ALVA-067-codex-chat-feedback。本票修复主线基线，不接管 ALVA-066，不修改其在验收的 Worktree 或服务。

## 实现与行为

主 Chat 唯一模型入口 api/main-chat-agent.ts 改为 gemini-3.8-flash-high；模型列表、请求白名单和实际模型调用共用该值。识图仍有独立配置。没有把此次切换表述为性能基准提升，也没有改动运行器或 MCP 配置。

web/src/chat/ChatProgress.tsx 通过 assistant-ui 当前消息运行状态，在原有 MessagePrimitive.Parts（包含黑色等待圆点）之前显示最新进度。发送时设置“正在思考…”，每条 SSE status 覆盖上一条；流式输出期间保留，完成、失败、取消和请求异常均清除。取消等待文字使用同一位置。进度具备 polite live region；其他业务的错误/导入横幅保留原行为。

更新原有七份 Chat 相关回归的模型输入，避免旧型号在白名单阶段被拒绝而使业务断言失真。

## 验证与证据

- 类型与构建：evidence/20260926T035926Z-ALVA067-check-build-limited-731088/result.json；类型进程使用 GOMEMLIMIT=700MiB、GOGC=50、GOMAXPROCS=1，未放宽1200M/CPU80%/swap0限制。
- 桌面/手机浏览器：evidence/2026-09-26T040104550Z-ALVA067-chat-fb57e9/result.json；最新状态替换、位置、无顶部进度横幅、流式保留、完成/失败/取消清除、手机宽度均通过，页面错误0。工具状态使用受控模型替身以准确观察各阶段；截图 thinking.png、tool-progress.png、mobile-progress.png。
- 真实主 Chat：evidence/2026-09-26T040136200Z-ALVA067-real-chat-1f67c3/result.json；真实 POST /api/chat 使用 Gemini 3.8，实际调用 get_snapshot 与 ask_question，约19秒完成。独立合成项目，未操作生产项目；不是 ALVA-066 两阶段 MCP 整票门禁。
- 第一轮类型检查、1200M浏览器和默认Node参数回归被资源限额终止，原失败 run 均保留。随后按项目既有低内存类型/Node/WASM参数与1600M浏览器额度完成验证；不能把失败记为通过。
- 构建仍有原有大于500kB chunk提示，属于本票范围外。

## ALVA-066 接续

066负责人应同步已集成 main：保留其原有附件、阶段会话、自动建议及UI回执实现，将 send 中的 Chat status 改为 setChatProgress，保留其他非Chat状态的 setStatus；模型固定值保持3.8。既有恢复线程在 thread/resume 传入 input.model，无需为换模型清除会话。同步后重新固定候选SHA，复跑受影响的实际阶段MCP门禁；066/029不得因本票通过而标done。

## Implementation handoff

状态 done（实现已集成main，2026-09-26已部署并通过登录后只读线上核验）。个人实现 a6cee8c，署名 codex-chat-feedback；本票不是066整票结论。

17/17相关回归通过：evidence/20260926T040414Z-ALVA067-regression-limited-738636/result.json。已同步main的ALVA-038恢复实现与ALVA-039认领记录，未覆盖其他署名；回归在含038的基线上完成。

## neat-freak 收尾

代码与隔离运行态 changed-and-verified；主Chat合同及部署说明 changed-and-verified；规则 verified-current，按本次明确修复范围在独立工作区实现；机器生成记忆 out-of-scope；生产发布 changed-and-verified；公网登录后核验 changed-and-verified；066候选同步 pending。个人Worktree、原失败记录和截图保留供复核，未清理其他任务或私有现场。无新增顶层工程、共享合同或依赖。

集成核验：产品文件与个人已验提交逐文件相同，源码/文档diff-check通过；构建原始output.log包含Vite输出的一处行尾空格，作为原始证据保留，不伪造重写日志。

## 2026-09-26 生产发布

用户明确授权部署主线候选189fa20。发布构建包含已集成的ALVA-038快照恢复，ALVA-066独立分支不在此次发布范围。类型/构建通过（evidence/20260926T045301Z-ALVA067-release-build-10330/），本次构建桌面/手机、流式状态替换、失败/取消清除共5组浏览器检查通过（evidence/2026-09-26T045515621Z-ALVA067-chat-54a389/result.json）。

已于2026-09-26 04:54 UTC发布。备份.runtime/ALVA067-release-20260926T045448Z/包含发布前源码、dist、私有配置和停服后的数据压缩包；rollback.sh恢复发布前静态资源并重启原后端（发布前后后端源码相同）。备份校验及重启收据见evidence/ALVA067-release-20260926T045448Z/result.json。保留旧哈希资源，不改生产项目、MCP或066验收环境。

公网health/home正常，JS /assets/index-CJYIuDYm.js与CSS /assets/index-COlzMmhx.css都与本次构建SHA256一致，登录页页面错误0，未鉴权模型接口401。独立APIRequestContext取资源403，真实浏览器内fetch验证成功；前序失败run保留。前次公网证据evidence/2026-09-26T045704879Z-ALVA067-public/result.json记录资产校验成功，但当时登录核验未通过：用户提供验证码及服务器旧码均被原应用拒绝401，没有修改验证码或绕过验证。随后用户提供有效验证码，登录后只读线上核验通过，详见下段。

neat-freak：代码/构建/隔离UI/公网资源verified-current；文档changed-and-verified；登录后线上验证verified-current；066联合门禁及机器记忆out-of-scope；备份和个人Worktree保留。构建大chunk提示仍属既有范围外事项。

最终公网核验：evidence/2026-09-26T045822505Z-ALVA067-public/result.json，登录成功、咨询模型选择器与GET /api/models均为gemini-3.8-flash-high，JS/CSS哈希一致，页面错误0，项目revision不变。用户提供验证码仅临时用于核验，临时文件已删除，未更换应用验证码，未将凭据写入Git。
