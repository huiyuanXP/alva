# Codex CLI：New API 默认路由与 MiMo profile

2026-09-25 已应用并验证。作用于 Ubuntu 用户的 `/home/ubuntu/.codex`，安装版本为 `codex-cli 0.155.1`。未升级 Codex、修改应用源码、重启服务、注销登录或改写认证存储。

## 使用

```bash
# 默认：New API，使用当前 Codex 自带模型目录及默认模型。
codex

# MiMo profile：默认 Pro；模型选择目录只含 Pro 和 Flash。
codex --profile mimo
codex --profile mimo --model mimo-v2.6-flash
```

两条路由均请求 `https://chat.huiyuanxp.com/v1`，通过 `env_key = "NEWAPI_KEY"` 读取已在用户 `.bashrc` 导出的密钥。配置只存变量名，不复制有效密钥，也不依赖 ChatGPT 网页登录。

本次原生 `model/list` 返回五个可见模型：`gpt-6-astra`（当前默认）、`gpt-5.6-sol`、`gpt-5.6-terra`、`gpt-5.6-luna`、`gpt-5.5`。没有把这些名称固定成自定义目录；以后目录及默认值由所安装 Codex 决定。真实默认调用已验证，不代表其他四个原生模型均已逐个推理验收。

## 当前配置结构

Codex 0.134.0 起，profile 位于独立的 `<name>.config.toml`；不使用旧 `[profiles.name]` 或根级 `profile` 选择项。本次配置同时通过安装版本与官网当前 JSON Schema 校验。

`/home/ubuntu/.codex/config.toml` 的相关配置如下，其余原有设置保留：

```toml
model_provider = "newapi"

[model_providers.newapi]
name = "New API"
base_url = "https://chat.huiyuanxp.com/v1"
env_key = "NEWAPI_KEY"
wire_api = "responses"
requires_openai_auth = false
supports_websockets = false

[model_providers.mimo]
name = "Xiaomi MiMo via New API"
base_url = "https://chat.huiyuanxp.com/v1"
env_key = "NEWAPI_KEY"
wire_api = "responses"
requires_openai_auth = false
supports_websockets = false
```

根级 `model`、`model_catalog_json`、`model_context_window` 已移除：不把默认模型固定为 MiMo，不让 MiMo 的专用目录或上下文窗口污染原生模型。已有推理偏好、搜索设置、项目、hooks、其他 provider 和权限配置未改。

`/home/ubuntu/.codex/mimo.config.toml` 的相关配置：

```toml
model = "mimo-v2.6-pro"
model_provider = "mimo"
model_catalog_json = "/home/ubuntu/.codex/model-catalogs/mimo-newapi.json"
```

其余原有 profile 设置保留。新目录从原目录保留完整模型元数据，但只收录 `mimo-v2.6-pro`、`mimo-v2.6-flash`。原五模型目录没有删除，也不再被这两条现役路由引用。网关 `/models` 还列出 `mimo-v2.5-pro`，本 profile 不列出它。

模型目录是选择器和默认行为配置，不是服务端授权白名单。显式 `--model` 等配置覆盖仍可能指定目录之外的模型；要求不可绕过的两模型限制时，应使用网关侧限制模型权限的专用凭据。本次未修改共享 NEWAPI_KEY 的服务端权限。

## 环境边界

普通 Ubuntu 登录 shell 从 `.bashrc` 继承 NEWAPI_KEY，并使用 `~/.codex`。设置了 `CODEX_HOME` 的进程会读取另一套配置；本次发现 MCP 进程使用独立的运行目录，不应把它的配置/历史认证状态误当成普通终端状态。

需要从 MCP 明确验证本次用户终端配置时使用：

```bash
env -u CODEX_HOME HOME=/home/ubuntu bash -ic 'codex --profile mimo'
```

非交互自动化应通过自身环境注入 NEWAPI_KEY，并明确 CODEX_HOME；不能假定非交互 Bash 一定加载 `.bashrc`。本次没有修改 MCP 的 EnvironmentFile、独立 Codex home、应用模型路由或任何 systemd/Tunnel 配置。已启动的 Codex 会话需要退出后重新启动，才能可靠加载新的启动配置。

## 验证与回滚

独立暂存配置完成三次真实 Codex `/responses` 请求，退出码均为 0，且返回精确预期文字：默认路由、`--profile mimo` 的 Pro、`--profile mimo --model mimo-v2.6-flash`。均在空临时目录以只读 sandbox 执行，无业务输入，不调用工具。

应用后重新读取原生有效配置及模型列表，并验证落盘文件与通过测试的暂存配置相同（profile 的目录路径规范化后比较，模型目录字节相同）。随后再次通过用户实际 home 执行 `--profile mimo`，返回 `CODEX_LIVE_OK`，退出码 0。

一次探索性的顶层 `--profile mimo app-server` 初始化检查超时，没有计为通过；最终 profile 运行验收采用实际受支持的 `codex exec --profile mimo`。不把该探索性调用当作配置失效或已通过的证据。

脱敏验收记录：`evidence/20260925T035918Z-codex-newapi-mimo/`。本次只验证 CLI 路由、认证、目录及简短真实文本响应；没有运行户型识图、重新验收 ALVA-056、修改产品 Ticket 状态或部署应用。原有未提交产品成果保持原样。

原配置备份位于：

```text
/home/ubuntu/.codex/backups/newapi-mimo-20260925T035918Z/
```

其中 `config.toml`、`mimo.config.toml` 是改动前副本，`original-model-catalog.json` 是原目录备份。需要撤销时恢复前两份配置并重新启动 Codex；原目录原位置保留，因此无需删除新目录或恢复认证信息。备份和操作脚本均位于私有目录，不含 Git 中的有效密钥。

## 官方依据

- Advanced configuration / Configuration profiles：`https://developers.openai.com/codex/config-advanced/`
- Authentication / Alternative model providers：`https://developers.openai.com/codex/auth/`
- Configuration reference：`https://developers.openai.com/codex/config-reference/`
- 当前 JSON Schema：`https://developers.openai.com/codex/config-schema.json`
- 安装版本 Schema：`https://raw.githubusercontent.com/openai/codex/rust-v0.155.1/codex-rs/core/config.schema.json`

知识收尾：运行配置与文档 changed-and-verified；产品代码/生产发布 out-of-scope；现役项目规则保留；生成记忆 out-of-scope；旧工作树及他人未提交内容保留。原有 bubblewrap PATH 提示由 Codex 自带 bubblewrap 回退处理，本次未安装系统软件或更改 sandbox 权限。
