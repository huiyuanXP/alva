# 33: 昼夜季节与地理假设

**ID:** ALVA-040

**Parent scope:** T11

**Review reference:** R28

**What to build:** 拖动时间和季节滑杆，比较实际太阳方向与阴影。

**Blocked by:** [ALVA-013](06-example-building-views.md)

**Status:** done

**Execution:** 2026-09-26（新加坡时间）由 chatgpt-sunlight 完成实施与联合验收；ALVA-066 接入前置已满足，已在同一提交基础上完成真实主 Chat/Gemini MCP 验收。

- [x] 不是仅改背景颜色：不同时间/季节的太阳和阴影实测变化。
- [x] 纬度/朝向/日期等假设可见，估算不宣称现场精确日照。
- [x] 交互状态可重现并提供对照截图，控制台无错误。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `render`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Current implementation boundary

- 署名：chatgpt-sunlight；分支 `task/ALVA-040-chatgpt-sunlight`。
- 工作区：`/home/ubuntu/Alva/.runtime/worktrees/ALVA-040-chatgpt-sunlight`；因当前 MCP 路径工具限制，采用项目内独立 Worktree，依赖/输出/测试数据仍独立。
- 首批范围：`web/src/SceneView.tsx`、`web/src/BuildingView.tsx`、`web/src/scene/` 日照模块、无副作用共享合同及本票测试/脚本/文档。
- ALVA-066 的受控 UI action 与阶段 MCP 已接入；主 Chat、日照视图和回执已在同一验收环境联通。
- 重型任务持有 `.git/alva-heavy-task.lock` 串行执行，CPU80%、内存1200M（浏览器1600M）、Tasks128，并留资源采样；不修改生产或MCP配置。

## Implementation handoff — 独立日照里程碑（2026-09-26，新加坡时间）

最终状态为 **done**；代码已在临时合并工作区完成同 SHA 联合验收，待验收结束后合入 main 并部署。

- 实现：无运行时依赖的 `packages/contracts/alva/sunlight.ts`；两个视图共用日照灯光与投影范围；修正早晚方向和建筑夜间直射；时间/日期更新不重建 renderer 或重置相机；新增真实参数与估算假设读数。算法、限制、路径、恢复步骤见 [实施说明](../../../docs/ALVA-040-sunlight.md)。
- 数学/Three.js 回归：本票 14 项、ALVA-013 既有 3 项；覆盖 7,350 组参数、非法输入、南北半球、北向旋转、昼夜、实际灯光目标与投影相机。最终复核在 `evidence/20260925T192637Z-ALVA040-final-checks-19dc1d/`。
- 类型检查与前端构建通过：`evidence/20260925T192051Z-ALVA040-verified-build-cbbf5e/`。使用当前 tsconfig，未排除旧工程或放宽类型；保留构建的大 chunk 警告。
- 真实 Chromium：`evidence/20260925T192458558Z-ALVA040-browser-110e48/result.json`，13/13 检查通过，页面/控制台错误 0。经真实页面滑杆验证两个视图的日照、阴影和参数恢复；夏季上午/下午/冬季正午的阴影差异像素分别为全屋 17350/20985/39518、建筑 7499/16024/24924。相同参数恢复后画面 SHA-256 一致，项目内容、revision 和快照未改变；剖切/复位保留日照参数。
- 浏览器资源采样：`evidence/20260925T192455Z-ALVA040-browser-final-f6efd3/`，70.48 秒，任务峰值约 1.2GiB，未超1600M。截图已逐项对照参数，并查看全屋晨间、建筑冬季正午和夜间，读数可见、夜间无直射投影。
- 证据边界：使用明确标注的合成 8×6m 房间及确定性构件，不声称真实模型生成、现场测量或生产验收。编译内存中止、浏览器脚本求值失败和第二个合成项目401均保留原始失败 run，并在说明中解释修复；未降低断言或修改认证。
- 不改 ALVA-057/066/029 的共享文件、生产服务或配置；已装依赖独立复制，未修改 package/lock。生产进程只读复核仍为 `MainPID=478524`，启动时间 `2026-09-25 13:57:12 UTC`。

验收完成：真实主 Chat/Gemini MCP 调用、工具回执、房间聚焦、日照读数、剖切/完整墙体、房间视角、总览复位和刷新重载均已核对。
