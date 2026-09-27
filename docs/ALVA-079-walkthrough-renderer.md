# ALVA-079 漫游复用全屋渲染

Status: done（已验收、集成并发布480b8c5；登录后生产复验pending）
Owner: codex-walk

用户要求 Walk Through 与 Whole Room 使用同一门窗渲染，能够穿门跨房间。

## 实现

根因是主入口在漫游模式且存在建筑结果时切换到 BuildingView；建筑构件可能是没有开洞的整块墙，而全屋 SceneView 已依据权威拓扑切分门窗。现在主工作区全屋与漫游均使用 SceneView，门窗洞口、窗台、门楣、透明玻璃、家具、样式和日照共用。

WalkthroughController 绑定 scene-view，复用既有拓扑碰撞及安全起点；移除 SceneView 内重复的输入/轴对齐碰撞实现。只有真实可通行门洞放行，墙、窗及家具仍阻挡。输入框聚焦、Esc、失焦均清空按键；没有 Pointer Lock 不接收移动。房间下拉框保留，BuildingView 继续用于独立建筑/快照展示。

阶段 MCP set_view 扩展 mode=walk，按钮与主 Chat 进入同一入口；沿用精确页面回执与稳定错误合同。Pointer Lock 仍需用户点击场景，不由 Agent 冒称已获得鼠标控制。

## 验收

- API/web/阶段测试分组类型检查、5项碰撞/输入向量/安全起点/UI回执回归、生产构建通过。
- 真实浏览器：建筑结果存在时仍使用 SceneView；全屋和漫游网格顶点一致；门洞和窗洞无整墙封堵，窗台/门楣/玻璃存在。
- 真实按键从 z=3.4 穿过 z=4 的房门到 z=4.6，再走回；墙、窗和家具阻挡，鼠标环顾、输入暂停、失焦、Esc、房间选择通过，页面错误0。
- 真实主 Chat → living HTTP MCP set_view(mode=walk) → 页面 applied 200，模型工具调用无错误。

证据：[浏览器结果](../evidence/20260927-ALVA079-browser-4/result.json)、[真实MCP回执](../evidence/20260927-ALVA079-browser-4/real-chat.json)、[穿门画面](../evidence/20260927-ALVA079-browser-4/through-door.png)。类型/回归/构建见 evidence/20260927T154410Z-ALVA029-alva079-check-423463/。

失败run独立保留：browser-1因PGlite默认WASM编译内存超限，browser-2几何比较包含每次构建随机Shape UUID（修正为真实顶点/索引比较），browser-3多进程Chromium超出20%内存预算。browser-4沿用项目低内存WASM及单进程Chromium，配额不变，全部通过；不把失败算通过。

追加收尾：浏览器脚本与web类型检查通过；全屋视图5项回归（选择不重建、拖动旋转、门窗几何、阴影缓存、日照保持相机）通过，页面错误0，见 [结果](../evidence/2026-09-27T154858172Z-ALVA070-browser/result.json)。首轮该回归也因多进程Chromium超内存失败，保留 alva079-final run；单进程重验通过，未修改产品或降低断言。

## Implementation handoff

本票已发布生产，见[发布收据](ALVA-079-production-release.md)。既有Vite >500kB bundle提示仍在；不宣称用户显卡帧率验收。独立工作区与证据保留供复核；验收脚本自己的临时合成数据库按原约定删除。没有读取或修改生产业主数据。

neat-freak：代码/隔离运行态/文档 changed-and-verified；项目规则 verified-current；生产公网表面 verified-current、登录后复验 pending；远端同步和生成记忆 out-of-scope。只读盘点完成，根目录两项既有未跟踪残留保留。无需新增规则或长期记忆。

main集成核验：个人实现 `46d83f8`，全部产品与验收脚本同已验Worktree字节一致；提交范围未包含根既有未跟踪文件。原始日志中的行尾空白及OOM中断采样行按证据保留；产品、脚本和文档空白检查通过。
