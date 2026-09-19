# 项目远端访问

当前项目通过本机 Coding Tools MCP 和现有 Cloudflare Tunnel 提供远端操作。

- MCP 地址：`https://awshackthon.huiyuanxp.com/mcp`
- 工作目录：`/home/ubuntu/Alva`
- 权限：`dangerous`，项目写入策略为 `unrestricted`，支持文件读写、命令执行和网络访问。
- 身份验证：沿用现有 OAuth 登录和客户端存储；连接客户端需要完成 OAuth 授权。
- 服务：`coding-tools-mcp.service`，Cloudflare 隧道服务为 `cloudflared-mcp.service`。

`dangerous` 关闭命令权限门禁及文件系统沙箱。直接文件工具仍限制在项目目录内，命令则拥有服务用户 `ubuntu` 的系统访问权限。

## 部署配置

本项目的 systemd 覆盖配置保存在 `ops/coding-tools-mcp/project.conf`。应用配置：

```bash
sudo install -m 0644 ops/coding-tools-mcp/project.conf /etc/systemd/system/coding-tools-mcp.service.d/zz-hackthon-v2.conf
sudo systemctl daemon-reload
sudo systemctl restart coding-tools-mcp.service
sudo systemctl status coding-tools-mcp.service --no-pager
```

此配置将已有远端端点从旧项目切换到本项目。运行程序仍依赖 `/home/ubuntu/aws-hackthon/.venv-mcp`，OAuth 配置及数据库仍位于旧项目的 `.mcp-runtime` 目录；请保留这些目录。项目内不复制登录密码、令牌或 OAuth 数据库。

撤销项目切换并恢复原有服务配置：

```bash
sudo rm /etc/systemd/system/coding-tools-mcp.service.d/zz-hackthon-v2.conf
sudo systemctl daemon-reload
sudo systemctl restart coding-tools-mcp.service
```
