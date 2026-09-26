# 32: 桌面漫游与输入暂停

**ID:** ALVA-039

**Parent scope:** T11

**Review reference:** R27

**What to build:** 从全屋进入房间，使用键鼠在真实门洞与碰撞限制下漫游。

**Blocked by:** [ALVA-013](06-example-building-views.md), [ALVA-024](17-furniture-transform.md)

**Status:** done

**Execution:** 2026-09-26 由 Lexie 完成。与 ALVA-040 同属 render lane，但全程保持文件隔离：仅新增 `web/src/scene/walkthrough/*`、测试/验收脚本与 `web/src/main.tsx` 最小装配，不修改 ALVA-040 占用的 `BuildingView.tsx`、`SceneView.tsx` 或 `scene/sunlight*`。两轮验收通过后集成 main。

- [x] WASD前后/横移与鼠标视角有效，墙和家具阻挡、合法门洞可通过。
- [x] 输入框聚焦、Esc、失焦均立即清空移动状态，恢复后不自动滑行。
- [x] 全屋/房间导航可返回，保留桌面实测截图和控制台结果。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `render`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## Implementation handoff · 2026-09-26 · Lexie

实现完成：新增 `web/src/scene/walkthrough/collision.ts` 和 `WalkthroughController.tsx`。在确认建筑存在的真实 walk 路径中，控制器统一接管 BuildingView 暴露的 camera/renderer：Pointer Lock 进入，WASD/方向键前后与横移，鼠标相对移动控制 yaw/pitch；输入框/textarea/select/contenteditable 聚焦、Esc、窗口失焦都会立即清空移动状态并退出 Pointer Lock，重新进入后不会恢复旧按键造成滑行。

碰撞使用权威 SceneData：墙体按线段厚度 + 人体半径阻挡；只有 floor-level、足够宽高的真实 `door` opening 才从对应墙段开通通路，window 不会被当成门；家具使用旋转后的局部矩形 + 人体半径阻挡。房间漫游起点优先房间质心，若被墙/家具占用则在房间 polygon 内搜索最近可行走点，避免从 BuildingView 外部总览位置开始漫游。

真实集成中还发现 BuildingView 可能因 React 更新替换 `building-canvas/alvaView`。控制器因此每帧监测当前 host + alvaView 实例；一旦被替换就清理旧 camera/canvas 监听并重新绑定新实例、重新设置可行走起点。漫游激活时拦截 3D 构件 pointerup 选中，避免一次点击同时触发构件选择而破坏 Pointer Lock。未修改 ALVA-040 的 BuildingView/SceneView/日照文件。

第一轮验收：`tests/alva-walkthrough.test.ts` + ALVA-013 building-view 回归共 7/7 通过；覆盖墙/旋转家具阻挡、真实门洞可过、窗不通行、WASD/方向键/yaw/横移、房间可行走起点与房间/总览基础回归。TypeScript、production build、`git diff --check` 通过。证据：`evidence/20260926T1324Z-ALVA039-round1/result.json`。

第二轮验收：临时安装 Playwright Chromium 到 `/tmp/alva039-pw`（未改项目依赖/生产服务），真实监听 `127.0.0.1:43139` + 隔离 PGlite + production assets。真实桌面 Chromium 验收：Pointer Lock=true；WASD 相机实际位移 0.181m；浏览器 mousemove 相对量改变 yaw；实时碰撞 wall=false / door=true / furniture=false / free=true；输入框聚焦、window blur、Esc 均清空移动且之后无漂移；房间视角进入与总览返回成功；console errors=[]。保留桌面截图 `walkthrough-desktop.png`、`console.json` 与 `result.json`。证据：`evidence/20260926T1324Z-ALVA039-round2-final/`。


### Latest-main re-acceptance · 2026-09-26

在个人实现后同步并合入最新 main（含 ALVA-066/067 的 Stage MCP、room styles、chat progress 等大量 UI 改动），仅 `web/src/main.tsx` 出现入口冲突；以最新 main 为基线完整保留主线功能，仅重新加入 `WalkthroughController` import、building walk 装配和漫游帮助文案。合并后再次通过第一轮 7/7、TypeScript、production build、`git diff --check`。

合并后真实 Chromium 第二轮再次通过：Pointer Lock=true，WASD 实际移动 0.0969m 后受家具安全边界阻挡，mouse yaw 改变；碰撞 `wall=false / door=true / furniture=false / free=true`；输入框聚焦、window blur、Esc 均清空移动且无漂移；房间视角进入和总览返回成功；console errors=[]。合并后证据：`evidence/20260926T1324Z-ALVA039-round2-merged/`（`walkthrough-desktop.png`、`console.json`、`result.json`）。


### Post-ALVA-040 final acceptance · 2026-09-26

ALVA-040 昼夜/季节与最新 BuildingView 已完成并合入 main 后，再次同步主线并复验 ALVA-039。由于 BuildingView 每帧运行 OrbitControls，本票最终采用“更新 OrbitControls target”维持第一人称 yaw/pitch，而不是直接与其 camera rotation 竞争；相机移动时 target 同步跟随，因此日照/季节渲染与漫游可共存。Pointer Lock 重新进入的浏览器验收改为直接请求当前 canvas，避免 sticky header 对自动化点击造成假失败。

最终第一轮仍为 7/7，TypeScript、production build、`git diff --check` 通过；最终真实 Chromium 第二轮结果：Pointer Lock=true、WASD 实际位移 0.700m、mouse yaw changed=true、`wall=false / door=true / furniture=false / free=true`，输入框聚焦/失焦/Esc 均清键且无漂移，房间/全屋返回成功，console errors=[]。最终证据：`evidence/20260926T1324Z-ALVA039-round2-post040/`。


### Post-ALVA-029 final-main acceptance · 2026-09-26

在 ALVA-029 布局复核定位与 ALVA-040 昼夜季节都进入最新 main 后，再次同步并解决 `main.tsx` 单点冲突：完整保留 `reviewLocation/reviewFinding`、room styles、Stage MCP/Chat 等主线功能，只重新加入 WalkthroughController import、building walk 装配与帮助文案。最终第一轮 7/7，TypeScript、production build、`git diff --check` 通过；真实 Chromium 第二轮：Pointer Lock=true、WASD 实际位移 0.340m、mouse yaw changed=true、`wall=false / door=true / furniture=false / free=true`，输入聚焦/失焦/Esc 无漂移，房间/全屋返回成功，console errors=[]。最终主线同步证据：`evidence/20260926T1324Z-ALVA039-round2-post029/`。


### Main integration-state acceptance · 2026-09-26

ALVA-039 squash 进入最新 main 暂存区后再次执行最终验收：第一轮 7/7，`npm run check`、production build、`git diff --cached --check` 通过；真实 Chromium 第二轮 `Pointer Lock=true`、WASD 实际位移 0.2539m、mouse yaw changed=true、`wall=false / door=true / furniture=false / free=true`，输入聚焦/失焦/Esc 无漂移，房间/全屋返回成功，console errors=[]。主线集成态证据：`evidence/20260926T1324Z-ALVA039-round2-main/`。
