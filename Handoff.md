# alva Handoff

持久项目名 alva，仓库 /home/ubuntu/Alva/alva；用户要求串行，不派子Agent。目标是完整全屋咨询与设计师交付，不是离线3D展示。

当前ALVA-000基础核验已落地，流式协议和新验收脚本仍在途；产品阶段ALVA-001尚未验收。完整状态和证据见PROGRESS、SPEC、SCOPE、ACCEPTANCE。

源码复用旧库HEAD 2825f36，旧库只读且干净；不迁移客户数据。保留原始来源清单和源码tar，不宣称完整迁移成功。

用户追加授权：新仓库 /home/ubuntu/Alva/alva；附件 Docs/room-study-handoff.zip 替代旧文件名映射；正式域名 prod.huiyuanxp.com，允许查找旧AWS hackthon发布凭据。运行中的旧workbench服务仍位于 /opt/renovation-workbench/releases/chat-popup-20260916/app，端口4173；未修改。

已配置Tunnel运行令牌在 /etc/cloudflared/prod-token（root私有），旧库.env只有模型配置及PROD_CLOUDFLARE_TUNNEL_TOKEN；没有确认具备独立新Tunnel创建权限。不得打印/提交这些值或修改MCP。当前已有域名授权不等于已发布。

模型key由上级授权来源仅在进程环境传入；仓库没有复制密钥。Codex 0.155.1、Node24.21.0、npm11.19.0、Python3.12.3、cloudflared2026.9.0；浏览器Chromium软件WebGL2可用。

所有运行证据在evidence/，临时合成媒体和隔离数据在忽略的.runtime/；源代码快照tar按忽略规则不入Git。恢复从CURRENT/NextTask读取。
