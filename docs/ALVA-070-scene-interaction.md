# ALVA-070 三维视图与相机交互

2026-09-27：已发布生产；健康、公网资源和实际家具截图通过，登录复验待有效验证码。[发布收据](ALVA-071-production-release.md)为最新运行状态，下方保留实施时的验收记录。

用户授权：主三维使用 SceneView，门窗按拓扑开洞，选择物品不重置视角，普通拖动不误选。

原因：主入口有建筑结果便渲染 BuildingView；其墙体为整块盒子，pointerup 无拖动过滤，selected 是场景重建依赖。SceneView 同样将 selected 作为重建依赖。

实现：常规 3D 使用 SceneView；ALVA-079 已将主漫游也统一到 SceneView（上线状态见当前交接）。以下为070历史验收。选择轮廓独立更新，不重建 renderer；家具或样式变化保留同房间相机位置/目标，显式切换房间仍聚焦。普通拖动始终旋转，Shift + 拖动选中家具保留移动入口。透明窗玻璃不投整块实心阴影，使用 0.02m 法线偏移减少表面自阴影毛刺，阴影仅在几何、光照或家具拖动时重算。

本票是既有视图交互修复，无新增业务工具；原有阶段 MCP 视图、房间、日照指令继续经过主入口。

## Implementation handoff

分组类型检查（现役 web 及浏览器验收脚本）、构建、日照/视图回执/漫游相关回归 19/19 通过。实际浏览器验证确认建筑存在时仍使用 SceneView，点击选中保持 renderer/camera，拖动已选家具旋转且不写入家具坐标，门窗切洞及窗台/门楣保留，透明玻璃不投实心阴影，日照变化保留相机。

失败记录保留：完整类型检查三次触及既有 alva066 共享 slice 内存上限（137），后改用既有 alva029 分组检查，不提高资源配额。浏览器首两轮测试相机矩阵尚未更新导致投影点击坐标过期；下一轮碰到 tsx 的 __name 浏览器注入问题；脚本类型检查纠正合成家具字段后重验。最后一轮日照相机断言遇到 2e-16m 的浮点差异，改为 1e-9m 精度比较后重验；不允许可感知的视角偏移。上述失败均不冒充通过。

不宣称已完成用户显卡上的帧率或所有阴影边缘视觉验收；软件 Chromium 用于功能验证。070实施时漫游及快照建筑展示仍保留 BuildingView；主漫游随后由 [ALVA-079](ALVA-079-walkthrough-renderer.md) 替换，快照独立展示仍保留。未发布，生产固定 release 不变。

neat-freak：代码/验收/文档 changed-and-verified；规则 verified-current，无新规则；生产 pending；生成记忆 out-of-scope。独立 Worktree 与证据保留供复核，不清理其他任务或根残留锁。

最终浏览器证据：[五项通过、页面错误0](../evidence/2026-09-26T183246908Z-ALVA070-browser/result.json)、[画面](../evidence/2026-09-26T183246908Z-ALVA070-browser/scene.png)。分组类型/19项回归/构建记录在 `evidence/20260926T183101Z-ALVA029-alva070-final-275281/output.log`；该组合run最后的严格浮点断言失败由 `evidence/20260926T183235Z-ALVA029-alva070-browser-final-276013/result.json` 单独重验闭合。既有 >500kB bundle warning 保留。

状态 done；负责人 codex-scene；个人实现 `c8db08d`，分支 `task/ALVA-070-codex-scene`。main squash 集成已核对产品文件与已验候选字节一致，未发布。原始Vite输出的3处行尾空格按证据原样保留，产品/脚本/文档空白检查通过。
