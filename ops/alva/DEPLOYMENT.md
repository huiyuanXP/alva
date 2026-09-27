## 2026-09-27 当前发布入口

生产固定到main `c053dc6`，`/etc/systemd/system/alva.service.d/ALVA077-release.conf`指向`.runtime/20260927T144930Z-ALVA077-production/release/`。含问卷显式批量发送、逐张候选/无版本阻塞拒绝、小预览隐藏日照说明，以及此前中英文和即时阶段导航。公网登录/资源哈希/两阶段往返/用户数据不变通过，见[ALVA-077收据](../../docs/ALVA-077-production-release.md)。现役环境`.runtime/alva-prod.env`；临时验证码已删除。后续main提交不自动上线。

以下为基础运维与历史约定，路径冲突以上述当前发布入口为准。

# alva 当前发布与回滚

用户2026-09-19已授权停用旧站点并复用旧Tunnel文件。业务地址 https://prod.huiyuanxp.com；既有远端路由回源 http://localhost:4173，无DNS修改。

应用单元 alva.service、隧道单元 alva-tunnel.service 已enable。仓库 /home/ubuntu/Alva；私有环境 .runtime/alva-prod.env；数据 .runtime/alva-data/db。应用只监听127.0.0.1:4173。Tunnel复用 /etc/cloudflared/prod-token；该令牌不在仓库，也不公开裸模型/数据库端口。

旧 renovation-workbench.service、cloudflared.service 及本地 alva-dev.service 已stop/disable。旧源代码、发布目录、令牌文件均保留；不同时启动两个写入同一PGlite目录的alva进程。MCP单元保持不动。

## 常用操作

`sudo systemctl status alva.service alva-tunnel.service`；`curl -f https://prod.huiyuanxp.com/healthz`；`sudo journalctl -u alva.service -u alva-tunnel.service`。

`node_modules/.bin/tsx scripts/alva-backup-check.ts` 现在默认 alva.service/4173，停写备份后在隔离目录恢复校验，最后启动。测试本地其他实例时显式指定ALVA_SERVICE、ALVA_PORT；数据目录仍为本仓库.runtime/alva-data。

`ALVA_TEST_ORIGIN=https://prod.huiyuanxp.com node_modules/.bin/tsx scripts/alva-browser.ts` 在公网跑真实导入/咨询/交付核心链。

`node_modules/.bin/tsx scripts/alva-public-check.ts` 检查HTTPS10/10、Secure会话、越权拒绝、真实多模态SSE、应用/Tunnel重启后项目及快照SHA一致。此命令会重启生产服务，应在其他验收调用完成后执行。

## 回退至保留旧站点

先 `sudo systemctl disable --now alva.service alva-tunnel.service`，再 `sudo systemctl enable --now renovation-workbench.service cloudflared.service`，随后检查旧站点HTTPS。alva数据与备份保留，无需覆盖旧数据或移动源文件。回切alva时先停旧两单元，再enable/start alva两单元。任何切换保持4173仅一个应用监听。

当前发布为已验核心成果，不意味着完整八组产品范围验收完成；最新证据及未完功能见Handoff。

公共入口：生产私有环境中ALVA_PUBLIC_ACCESS_TOKEN绑定现有公共项目链接。浏览器POST /api/public-access：已有有效会话保持角色/项目，否则交换配置的公共链接为本设备会话。令牌不返回前端；公开域名即可重复进入。取消公共入口可删除该变量并重启alva.service，恢复仅项目链接进入。当前用户明确要求公共访问，不主动关闭此配置。

## 户型识别默认模型

ALVA-064 起，图片户型识别使用 `OPENAI_VISION_MODEL=gemini-3.8-flash-high` 和 `OPENAI_VISION_REASONING_EFFORT=high`；普通聊天由 `api/main-chat-agent.ts` 的 `mainChatAgent.model` 独立选择（ALVA-067 起为 Gemini 3.8 Flash High），并通过 `GET /api/models` 提供给前端，不由 `OPENAI_MODEL` 覆盖。现役值在私有 `.runtime/alva-prod.env`，仓库仅保存 `.env.example`。变更生产模型须先在隔离数据中跑真实图片、严格解析与几何检查，再重启 `alva.service` 和验证公网导入；仅改聊天模型不应隐式改变识图默认值。
