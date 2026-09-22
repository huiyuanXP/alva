# ALVA-053：模型路由与平面拓扑诊断

**Status:** in-progress

任务类型：用户直接授权维护检查，独立于44张产品票；不重排旧 week/step。

## 本轮范围

核对主机工作区、实际 Codex/业务模型路径，实测现有平台 Gemini 3.8 接口；按用户最新说明保留小米 MiMo 路由，不覆盖 Codex 配置。读取现有原图与候选、离线重放解析/拓扑校验，整理历史生成时间。拓扑仅诊断，不覆盖生产结果，不重启服务。

基线 HEAD：`2f9588b7b69879b79aed3c93b495fec18a9cf099`；开工时 main 干净。保护 ALVA-028 与 ALVA-043 认领及所有既有 Worktree。

Owner：chatgpt-audit；分支 `task/ALVA-053-chatgpt-audit`；Worktree `/home/ubuntu/Alva-worktrees/ALVA-053-chatgpt-audit`。改动仅限本票、诊断脚本、脱敏证据与交接文件；不改 api/chat.ts 等他人认领文件。

## 验证计划

- [ ] 实测模型目录与 Gemini 3.8/Codex App Server，保存准确错误与耗时。
- [ ] 重放历史候选及合成反例，区分生成、校验、前端映射问题。
- [ ] 提取可证明的开始/完成时间，不把文件名或 mtime 当生成时间。
- [ ] 运行相关现有检查，记录覆盖与缺口，更新恢复入口。

生产业务 API 读取与额外主机配置检查遭工具安全拦截；未执行、不绕过。当前线上具体样本的模型与时间未确认。
