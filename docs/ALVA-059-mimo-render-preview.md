# ALVA-059 MiMo 候选渲染预览

2026-09-25 按用户要求检查 ALVA-056 结果并建立公网预览。ALVA-056 已由 `b6575bf` 集成 main；个人实现 `fbfe8e8` 是 squash 来源，不要求它成为 main 祖先。本次预览源码为 main `6182402`，没有对原票重复 merge，也没有修改生产服务或数据。

MiMo Pro 的成功输出来自一次显式纠错 run `20260925T075949811Z-ALVA056-mimo-1947ac`：26 墙、5 房、12 门窗，通过 JSON、schema、几何、确认拓扑和三类诊断。模型耗时 554.416 秒。它不是首轮成功，也不是已校准、已确认的设计；原图为 `references/room-study-handoff/public/floorplan.png`，不是最新标注截图的未标注原图。完整测试和失败记录见 [复测说明](MIMO-VISION-RETRY.md)。

从 main 建立隔离的 `.runtime/worktrees/ALVA-056-render-preview`，独立数据库在该 Worktree 的 `.runtime/preview-data`，使用构建后的现役 web 和 api，不连接生产数据库。候选数据直接取成功 run 的 `parsed-object.json`，经 `validateScene` 再载入；图像按原附件载入。浏览器可切换平面、全屋和漫游；全屋视图是产品对识图场景的确定性 3D 渲染，不是另一次建筑生成模型调用。

运行态：用户级 `alva-mimo-preview-app.service` 监听 `127.0.0.1:4181`，`alva-mimo-preview-tunnel.service` 提供临时公网地址 `https://immune-indoor-coat-pose.trycloudflare.com`。预览验证码仅在私有 `.runtime/preview-data/access-code`，不入 Git。Quick Tunnel 地址和可用性是临时的，失效时应从该服务日志取新地址并同步应用 `ALVA_ORIGIN`。预览结束后由协调人停这两个预览单元，再审查保留的证据与 Worktree；不触碰现有 `alva.service`、`alva-tunnel.service` 或 MCP。

验证：隔离前端构建成功，公网 `/healthz` 为 200；Chromium 经公网验证码进入候选页，二维 SVG 含 26 段墙、5 个房间，3D canvas 已渲染，页面脚本错误 0。截图见 [二维](../evidence/20260925T090500Z-ALVA059-mimo-preview/2d.png) 与 [三维](../evidence/20260925T090500Z-ALVA059-mimo-preview/3d.png)。这次验证只覆盖渲染与访问，没有重新调用模型、没有执行完整业务导入 SSE、没有自动确认设计。
