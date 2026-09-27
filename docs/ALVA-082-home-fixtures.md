# ALVA-082 全屋家具与卫浴目录

Status: in-progress（产品验收集成；待生产实际布置）
Owner: codex-home

用户要求由当前助手代为布置已有家居项目。现役许可目录缺少投影、电竞和卫浴物件，新增7类原创CC0程序几何：投影仪与矮柜、投影幕布、电竞桌与电脑、厨房水槽灶台柜、洗手台与镜柜、小型玻璃淋浴间、坐便器。均有独立主体/支撑/细节，复用已有尺寸、碰撞、渲染和确认逻辑，不冒充本轮critic生成或实测商品模型。

现有项目读取时刷新到现役许可目录，不改变已摆家具或几何。主Chat/生活MCP通过现有get_furniture_context、propose_changes及generate_furniture_model获得新增资产；直接命令与MCP仍共用业务校验。用户数据、认证、原始户型及实际布置计划仅保存在私有运行目录，不进入Git。

## 验证

- API/web/相关类型检查通过。
- 家具全目录几何边界/细节、critic、取消及范围接续共7项回归通过；前端构建通过，保留既有bundle提示。
- 7类新增物件共21张三视角真实渲染，通过8个以上部件检查、页面错误0。[三视角结果](../evidence/2026-09-27T173226290Z-ALVA082-fixtures/result.json)。
- 真实主Chat→生活HTTP MCP→新增投影/卫浴五类资产两套候选→采用→刷新保持通过，页面错误0。[真实链路](../evidence/2026-09-27T172951675Z-ALVA082-real/result.json)。中间一次工具名称错误已由模型修正，记录保留。

## 实施与交接

`web/src/scene/furniture/home-fixtures.ts`负责新增目录几何，`catalogue.ts`分派；`api/model.ts`是许可资产定义；`store.ts`读取时刷新现役目录。用户项目计划按业务碰撞和门间路径规则检查后，使用已认证生产HTTP业务入口应用，生产现场复核仍待继续。

neat-freak：产品代码/隔离验收verified-current；生产及实际项目布置pending；文档changed-and-verified；规则verified-current；生成记忆和远端推送out-of-scope。复核现场保留。磁盘不足时仅删除逐文件确认与Git权威证据一致的081发布bundle证据副本和本次模型临时插件缓存，原始日志/备份/源证据不变；082发布包只包含应用所需文件。

个人实现`50c32de`；main产品字节与验收manifest逐项一致，当前负责人继续生产布置收尾，不自动开工其他票。
