# 项目远端访问

当前项目通过本机 Coding Machine MCP 和现有 Cloudflare Tunnel 提供远端操作。

- MCP 地址：`https://awshackthon.huiyuanxp.com/mcp`
- 工作目录：`/home/ubuntu/Alva`
- 权限：`dangerous`，项目写入策略为 `unrestricted`，支持文件读写、命令执行和网络访问。
- 身份验证：OAuth 2.1 + PKCE；Client ID / Client Secret 留空，由客户端动态注册。
- 服务：`coding-tools-mcp.service`，Cloudflare 隧道服务为 `cloudflared-mcp.service`。

`dangerous` 关闭命令权限门禁及文件系统沙箱。直接文件工具仍限制在项目目录内，命令则拥有服务用户 `ubuntu` 的系统访问权限。

## 现役凭据来源

`coding-tools-mcp.service` 当前通过 `EnvironmentFile=/home/ubuntu/aws-hackthon/.mcp-runtime/server.env` 加载配置。授权页面密码只以该文件中的 `CODING_TOOLS_MCP_OAUTH_PASSWORD` 为准；该值属于私有运行配置，不复制到 Git、Ticket、交接文档或日志。

2026-09-22 已删除旧密码副本 `mcp-login-password.txt`、`config.json` 和 `connection.txt`，不得重建。遇到 `invalid password` 时，应核对 `server.env` 与当前服务进程环境，并清理客户端旧 OAuth 会话后重新授权，不能从归档文档或历史会话查找密码。

## 旧归档与迁移边界

`/home/ubuntu/aws-hackthon` 全目录已归档，不再作为产品源码、样例、业主数据、验收依据或开发输入。当前唯一保留原因是最小运行依赖：`.venv-mcp` 提供 MCP 可执行环境，`.mcp-runtime` 提供 OAuth 客户端存储和现役 `server.env`。迁移完成前不得删除这两个目录，也不得向旧工程写新功能。

后续应把运行环境和 OAuth 私有配置迁移到 `alva-*` 命名目录，更新 systemd 后验证 MCP 重连，再删除 `/home/ubuntu/aws-hackthon`。迁移是独立运维任务，本次未执行。

## 部署配置

本项目的 systemd 覆盖配置保存在 `ops/coding-tools-mcp/project.conf`。应用配置：

```bash
sudo install -m 0644 ops/coding-tools-mcp/project.conf /etc/systemd/system/coding-tools-mcp.service.d/zz-hackthon-v2.conf
sudo systemctl daemon-reload
sudo systemctl restart coding-tools-mcp.service
sudo systemctl status coding-tools-mcp.service --no-pager
```

撤销项目切换并恢复原有服务配置：

```bash
sudo rm /etc/systemd/system/coding-tools-mcp.service.d/zz-hackthon-v2.conf
sudo systemctl daemon-reload
sudo systemctl restart coding-tools-mcp.service
```
