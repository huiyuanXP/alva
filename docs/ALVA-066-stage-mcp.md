# ALVA-066 主 Chat 按阶段接入两包 MCP

**ID:** ALVA-066
**Status:** ready-for-agent
**Execution state:** 方案已获用户授权；票据与协议核验已开始，等待主目录已有协调修改归属确认后署名认领并创建独立 Worktree。
**Owner:** 待协调认领（执行意向 codex-stage-mcp）
**Date:** 2026-09-25
**Dependencies:** ALVA-065；已完成业务以 main 实现为准。ALVA-057 在途共享问卷/schema/页面需协调。
**Branch / Worktree:** 计划 task/ALVA-066-codex-stage-mcp；/home/ubuntu/Alva-worktrees/ALVA-066-codex-stage-mcp。
**Scope:** 本票是新增接入与房间样式任务，不改写 ALVA-008–051 的编号或完成状态。

## 用户批准的行为

登录后左侧主 Chat 仍是唯一对话入口。每项目保存户型、生活设计两个非临时 Codex thread，切回阶段必须 thread/resume 原 thread。两个阶段聊天记录均保留。旧项目保留历史消息；旧临时 thread 已删除，首次进入各阶段创建新 thread 并注入摘要，不能声称恢复了旧 thread。

户型阶段覆盖原图上传与识别、标注、墙和门窗调整、校准、拓扑确认、建筑 3D 生成与确认。建筑确认后进入生活设计，撤下户型 MCP，装载生活设计 MCP。切回户型立即 Resume，可查看讨论；修改已确认拓扑前仍须明确确认，服务端沿现有规则清除依赖旧拓扑的后续设计。

每次离开阶段生成携带项目 revision 的交接摘要。进入另一阶段时将未送达摘要与最新快照送给新建或 Resume 的 Agent，记录送达 ID，避免重复注入。拓扑修改后再进入生活设计 Resume 原 thread，送达说明失效内容的新摘要。所有工具执行读取最新项目状态，不依据旧聊天记录授权写入。

## MCP 与业务合同

在 Alva 服务进程提供两个独立的仅监听本机的 HTTP MCP 端点：户型导入、生活设计。每次主 Agent 调用只配置当前阶段的一包 MCP，包内按功能划分独立工具；辅助识图/建筑生成模型不继承 MCP。短期凭据绑定项目、角色、阶段，服务端每次校验。直接按钮保留，API 与 MCP 共用服务端业务逻辑。

户型图/PDF 先真实上传到项目私有暂存区，Agent 仅取得附件 ID，再调用识图工具。验证归属、类型、存在性与读取结果，不用文件名或模型描述冒充读图；返回处理状态和待校正候选，确认由服务端核验。

生活设计 MCP 接入 main 已完成的问卷、家具、房间用途/布局、参考偏好、审查、保存及交付能力。未完成业务明确报告不可用，不因注册工具而标原票完成。每次确认问卷回答后，触发该阶段 Agent 为相关房间提出家具候选；草稿不触发。服务端验证许可资产、边界、碰撞，用户确认才采用。

同票补齐房间风格标签及墙面、地面颜色/材料候选，支持 2D/3D 预览，明确确认后写入和重读；不改变墙体几何。视角、日照等界面参数返回受约束的 UI action，页面执行并回报结果，未回报不称已生效。

MCP 为默认优先调用渠道。错误必须从工具返回可解释结构，包括稳定错误码、发生原因、是否可重试、当前 revision（可取得时）、用户可执行的修复步骤和确认要求。业务失败使用 MCP isError 与结构化内容，不伪造成功；Agent 基于实际错误提示重传附件、重读状态、选择房间、确认操作或重试。不得泄露凭据/跨项目数据，不盲目循环重试。

## 实施顺序与交付门

1. 隔离合成项目验证安装版本与现役模型网关：原生 HTTP MCP 列表、实际工具调用、切换阶段隐藏工具。原生不可用时保留两包 MCP，以现役 App Server dynamicTools 作受控桥接，记录原因和证据；不得把桥接称为原生调用通过。
2. 实施 thread 持久化、Resume、阶段切换和摘要送达；抽取 API/MCP 共用服务；保留历史消息并明确迁移状态。中断重试和服务重启不能产生假 Resume、重复写入或重复注入。
3. 完成附件、户型、生活设计、确认后家具建议、样式、UI action 回执；同步主 Chat 合同、任务模板、AGENTS 和目录规范。
4. 隔离端到端全部通过后，备份并准备回滚，再发布并进行生产验收；MCP 控制服务配置保持不变。

## 验收清单

- [ ] 当前 Codex/网关实际列出并调用正确阶段工具；另一阶段不可见且服务端拒绝越阶段调用。
- [ ] Chat 上传真实原图/PDF、识图、调整、校准、确认拓扑、生成和确认建筑；候选不自动采用。
- [ ] 建筑确认后切生活设计；两个 thread ID 持久化，切回原 ID Resume。
- [ ] 两阶段消息保留；摘要附 revision，送达去重；重启、取消/重试保持正确。
- [ ] 确认回答触发相关房间待确认家具建议；草稿不触发，非法资产/碰撞被拒。
- [ ] 房间样式 2D/3D 预览、确认、刷新重读一致，墙体几何不变。
- [ ] UI action 实际执行并回执；无回执或失败不得宣称成功。
- [ ] 切回户型讨论不清空设计；明确修改拓扑后旧候选失效，再回生活设计送达失效摘要。
- [ ] 越权、跨项目、错误/缺失附件、过期凭据、revision 冲突均有可解释 MCP 错误且无正式污染。
- [ ] 直接按钮回归通过；所有已完成业务主 Chat 实际工具调用证据可追踪。
- [ ] 备份/回滚可用，生产分别验两个阶段调用、可见性与会话恢复。

## 初始核验与 Implementation handoff

2026-09-25 已核对：本机 codex-cli 0.157.0；api/codex.ts 当前每轮 ephemeral:true、mcp_servers:{}，调用结束删除工作目录，确需改造。已实际下载阅读 OpenAI Docs 的 [MCP](https://developers.openai.com/codex/mcp/) 和 [App Server](https://developers.openai.com/codex/app-server/)：支持 HTTP、enabled_tools、bearer_token_env_var、thread/resume；dynamicTools 为实验字段，持久化于 thread 元数据，Resume 默认恢复。官方能力不是当前网关业务验收证据；真实调用待执行。

发现 main 的 AGENTS.md、NextTask.md 存在本轮开始前的未提交修改。依 NextTask 认领规则，已向用户询问归属；不吞并或回滚这些修改。ALVA-024 单票及 main PROGRESS 已 done，但未提交 NextTask 又列 in-progress；ALVA-028 单票也已 done，恢复索引仍说暂停。认领前须按实际提交与负责人核对，不能据过期表抢占或恢复任务。

本票当前没有功能通过记录、没有生产变更。知识状态：代码/协议基线 verified-current；票据 changed-and-verified；运行接入/端到端 pending；生成记忆 out-of-scope；既有未提交文件与证据保留。

安装版协议 schema 已只读导出核验：ThreadStartParams 包含 ephemeral、dynamicTools、config；ThreadResumeParams 包含 threadId、config，未暴露 dynamicTools 覆盖字段。桥接工具目录变更的恢复兼容需实测，不能照搬官网最新字段。未启动模型调用。
