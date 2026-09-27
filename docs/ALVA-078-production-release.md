# ALVA-078 生产发布收据

用户明确授权“开发完成，直接部署上线”。2026-09-27 15:31 UTC 发布固定 main `3542aaab78ec21514eeca5752f6b73f7c2460107`，地址 https://prod.huiyuanxp.com 。

全局 Home/Room Vision 苹果风格组件、每段最多四题/逐题回答、一次 Submit 汇总发送主 Chat 并通过生活 MCP 生成下一段、移除旧家具侧栏一起上线。173个源码与配置文件和最终验收 manifest 一致；沿用已验证构建。

## 发布和回滚

- release：`.runtime/20260927T153116Z-ALVA078-production/release/`。
- 服务覆盖：`/etc/systemd/system/alva.service.d/ALVA078-release.conf`；应用/隧道/MCP 配置及业务密钥不变。
- 停服后备份数据及上传：`.runtime/20260927T153116Z-ALVA078-production/data.tar.gz`，归档可读取校验通过。
- 回滚：`bash .runtime/20260927T153116Z-ALVA078-production/rollback.sh`，移除078覆盖并恢复077服务；脚本语法已校验。保留原数据库，不自动覆盖用户发布后新数据。
- 私有环境及此前 service drop-ins 均有备份。

## 验证边界

本地与公网 health 200，真实 Chromium 登录页加载正常、页面错误0，公网 JS/CSS SHA256 与发布构建一致。证据：[结果](../evidence/20260927T153116Z-ALVA078-production/result.json)、[页面](../evidence/20260927T153116Z-ALVA078-production/public.png)。

生产没有可用验证码/已登录会话，登录后交互复验 pending；未修改验证码、提交问卷或采用设计。完整8项浏览器、6项真实Chat/MCP、12项回归及类型/构建已在隔离环境通过，详见[功能合同](ALVA-078-vision-template.md)。

探针最初 Node/APIRequest 访问公网返回403，改用真实浏览器请求后通过；第一次跨进程传输完整资源字节导致探针堆内存不足，改为浏览器内计算SHA256后通过，生产服务未受影响。

## neat-freak 收尾

代码 verified-current；运行态公网表面 verified-current、登录后 pending；文档 changed-and-verified；AGENTS 单一规则 verified-current；生成记忆和远端同步 out-of-scope；工作区 verified-current（备份、Worktree和复核现场保留，未做破坏性清场）。既有 Vite bundle 提示未处理。NextTask 已覆盖，不自动启动050/051。
