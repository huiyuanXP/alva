# 42: 最终回归：编辑、保存、交付、桌面

**ID:** ALVA-049

**Parent scope:** T15

**Review reference:** R38

**What to build:** 在同一最终功能代码上跑完验收第5–8组并补齐所有保留UI证据。

**Blocked by:** [ALVA-047](40-group-proposals.md)

**Status:** done

**Execution:** 2026-09-26 由 lzy 认领，在独立 Worktree `task/ALVA-049-lzy` / `/home/ubuntu/Alva-worktrees/ALVA-049-lzy` 实施；ALVA-047 已在 main 集成。

- [x] 家具/用途/受控墙改/合并拆分、版本回退与导出逐项覆盖，含故障和越权负例。
- [x] 漫游、碰撞、光照、焦点在理想机器上真实浏览器验证，控制台error为0（登录前预期的 session 401 已单独分类，未发现非预期 error）。
- [x] 逐个保留UI映射测试/截图、八组汇总无漏项；不删除测试或放宽断言。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `acceptance-scene`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## 完成记录

2026-09-26：lzy 在独立 Worktree 完成最终回归。使用独立 Cloudflare 通道和真实 Chromium 完成验证码登录、保存前复核、历史只读预览/明确恢复、交付包下载、全屋三维、漫游入口、日照滑块、房间用途确认、房间锁定和家具复制；交付包及页面截图保存在 `evidence/ALVA049-cloudflare/`，结果中未记录验证码或通道地址。

验证结果：`npm run check` 通过；`npm run build:alva` 通过；第 5–8 组相关自动化测试 102/102 通过；Cloudflare smoke 通过，page error 0，非预期 console error 0。旧家具夹具已按现行碰撞和保存前复核规则修正，原有正反断言未删除或放宽。

本票唯一产品修复：家具复制不再固定偏移 0.4 米导致重叠，前端会在当前房间寻找合法位置；无合法位置或服务端拒绝时明确提示，服务端碰撞校验继续作为最终约束。
