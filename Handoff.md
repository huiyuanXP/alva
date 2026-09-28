## 2026-09-28 ALVA-087 已验收集成，发布准备中

Chat 与页面写入状态已拆分，忙时问卷/家具拖拽可用；段末忙时只保存，保留显式发送按钮，空闲不自动补发。家具建议按绝对目标合并到最新场景，真实冲突才拒绝。23项相关回归、类型/构建、5项合成浏览器和4项真实主Chat/HTTP MCP通过，页面错误0。见[并发合同](docs/ALVA-087-chat-concurrency.md)。个人实现 `a65d8e6`；生产尚为082，正在准备备份和固定release。

## 2026-09-27 ALVA-084 已完成并启用

开发截图通过统一查看入口即用即删；其他验收产物保留24小时，每小时自动清理。13个近期浏览器脚本已接入新目录，424个main二进制验收文件移出跟踪。首轮成功清理121817文件、约1.57GiB，可用约32G；生产健康，应用仍为082。GitHub已同步实现并确认现役生产SHA可恢复，代码靠Git，数据备份独立。详情见[保留与回滚合同](docs/ALVA-084-artifact-retention.md)。

本票释放认领，无后续自动开工。历史分支跟踪证据、未安全识别的旧目录及数据备份未自动删除。neat-freak已同步，生成记忆out-of-scope；不把这些保留项误报为全部清空。

## 2026-09-27 ALVA-085 非商业许可证完成

项目原创内容采用根目录 [LICENSE](LICENSE)：允许非商业学习、教学、研究及个人/家庭自用，允许保留许可的免费分享和修改；商业服务、商业集成、企业业务内部使用及客户交付须另获书面授权。第三方许可保持独立；不将本项目称为 OSI 开源项目。README 与 npm 根包/锁文件许可元数据已同步。

个人实现 `66aabfb`，main 集成包含本交接。JSON解析、元数据一致性、README链接、第三方文件未变和diff空白检查通过；纯许可/文档变更，无需业务构建或MCP验收。

neat-freak：许可元数据/文档 changed-and-verified，规则 verified-current；业务代码、生产部署及生成记忆 out-of-scope；没有本票验收临时产物。原有未跟踪文件与Worktree保留，未执行清场；本轮未推送远端。

## 2026-09-27 磁盘占用复盘完成

详见[ALVA-083占用复盘](docs/ALVA-083-storage-cleanup.md)：清理后仍有外部开发worktree约15G、主项目.runtime约9.9G、停用旧部署约7.1G。主要增长来自每票重复依赖、验收副本/截图与无轮换全量备份；现役数据约708MiB。共享依赖、验收保留期、分层备份和容量告警均为建议，尚未实施。下一步按用户选择实施优化；本轮只分析，未继续删除或开工其他票。

## 2026-09-27 ALVA-083 清理完成

磁盘满导致上传/项目切换失败，现已释放约30G，可用30G、使用率62%。删除指定Saved v3合成项目及demo1，其余8项目state哈希不变；默认登录项目改为test1。删除6个已合并干净worktree/分支和未运行开发区重复依赖，重用这些开发区需重新安装依赖。生产仍为082，服务及公网健康、上传目录写入通过；现存验证码401，登录上传端到端复验未完成。详见[清理收据](docs/ALVA-083-storage-cleanup.md)。

下一步：用户刷新后可在保留项目重试上传；旧备份/验收副本/有修改工作区仅列候选，未自动删除。没有新票认领，不自动开工其他票。neat-freak已同步，生成记忆out-of-scope。

## 2026-09-27 ALVA-082 已发布并完成全屋布置

17:35 UTC发布固定main `327adf3`；新增7类投影、电竞、厨房与卫浴许可几何。176项产品文件与验收一致，公网健康及资源哈希通过。用户授权的29件家具已通过认证业务入口应用，三个卧室用途已确认；生产平面/3D显示及刷新保持通过，页面错误0，原建筑/拓扑/保存版本不变，未额外创建快照。见[发布收据](docs/ALVA-082-production-release.md)。

此前缺验证码的登录复核限制已在本票解除。neat-freak已同步，临时会话撤销；备份/回滚与复核现场保留。生成记忆/远端推送out-of-scope，既有bundle提示保留。082完成，无后续认领；050/051及其他票不自动开工。以下为历史检查点。

## 2026-09-27 ALVA-081 已发布

17:09 UTC发布固定main `e4755c0`：家具生成使用精简许可资产/房间上下文与明确参数，工具失败能修正，空结果原会话有限纠正；不再以配色代替家具。真实多房间两套候选→采用5件家具→刷新通过，页面错误0；最终类型/回归通过。175项产品文件与验收候选一致，公网健康、登录页和资源哈希通过。见[发布收据](docs/ALVA-081-production-release.md)。

刷新后可点击“继续生成家具候选”，无需重新确认范围。当前环境没有有效生产验证码，登录后复验pending；未代用户采用家具或保存。neat-freak已同步；备份、回滚及复核现场保留。生成记忆/远端推送out-of-scope；050/051及其他票不自动开工。以下为历史检查点。

## 2026-09-27 ALVA-080 已发布

16:34 UTC发布固定main `1993a77`：确认范围后接续原始需求，经主Chat/生活MCP生成家具候选；旧已确认未生成范围可继续，失败可重试，采用后刷新主场景。174项源码/配置与已验候选一致；类型、5项回归、5项浏览器和3项真实Chat/MCP通过，页面错误0。公网健康、登录页及JS/CSS哈希通过；缺有效登录会话，生产登录后复验pending。见[发布收据](docs/ALVA-080-production-release.md)。

test1用户刷新后可点“继续生成家具候选”，不必重填原始需求；候选仍需用户确认采用，不自动保存。neat-freak已同步，备份/回滚、私有诊断、失败run和复核Worktree保留。生成记忆/远端同步out-of-scope；既有bundle提示保留。050未认领、051仍等待050，不自动开工。以下为历史检查点。

## 2026-09-27 ALVA-079 已发布

15:52 UTC已发布固定 main `480b8c5`：漫游与全屋共用拓扑门窗渲染，真实门洞可通行；主Chat可通过MCP进入漫游。173项源码/配置与已验候选一致，服务健康、公网登录页和JS/CSS哈希通过，页面错误0。隔离环境穿门往返与真实Chat/MCP已验；当前缺少生产验证码/有效会话，登录后复验pending。见[发布收据](docs/ALVA-079-production-release.md)。

neat-freak已同步。用户授权后续开发验收完成后直接部署，无需重复确认；每次仍准备备份和回滚。备份、失败run及复核现场保留；生成记忆/远端同步out-of-scope，既有bundle提示保留。050未认领、051仍等待050，不自动开工。以下为历史检查点。

## 2026-09-27 ALVA-078 已发布

15:31 UTC 已发布固定 main `3542aaa`：Home Vision 苹果风格模板全局复用，每段最多四题、一次 Submit 发送 Chat 并生成下一段，Room Vision 确认弹窗及移除旧家具侧栏已上线。173项源码/配置与验收清单一致，服务健康、公网登录页和 JS/CSS 哈希检查通过，页面错误0。完整真实 Chat/MCP 闭环已在隔离环境验收；缺少现行验证码/有效会话，生产登录后复验 pending。见[发布收据](docs/ALVA-078-production-release.md)。

neat-freak 已同步；备份、回滚及复核现场保留。生成记忆/远端同步 out-of-scope；既有 bundle 提示保留。050未认领、051仍等050，不自动开工。以下为历史检查点。

## 2026-09-27 ALVA-077 已发布并登录后验收

14:49 UTC发布固定main `c053dc6`：问卷先保存，点击Chat下方新按钮后批量读取生成；×与暂不采用不受版本、预览错误或Chat忙碌阻断；新轮替换旧卡，同轮逐张，小预览无日照遮挡。中英文与即时阶段导航保留。

171项源码一致；10项回归、类型/构建、5项浏览器专项、4步真实Chat/MCP与5步阶段导航通过。公网有效登录、中英文入口、阶段往返、资源哈希、用户设计/问卷/候选状态不变通过，页面错误0，恢复原阶段。见[发布收据](docs/ALVA-077-production-release.md)。

neat-freak已同步；本票无待完成发布检查。备份/回滚及复核现场保留，临时验证码已删；生成记忆/远端同步out-of-scope（远端main仍96503ad），既有bundle/窄屏问题未处理。050未认领、051仍等050，不自动开工。下文为历史检查点。

## 2026-09-27 ALVA-076已发布并登录后验收

14:02 UTC发布固定main `0a25f98`。阶段导航不再等待模型Resume/交接；自动Chat期间点击会停止旧回复后切换，蓝色标识当前阶段。生产正常登录owner后英文两阶段4次往返通过（0.5–0.9秒），自动回复中切换1.2秒通过，页面错误0；原thread、设计/问卷/保存版本保持，已回原floorplan。见[发布收据](docs/ALVA-076-production-release.md)。

169项源码、类型/构建、5项回归、5步浏览器与真实Chat/MCP已验。备份/回滚保留，临时验证码已删除。neat-freak已同步；生成记忆out-of-scope，既有bundle/窄屏问题与复核现场保留。050未认领、051仍等050，不自动开工。以下未发布/pending为历史检查点。

## 2026-09-27 ALVA-074 / 075 已联合发布

用户授权后10:09 UTC已发布固定main `96503ad`：中英文界面及Agent输出语言、左右阶段导航和原会话恢复一起上线。169个产品文件与最终验收清单一致；服务健康、公网JS/CSS哈希、真实浏览器中英文切换和刷新保持通过，页面错误0。

当前保存的验证码返回401，登录后生产交互复验pending；未改验证码或生产项目。备份、回滚、失败run及边界见[联合发布收据](docs/ALVA-074075-production-release.md)。生产固定到074075 release，后续main提交不自动上线。050未认领、051仍等050，不自动开工。

neat-freak已同步；生成记忆out-of-scope，既有bundle提示/窄屏溢出及复核现场保留。以下未发布内容为历史检查点。

## 2026-09-27 ALVA-075 已修复并集成，未发布

阶段导航现在同步左侧Chat与右侧生活工作区，右侧入口和左侧按钮共用服务端阶段切换；确认卡读取失败不再阻断阶段更新，往返保留各阶段原thread和历史。二维确认文案明确后续建筑步骤。个人实现d490a7a；类型/构建、8项回归、7项最终浏览器与4步真实Chat/HTTP MCP通过，页面错误0。证据和失败run见[ALVA-075](docs/ALVA-075-stage-navigation.md)。

生产仍固定073 release，本票未发布。074保留原认领，集成时须保留本票导航逻辑并复核共享main.tsx/StageControls；050未认领、051仍等待050，不自动开工。neat-freak已同步，生成记忆out-of-scope，既有bundle警告和复核现场保留。

## 2026-09-27 ALVA-073 集成交接

个人实现a15b2e1已squash集成：系统引导轮仍走原主Chat和当前阶段MCP，不写伪用户原话；assistant guidanceKey保存断点，失败不标完成。get_stage_guidance为API与MCP共用来源，校准后强制inspect_topology，生活阶段强制查问卷并创建/复用当前题卡。未完成断点回退可以再次引导，普通刷新去重。

验收：18项相关回归、最终类型/构建、专项5/5、两轮真实浏览器8步通过，错误0；与最终验收source manifest逐文件相同。详见[ALVA-073](docs/ALVA-073-stage-guidance.md)。生产仍为072固定release，未部署；068预览恢复healthz通过。neat-freak已完成合同/目录/交接同步，生成记忆out-of-scope，复核现场保留。

## 2026-09-27 ALVA-072 已发布生产

用户授权后已发布固定main `30156f7`（08:16 UTC）。顶部项目名可新建/切换，空项目从主Chat附件开始，原数据和验证码保留。发布前数据备份、回滚脚本已准备；服务/公网首页/JS与CSS哈希/未登录API拒绝通过，页面错误0。生产固定到072 release，后续main改动不自动上线；详见 [发布收据](docs/ALVA-072-production-release.md)。

下一步：使用当前验证码登录后，从顶部项目名新建空项目并导入户型图。本机旧验证码401，已请求现行验证码；登录后只读复验pending，未自动新建或切换生产项目。ALVA-050未认领、051仍等050，其余任务不自动开工。

neat-freak已同步发布状态、运维入口、功能票据和交接。生成记忆out-of-scope，备份/失败证据/复核现场保留。以下未发布记录属于当时检查点。

## 2026-09-27 ALVA-072 已验收并集成，未发布

顶部项目名已提供新建/切换入口；新项目为空并从主Chat户型附件开始，旧项目工作稿、保存版本及聊天保留。设备session独立选择，旧标签页请求有项目绑定，设计师/专业邀请固定原项目。当前阶段MCP可列项目及打开同一确认面板，用户点击后才创建/切换。

16项相关回归、类型/构建、真实主Chat→HTTP MCP→页面回执→新建/切回与原thread恢复、独立进程重启、桌面/手机面板通过，页面错误0。详情及失败证据见 [ALVA-072](docs/ALVA-072-project-switching.md)。本票未发布，生产仍为071固定release；068临时预览已按原数据/配置恢复并健康。neat-freak收尾完成，既有bundle警告及主工作区手机横向溢出保留，复核现场保留。

下一步：需要线上使用本入口时，按发布流程备份并切换已验候选，再验证登录/新建/切回。未自动创建生产项目或改验证码。ALVA-050依赖就绪未认领，ALVA-051仍等待050；其他任务不自动开工。

## 2026-09-27 ALVA-070/071 已发布生产

用户授权后已发布固定main `0c52ea0`，包含SceneView交互修复与详细家具生成/三视角critic。服务健康、公网资源哈希及生产真实三视角截图通过；旧验证码失效，登录后只读验收pending，已向用户请求当前验证码。未自动更改设计、采用家具或保存。生产已改由ALVA071-release.conf固定，旧069 release及数据备份可回滚；详见 [发布收据](docs/ALVA-071-production-release.md)。neat-freak已同步，失败与复核现场保留。下方未发布字样均为历史检查点。

## 2026-09-26 ALVA-071 已集成，未发布

家具方块根因为缺少模型数据且渲染器只绘制盒体，现有七类目录已增加程序化细节；生活MCP新增 generate_furniture_model，使用原始需求、简短设计说明及真实三视角PNG进行同会话critic，不通过最多修改三轮，通过才进入用户确认候选。失败回复不能冒称成功，采用不自动保存。36项相关回归、分组类型/构建、详细家具相机交互及真实主Chat→MCP→两轮生成/critic→页面采用/刷新通过，页面错误0。详情、限制与证据见 [ALVA-071](docs/ALVA-071-furniture-models.md)。生产固定release未切换；程序化模型不等同扫描级资产，既有bundle警告保留。neat-freak知识同步完成，Worktree/私有复核现场保留。

## 2026-09-26 ALVA-070 已集成，未发布

主工作区普通3D改为SceneView，按拓扑显示门窗洞口；点击物品只更新选择，不重置相机，普通拖动旋转，Shift+拖动选中家具移动。阴影按需重算并减轻表面毛刺；原建筑漫游保留。分组类型/构建、19项相关回归、5项浏览器验证通过，页面错误0；未做用户显卡帧率验收。详情与失败证据见 [ALVA-070](docs/ALVA-070-scene-interaction.md)。生产固定release未切换，既有bundle警告保留；neat-freak已同步，复核Worktree与证据保留，生成记忆out-of-scope。

## 2026-09-26 ALVA-047 已验收并集成

整组方案现在使用groupId组织同一次生成的真实不同候选；组级预览并排返回每个候选的真实场景、可选目标、周边参考和锁定排除项。组级采用在单一项目事务中只应用所选候选的勾选范围，失败零部分写入，成功后同组选中项accepted、其余rejected；沿用request receipt幂等和预分配newId稳定实例。采用不创建快照，只有手动保存产生存档，显式恢复可回到此前保存版本。

第一轮专项4/4；第二轮typecheck、生产构建及相关扩大回归44/44，0 fail/0 skip。仅保留既有Vite >500 kB chunk warning。未发布生产。

## 2026-09-26 ALVA-046 已验收并集成

参考图家具现在只能从已确认参考偏好进入匹配，并仅返回项目现有许可资产。候选展示资产许可、目录默认尺寸、未实测状态和匹配理由；参考图明确不作为可靠几何。确认时服务端重新校验参考批次、房间和许可候选，通过现有边界/碰撞规则创建全新UUID，并在实例上保留referenceSource；拒绝为scene-noop，无许可资产或自造assetId明确失败。

前端参考图页支持候选比较/确认/拒绝，家具属性页与交付D04继续显示来源、许可、目录尺寸依据和未实测状态。第一轮专项3/3；第二轮typecheck、生产构建和相关扩大回归40/40。额外两条旧家具测试在本票和未修改main均失败，分别为旧保存测试未适配REVIEW_REQUIRED、旧复制坐标触发现行碰撞规则，已记录为既有基线而非046回归。未发布生产。

## 2026-09-26 ALVA-069 已集成，未发布

ALVA-069 左侧对话体验：用户/助手窄气泡、常见Markdown安全渲染、阶段交接专用重试与独立提示已合入main。合并候选分组类型、构建、阶段回归2/2、桌面/窄屏浏览器通过；页面错误0。生产固定release未切换，未发布。详情见 docs/ALVA-069-chat-ui.md。

## 2026-09-26 ALVA-044 已验收并集成

同一手动保存版本现在确定性生成设计师 D01–D10 与业主 U01–U05；designer.docx 为可编辑 Word 正文，owner.pdf、sidecar 与文档均绑定同一 snapshot/version。原话、需求、偏好、痛点、取舍、未决、家具/材料与实现计划分层；专业未知保持未决，只有实际使用过的 BG citation 进入业务指导来源；交付不宣称施工图、BIM 或工程批准，旧金额类范围内容不进入人类文档及对应 sidecar 投影。

第一轮相关回归 14/14；第二轮 typecheck、生产构建与扩大回归 40/40；真实 ZIP 生成复验含 DOCX、PDF（6页）、高清平面图、全屋/房间截图、scene、sidecar、manifest，version=1 一致且金额类文本扫描 0 命中。仅保留既有 Vite >500 kB chunk warning。未发布生产。

## 2026-09-26 ALVA-034 已验收并集成

空间合并现在先提供新边界、新房间ID、来源关系和门窗连续性预览；问卷或房间样式冲突必须明确选择来源，锁定房间/回答不会被静默解除。确认后在同一事务中迁移家具、问卷、原话、findings、user context、分区、用途、scope、Home Vision、样式、参考图及Chat action等房间引用，建立新拓扑版本并作废引用旧房间ID的建筑3D；交付D03/D06与sidecar保留合并来源。

第一轮专项4/4通过；过程中发现并修复确认参数误传严格preview schema导致400的问题。第二轮类型检查、生产构建与27/27扩大回归通过，0 fail/0 skip；仅保留既有bundle体积警告。合并前后快照可恢复且旧roomId无悬空引用。ALVA-035继续依赖就绪。未单独发布生产。

## 2026-09-26 ALVA-068 已生产发布并复验

用户授权发布已完成：固定main `6eef743`，08:30 UTC上线。公网资源与已验构建一致、有效登录、当前floorplan实际inspect_topology、独立问卷入口通过，最终只读复验设计/问卷/候选/保存状态不变，页面错误0。生产当前处于户型阶段，未替用户确认建筑；生活问卷确认同步以本票隔离真实链路验收为据。

生产现由ALVA068-release.conf固定到私有release目录，main后续提交/构建不会自动发布；To Do List仍读取main。备份、回滚、失败run与验收边界见[发布收据](docs/ALVA-068-production-release.md)。068临时预览已恢复，CPU80%/总内存20%/swap0；旧066应用仍停止。其他票状态不因发布自动改变。

neat-freak已同步代码、运行态、合同和文档；生成记忆out-of-scope，备份及私有复核现场保留。以下带未发布字样的旧检查点为当时状态，以本节及发布收据为准。

## 2026-09-26 ALVA-068 当前临时预览

用户要求的最新main同步已完成，候选2380658在068 Worktree通过类型/构建、公网登录与Chat页面检查。当前链接 https://chamber-supposed-boring-opponents.trycloudflare.com ，详情见[068预览记录](docs/ALVA-068-outcome-questions.md)。测试项目为合成Alex/Sam，生产未改。

新应用4188与Tunnel共用20%总内存/0swap/CPU80%预算。旧066应用暂时停止，原库和Tunnel保留；不得同时对068预览库运行验收探针。服务、私有配置及证据见专题文档。neat-freak已同步临时运行态；原复核现场保留。

## 2026-09-26 ALVA-030 已验收并集成

专业未知与用户取舍已保持独立：缺少重量/支撑证据时只标专业待核实，用户确认偏好不能关闭专业项；手动保存保留取舍、原始依据和未决状态，业主/设计师可读交付会显式呈现这些内容。两轮正式验收分别20/20与7/7通过，类型与前端构建通过。全量探索回归314/320，6个失败均在本票diff之外（4个既有家具/保存基线，2个缺RENOVATION_MEDIA_FIXTURES）；本票用例在全量中通过。ALVA-044因此依赖就绪。未发布生产。

## 2026-09-26 ALVA-068 已验收并集成，未发布

主Chat先展示未确认的需求猜测、依据与不确定项，再提供具体结果/示例/取舍。确认后同步同一填写者的Home Vision原字段与扩展问答；独立问卷保留，修改后旧扩展结论失效，Chat重读新版本。生活设计MCP为默认入口，错误提供稳定码及修复步骤；确认使用数字版本，不用哈希。

真实主Chat/HTTP MCP三轮及浏览器双向同步通过，最终分组类型检查、26/26相关回归、前端构建与To Do List浏览器检查通过，CPU80%/20%总内存/0swap，无OOM。详情与边界见[ALVA-068](docs/ALVA-068-outcome-questions.md)。新题卡窄栏可用；整个主工作区仍有既有手机横向溢出，bundle警告保留。

068已done并释放占用；057继续ready-for-agent，042与030等保留自身状态，不自动开工。本票未发布生产。neat-freak：代码/文档/票据changed-and-verified，规则verified-current，发布/生成记忆out-of-scope；私有合成现场、失败证据与Worktree保留供复核。

## 2026-09-26 ALVA-029 验收完成并集成

布局复核的对象/门窗/受阻路径定位、保存卡明细与非空用户取舍、布局变化后的旧审查拒绝均已完成。最终71c041e的12步真实Chat/MCP/浏览器联合链通过；40/40相关回归、类型/构建通过。同步040日照主线后的e149155再次通过类型/构建、真实MCP与二维/三维页面检查，错误0。证据与失败记录见[验收报告](docs/ALVA-029-acceptance-audit.md)。029已done，030可认领，不自动开工。066已生产完票；本轮029新增界面未发布。原工作区/私有数据保留，neat-freak已完成知识同步。

## 2026-09-26 ALVA-066 完成并通过生产 MCP 验收

066 已标 done：main集成e44c23a，发布5bb823b（产品c53d3ac）。公网资源、有效验证码登录、生活/户型实际MCP调用、真实工具目录隔离及原thread往返Resume通过。设计数据与保存版本未变，页面错误0，已回到原living阶段。证据与回滚见[生产收据](docs/ALVA-066-production-release.md)。

下一步：029/032/040/042/057由各自已署名负责人继续专项接入和验收；066前置及共享入口占用已释放，不再等待066。030仍按029等自身直接依赖计算，不因066完成而自动解锁。已知模型保存状态复述问题继续保留，不能把工具成功等同回复全对。临时预览、备份和复核工作区保留；临时验证码文件已删除。

neat-freak：066代码/生产真实调用/交接 changed-and-verified；其他票验收与生成记忆 out-of-scope。既有bundle警告保留。以下为历史与其他任务记录。

## 2026-09-26 ALVA-066 上下文修复检查点（个人分支）

普通轮次取消完整项目/历史重复注入，真实输入由约 6.7 万降至 2,961 字符；基础约束仍为 thread 配置。修复审查错误的工具指引，增加无业务调用时同 thread 有限纠正及对应回归。类型检查、44/44 相关测试、原 living thread 实际读取→复核→保存卡及浏览器确认 savedVersion=2 通过。失败证据保留，模型此前仍有漏调；不宣称整体可靠性已完成。详见 [ALVA-066](docs/ALVA-066-stage-mcp.md) 最新检查点。

066/029 仍 in-progress，本次未合 main、未发布。下一步须先合并最新 main 的 057/037，再完成同候选联合验收；不能将旧分支直接发布。用户收尾后原持续目标仍暂停，本轮只处理授权的调查修复。

neat-freak：本次代码/合同 changed-and-verified；完整验收、main 集成及生产 pending；生成记忆 out-of-scope；私有现场和历史失败证据保留。共享重任务已结束，锁按 runner 释放。
## 2026-09-26 ALVA-067 已发布并通过公网登录核验

已发布主Chat Gemini 3.8及等待圆点上方的最新浅色进度。类型/构建、本次5组桌面手机浏览器和公网登录只读核验通过；模型接口3.8、JS/CSS哈希一致、页面错误0、项目revision不变。备份与回滚在.runtime/ALVA067-release-20260926T045448Z/；详情见[发布收据](docs/ALVA-067-chat-model-progress.md)。066验收环境未改，仍需同步main并重验阶段MCP。


## 2026-09-26 ALVA-067 主 Chat 模型与进度展示已集成

主Chat已切为 Gemini 3.8 Flash High；保留等待圆点，最新工具进度改为其上方浅色文字，不再进入顶部横幅。类型/构建、17/17回归、桌面/手机与真实Chat工具调用通过；[ALVA-067](docs/ALVA-067-chat-model-progress.md)记录证据及失败run。未部署，066验收工作区未改，须同步main后重跑受影响阶段MCP门禁。

## 2026-09-26 ALVA-057 问卷视觉修订已上线

main `f9fd9ef` 已发布耳麦入口、23 处长题主问句与灰色提示分层、Q06/Q10/Q26/Q32 语义图标。41/41 回归、构建、桌面和手机浏览器以及 Q09 专项截图通过；公网新资源和登录弹窗只读核验通过。收据见 `docs/ALVA-057-questionnaire-release.md`。057 阶段 MCP 联验仍待 066，状态 in-progress。

## 2026-09-26 ALVA-057 英文问卷文案精简已上线

main `23a79da` 已发布：两道双问句合并，99 个选项标签改写为短语或逗号分隔；隔离 41/41 回归、构建与浏览器检查通过，公网新资源和只读弹窗通过。收据见 `docs/ALVA-057-questionnaire-release.md`。阶段 MCP 待 066 联验，057 继续 in-progress。

## 2026-09-26 ALVA-057 界面反馈已上线

main `39bc74f` 已发布：入口缩小并移至左侧栏右上角、流程跳过 Q02、住宅类型语义图标、移除无效单字 Skip、明确自填提示。41项回归、构建、隔离浏览器和公网只读浏览器验收通过；发布收据在 `docs/ALVA-057-questionnaire-release.md`。057 阶段 MCP 联合验收仍待 066，票维持 in-progress。

## ALVA-066 当前检查点：43f4466，继续最终联合门禁

## 2026-09-26 ALVA-057 英文问卷已先行发布

用户明确要求暂时跳过 ALVA-066 门禁，先上线问卷业务。main `817c253` 已集成新版 Your Home Vision 入口、英文题库/Q1 Q5 Q7 母版、条件流程、按人保存及现役 Chat 只读摘要。隔离验收：类型、构建、40/40 回归、7组保存与Chat、6组桌面/手机通过。生产已备份并重启 `alva.service`，公网首页/健康/新版资源200；用户提供的验证码登录后看见新入口和Q01，问卷接口为 `home-vision-v4`，只读开关不改变 revision，页面错误0。证据 `evidence/2026-09-26T020331622Z-ALVA057-questionnaire-public/result.json`；备份 `.runtime/alva057-questionnaire-20260926T020017Z/`。ALVA-066 阶段MCP、持久会话和联合验收仍在原票，ALVA-057 继续 in-progress，由 xuanpu-chat-6pro 保留署名。

066独立Worktree已提交 `43f4466`。原图项目的真实分类→Markdown→复核→页面保存v1/刷新、交付生成中取消及重新生成/ZIP哈希、日照/房间聚焦真实回执均已通过。确认回答自动家具建议发现碰撞失败被冒称无需求，现按实际失败记录拒绝skip，并通过MCP返回尺寸/占地及同校验器验证的位置供模型修复；4/4回归与确认后自动生成待采用候选实测通过，草稿不触发、原场景不变。最新固定源码类型检查通过。

原floorplan thread恢复/仅讨论不清空；页面明确重开后失效旧设计，实际门窗宽度合成修改/校准/拓扑v2确认、现役模型建筑重生成、页面确认并恢复原living thread及立即送达失效摘要已通过。实际用途提案/页面确认和参考图片偏好候选也通过。所有中途失败保留，不拼成尚未完成的最终同候选整票结论。证据详见个人Worktree票内2026-09-25原图项目保存、交付与跨阶段检查点。

下一步在固定候选完成最终联合回归/构建、029分类→Markdown→review→保存和剩余业务门禁，再main产品集成/备份发布及生产验证。066/029仍in-progress；040/057保持各自署名与边界，生产未变。共享heavy锁继续串行CPU80%/1200M/swap0，当前过程检查已结束。

neat-freak：局部实测/类型verified-current，完整交付及生产pending；MCP优先合同verified-current，生成记忆out-of-scope，所有私有现场/失败证据/未完成Worktree保留。

## 2026-09-25 ALVA-066 主 Chat 过程检查点（未完票）

个人提交 `2d6b6cd`，主 Chat阶段MCP、附件/确认卡已接入；36项回归和真实网关旧thread目录更新探针通过，证据位于个人Worktree `evidence/20260925T193202Z-ALVA066-validation-540418/`、`evidence/20260925T193412944Z-ALVA066-harness-8564c7/`。随后样式、UI回执、问卷建议及测试夹具改动尚未检查；后续需先检查修复，不把过程提交当完成。main产品及生产未变。当前066无活跃重任务，029窗口保留，收到其接口/证据后再协作接入。neat-freak仅完成过程事实对齐，整票验收/运行态pending，所有现场保留。

## 2026-09-26 ALVA-040 日照独立实现，阶段接入待066

ALVA-040 由 chatgpt-sunlight 认领并在独立分支 `task/ALVA-040-chatgpt-sunlight` 提交 `7c5129e`。统一两种3D视图的日照与投影，修正早晚方向和建筑夜间直射，时间/日期变化不重建视图；显示真太阳时、日期、纬度、北向和估算限制。17/17回归（含7350组参数）、完整类型检查、前端构建、真实浏览器13/13检查通过，控制台错误0；相同参数画面哈希一致，项目/revision/快照不变。

仍为 **in-progress**：生活设计MCP、主Chat实际调用与UI action回执等待ALVA-066。产品代码和证据只在 `/home/ubuntu/Alva/.runtime/worktrees/ALVA-040-chatgpt-sunlight`，未合入main或部署。工作区内 `docs/ALVA-040-sunlight.md`、单票Implementation handoff与 `evidence/20260925T192458558Z-ALVA040-browser-110e48/` 是本里程碑入口；失败run、编译中止与资源采样保留。未改057/066/029共享入口、生产服务或配置；复核现场保留，不清场。

## 2026-09-25 ALVA-066 运行层过程交接（未整票完成）

个人提交 `e731910`，独立Worktree中实现两阶段HTTP MCP、真实桥接、持久thread/摘要去重、私有附件和共用导入/拓扑/建筑服务。真实修改后Harness两轮独立验收通过，含原thread恢复、错误修复说明和摘要仅注入一次；类型检查及33项定向回归通过，证据见个人票据。main产品未集成/发布，主Chat装配、生活设计/样式/确认UI和完整业务验收继续。029分工/私有Markdown合同已在指定协调目录回复；原057、029、040署名保持。重任务等待脚本已有heartbeat，当前验证已终止成功，不重复启动。

## 2026-09-25 ALVA-066 已认领并完成协议探针

个人工作区 `/home/ubuntu/Alva-worktrees/ALVA-066-codex-stage-mcp`，过程提交 `2bcfa6b`。原生 MCP 目录隔离与 Resume 可用，但真实模型三轮未调用工具，未通过；批准的 dynamicTools→HTTP MCP 桥接三轮实际调用通过，返回户型仍为原 thread。证据和边界见个人分支 ALVA-066 票据；main 产品未改、未发布，整票仍 in-progress。下一步持久阶段 Harness、摘要送达和业务工具接入；057 的未集成业务保持独立。

## 2026-09-25 协调清理与锁到期检查

用户授权提交原错别字和协调整理；024/025/028 过期占用已移除，040 恢复待认领，057 保留。根目录空锁暂留，记录时间 18:49:54 UTC；用户级定时器将于 2026-09-26 06:49:54 UTC 检查无人认领且未被持有的原文件再释放，正式 .git 协调锁不变。053/056 既有验收证据保留提交；neat-freak 复核仅覆盖本次状态与文档，无产品代码或生产变更。

## 2026-09-25 ALVA-066 建票与 MCP 规则更新

新增[两阶段 MCP 票据](docs/ALVA-066-stage-mcp.md)，保留完整用户范围与验收项。AGENTS、主 Chat 合同及任务模板明确 MCP 优先、工具阶段归属、真实附件、服务端确认/失效、可解释错误和 UI 回执。Codex 0.157.0 安装版 schema 与官方文档已核对；真实网关调用和产品实现尚未执行。认领等待开始前已有 AGENTS/NextTask 修改归属确认；原改动与证据保留，未吞并提交。

## 2026-09-25 ALVA-065 主 Chat Agent/Harness 固定

主 Chat 名称、路由、现役模型和基础指令集中到 `api/main-chat-agent.ts`；`api/chat.ts` 仍装配服务端工具，`api/codex.ts` 仍运行每请求临时 Codex App Server thread。后续功能接入合同和任务 Prompt 见 [ALVA-065](docs/ALVA-065-main-chat-agent.md)。本票仅固定现有运行路径及交接规则，未把识图、建筑生成或其余直接按钮接成 Chat 工具。类型检查和 5 项相关接口/指导测试通过。

## 2026-09-25 ALVA-064 生产发布交接

main `4870b0d` 已将 Gemini 3.8 Flash High 设为图片户型识别默认模型，并在生产私有环境显式固定 `OPENAI_VISION_MODEL` 与 high 推理强度；普通聊天仍为 Gemini 3.1 Flash Lite。`alva.service` 已重启，健康、首页和登录后只读项目验收通过，revision 不变、页面错误 0。备份、回滚 Worktree、真实模型回放与边界见[发布记录](docs/ALVA-064-gemini-default-release.md)。本机旧验证码文件不匹配，不应再用于验收；用户提供的有效码只在验收进程内使用，未轮换、未写入仓库。候选准确性待用户对照原图，028 暂停。

# alva Handoff

## 2026-09-25 ALVA-036 完成验收与集成

个人分支 `task/ALVA-036-chatgpt-snapshots`，已确认实现 `6355b3c`，最终验收交接 `7efee97`；main 集成 `eeef89e`，夹具修正 `41bca25`。类型检查、24/24 相关测试、构建、真实 Chromium 8 项流程通过；修正后 main 再跑快照 13/13 与 Chromium 8 项流程，[浏览器结果](evidence/2026-09-25T111249092Z-ALVA036-browser-87f7df/result.json)无提案预览 422、页面脚本及非预期控制台错误。后续 ALVA-064 于 12:15 将包含本票的 main 构建发布到生产，公网资源与本机构建 SHA256 一致，登录后只读浏览器检查通过；生产保存写入未单独验收。正式状态、发布证据和 ALVA-037/038 边界见[单票交接](.scratch/alva-completion/issues/29-manual-snapshot.md)。

## 2026-09-25 ALVA-061 Codex Gemini profile

本机 `~/.codex/gemini.config.toml` 复用现有 `newapi` provider 和 `NEWAPI_KEY`，独立模型目录提供 Gemini 3.6、3.7、3.8 Flash High。`codex exec --profile gemini` 默认 3.8，启动后可在模型设置中选其他两款；三个型号的 `--strict-config` 原生调用均返回 `OK`。详情见 [ALVA-061](docs/ALVA-061-codex-gemini-profile.md)。用户级文件不入 Git；仓库只保存脱敏交接。业务服务与生产配置未改。

## 2026-09-25 ALVA-063 Gemini 同会话平面自查

新隔离 run `20260925T114342944Z-ALVA063-selfreview-d5bf96` 在同一 Codex thread 依次完成生成、修正和仅平面截图自查。新候选 19 墙/5 房/7 门窗；原生输出 schema 失败，隔离字段映射后几何与拓扑诊断通过。模型自评 `mismatch`，报告卫生间和门、主卧墙体及左侧开窗疑点，未自动改候选。项目 Skill 位于非标准目录 `docs/skills/alva-floorplan-self-review/`，由 prompt 显式附入全文。原测试 tunnel 现展示本次新候选，公网二维/3D 验证通过。详情见[ALVA-063](docs/ALVA-063-floorplan-self-review.md)，生产未改，028 继续暂停。

## 2026-09-25 ALVA-062 Gemini 3.8 识图预览

个人实现 `ea3de2c` 当时生成 Gemini 3.8 候选并切换原临时 Tunnel。两轮原始回复都不符合严格 Scene schema；只在隔离预览中映射字段，保留墙、房间多边形和开口几何。映射后 20 墙/6 房/9 门窗通过几何/拓扑诊断；公网二维、3D 与浏览器脚本错误 0 实测通过。运行服务 `alva-gemini-preview-app-v2.service`，MiMo/Luna 数据保留，业务原生导入仍未通过。详情见[ALVA-062](docs/ALVA-062-gemini-preview.md)，生产未改，028 继续暂停。

## 2026-09-25 ALVA-060 Luna 识图预览

个人实现 `8964db6` 已按最新 main 合并验证并集成。已有 `OPENAI_VISION_MODEL` 决定识图模型；新增可选 `OPENAI_REASONING_EFFORT` 透传 Codex App Server，默认行为不变。隔离业务识图一次请求 GPT-6 Luna xhigh，用仓库原图返回 17 墙/10 房/5 门窗，JSON/schema/几何通过，确认拓扑失败；诊断 15 项问题、约 3.35㎡ 未定义空间、4 个墙连通分量。一次请求无自动纠错；未把可渲染误报为合格户型。

同一临时 Tunnel 当时展示 Luna 候选，原 MiMo 数据和截图保留；公网 Chromium 验证二维/3D 可见、页面脚本错误 0。类型检查与 15 项导入测试通过，详见 [ALVA-060](docs/ALVA-060-codex-luna-preview.md)。未改生产服务、数据或模型配置；NextTask 已释放本票署名，其他认领保持。待用户看完再决定是否停预览和清场。

## 2026-09-25 ALVA-020 作用范围澄清与确认

ALVA-020 已由 lzy 在独立 Worktree 完成并合入 main。服务端新增范围确认合同、propose_scope、确认/取消路由和候选预览/采用时的边界复核；前端新增范围确认卡片。真实 Chromium 证据为 evidence/20260925T-ALVA020-real-browser/；类型检查、生产构建和 2 项范围单元测试通过。实现提交 a20b15b，集成提交见当前 main 日志。

## 2026-09-25 ALVA-053/056已完成（当前恢复入口）

ALVA-053诊断修复已集成`97c0ae7`；ALVA-056个人实现`fbfe8e8`在本次main单票集成，Status=done，NextTask当前执行占用已释放。源基线`b34cc23`。本票范围为原生MiMo复测和导入输出合同修复，不是生产全链路或户型测绘准确性验收。

结果：`codex exec --profile mimo`默认Pro的显式一次纠错run`20260925T075949811Z-ALVA056-mimo-1947ac`返回26墙、5房、12门窗，几何/确认拓扑/三类诊断通过。原图、5个房间及门窗数量保留；失败首轮和空模板记录均保留，不报告为一次盲测成功。新增空候选拒绝、中心offset定义、一次纠错来源绑定；识图单次600秒，普通Chat仍120秒，未修改用户profile或密钥。

验证：最新main基线上独立类型检查和36项相关回归通过，0失败/跳过/取消；5轮原始JSONL/回复回放及来源/改动范围核对通过。证据`evidence/20260925T081435Z-ALVA056-final-b68614/`、`evidence/20260925T081726Z-ALVA056-recovery-acceptance/`；主线收据`evidence/20260925T084025Z-ALVA056-integration-3bc356/`。一次扩大校准数据库回归被1500MiB任务上限终止，未计通过；拆分后的最终相关检查无OOM，未放宽断言或任务上限。

保护与边界：本票吸收已备份的原8个056暂存成果及历史说明；AGENTS和其他票改动不夹带，全部Worktree与私有原始结果保留。未部署/重启生产、未改设计或数据库；原生CLI不能替代此前未执行的App Server复试，最新标注截图的未标注原图仍缺。裸用户systemd服务缺NEWAPI_KEY时预检会拒绝，复跑应在既有鉴权的正常用户会话中进行，不能假定任意MCP任务都继承该变量。

下一步：本轮53/56不再占用执行资源；020、036、057等其他任务仍按主目录NextTask原署名推进，028继续暂停。若另行上线，先补生产长时SSE/取消与隔离回归；扩大校准测试应分配独立资源诊断，不据此改业务断言。服务入口沿用127.0.0.1:4173及prod.huiyuanxp.com，既有alva.service启动方式不变。回滚只撤本票集成，不重置主树或删除历史分支。以下同日早期记录按历史时点阅读。

## 2026-09-25 ALVA-053已完成，继续ALVA-056

ALVA-053按诊断维护范围完成并集成，个人实现`17a6308`，总证据`evidence/20260925T064257Z-ALVA053-recovery-acceptance/`。JSON/schema/几何错误统一一次修正，识图显式240秒上限，普通调用仍120秒；PDF与PGlite测试隔离而未删断言。28/28、最终类型检查与历史候选重放通过；MiMo Pro业务动态工具/流式文本通过，Gemini3.8别名文本恢复；原生mimo profile的Flash识图18.663秒通过输出合同，但确认拓扑失败且约22.59m²未定义空间，不宣称户型已正确。

Pro在旧120秒业务时限下超时；240秒App Server复试的提权/环境传递调用被工具拦截未执行，保留未核验边界。原生profile用普通用户、无密钥复制/提权，不能冒充被拦截的业务复试。最新标注截图未标注原图/当前生产样本关联仍缺，未更改生产配置/数据、未部署。

下一步按本轮已有授权执行ALVA-056，改旧探针硬编码v2.5为当前`codex exec --profile mimo`并复测默认Pro；53不再占用共享文件。028仍暂停，057的yang-chatgpt与其共享文件保持不变。原8个56暂存文件/2份文档修改、preview五文件及全部历史Worktree保留；本次独立Git索引不吞并它们。重型任务串行、CPU60%、任务内存模型900MiB/含PGlite和类型1500MiB、Tasks128；初始限额失败留证，最终运行未OOM。回滚仅revert本票集成，不重置工作树。

## 2026-09-25 本轮交接（先读）

目标：服务器重启后检查中断任务、退回pending并保留下一步，不对应旧week/step，不实施产品票。检查main HEAD `5e1513a`；本轮新增恢复提交可由 `git log --grep='重启后待办恢复'` 追溯。

状态：ALVA-053 pending（个人报告88506f2待复核/集成）；ALVA-056 pending（个人0d7ea5f已有真实MiMo结果，主线集成未完成）；ALVA-028未开工且用户暂停，Execution state=pending、Status=ready-for-agent，当前执行占用释放。详细恢复条件在单票与NextTask；不解锁后继、不把旧失败写成当前唯一结果、不把已完成票倒退。

保护：main原8个暂存文件、2份未提交文档；preview的5个未提交文件；21个Worktree及历史负责人/提交全部保留。本次只提交本轮状态/交接/测试预期与脱敏取证增量，不代为集成ALVA-056代码。私有基线及回滚补丁`.runtime/20260925T034733Z-server-recovery-2cae71/`。

服务器：MCP、alva与两个Tunnel均active；本地/公网healthz=alva/ok。9月22日的内存回收/I/O拥塞及网络、SSH失败已有日志；9月25日Power key关机有明确记录，不能证明CPU一直满载或点名唯一肇事程序。事故报告[docs/INCIDENT-2026-09-25-server-recovery.md](docs/INCIDENT-2026-09-25-server-recovery.md)，证据`evidence/20260925T034733Z-server-recovery-2cae71/`。

下一步：优先恢复ALVA-056的现有成果核对与串行轻量验收，随后独立完成集成；需要最新截图结论时先取得未标注原图。ALVA-053先消除路由/样本关联缺口，ALVA-028仍等新开工指令。重型构建/浏览器不得并行争用这台2核3.7GiB且无Swap的机器；限额和历史进程监控尚未实施。未运行真实模型/浏览器/全量构建、未更改服务或密钥、未写生产数据。

本轮验证结果以证据目录`validation.json`及PROGRESS为准。服务启动方式仍`npm run start:alva`/既有alva.service；4173只本地监听，不另起实例写生产库。回滚只撤本轮恢复增量，保留原暂存/未提交补丁；不得重置主工作树。

## 历史交接记录（2026-09-19至22日）

以下按各次记录时点阅读；恢复状态以本页上方、CURRENT及单票2026-09-25记录为准。

当前 44 张产品 Ticket 中，ALVA-008–013、ALVA-014–019、ALVA-043 已完成并集成 `main`。To Do List 仍由 https://prod.huiyuanxp.com/todo 只读展示。

44票均有 Parallel lane；当前依赖就绪为 ALVA-023、028、031、036、041，其中 ALVA-028 已由 yang-chatgpt 认领并按用户要求暂不实施，其余未认领。协作权威入口仍为 NextTask，网页只读展示，不开放网页认领或修改状态。

认领在主目录署名即生效，协调锁内提交；每票独立Worktree/分支及运行资源。同组或共享文件冲突先协调。个人完成提交后不移除署名；main集成验证通过后，同一实现提交更新done、移除任务行和署名、补充所有新解锁任务，保留票内署名及原实现SHA供追溯。

此前已按用户要求完成仓库扁平化。唯一根目录为 `/home/ubuntu/Alva`；后端 `api/`、前端 `web/`、研究 `Research/`，不再有内层 alva 或现役 apps 包装。Git 历史、数据库和附件随原文件保留；结构规范在 [docs/PROJECT-STRUCTURE.md](docs/PROJECT-STRUCTURE.md)。现役启动、构建、导入和 systemd 路径已适配，alva.service 已重启恢复，MCP/Tunnel 配置未改。

首批 ALVA-008–013 仅定义就绪，尚未实施；原T03–T15的剩余细票已正式发布，实施仍待指令。统一验证码和新 Codex 建筑生成仍待后续实施指令，不能把目录迁移说成功能上线。正式票据入口 [.scratch/alva-completion/README.md](.scratch/alva-completion/README.md)。

## 已确认方向与本轮边界

- 持久项目名alva；新仓库 /home/ubuntu/Alva；原完整需求在SPEC和references/initial-task，来源在SOURCES。协作按最新NextTask，允许认领后独立Worktree条件并行。
- `/home/ubuntu/aws-hackthon` 已全目录归档且不使用；Coding Machine MCP 仍临时依赖其中 `.venv-mcp` 与 `.mcp-runtime`。MCP 地址、唯一现役密码来源和迁移边界见 [docs/REMOTE-ACCESS.md](docs/REMOTE-ACCESS.md)，旧密码副本已删除。
- 用户已授权复用旧Tunnel并停旧站点，旧文件保留、MCP不改。本轮仅做路径迁移所需的服务停启与配置适配，不建立生产业务会话、不改变权限或业务数据。
- 用户已明确把公共免验证入口改为统一登录验证码：验证码由用户分发，持有人可重复、跨设备登录当前授权项目；不建设短信或个人账号体系。当前线上仍是上一轮公共owner入口，尚未改为验证码登录，不可误称已限制。
- 用户明确“先发布细化后的Ticket”。验证码在实施ALVA-008时生成并交给用户，本轮没有生成生效凭证或发给第三方。
- 原T01粒度保留，成为ALVA-008；原T02拆成ALVA-009至013：导入识图、墙线修改、门窗/校准、Codex建筑生成、示例视角。
- 用户强调建筑3D生成需要调用Codex。已写入独立建筑生成步骤，区别于已有识图调用和固定Three.js渲染；以确认拓扑为约束生成可渲染构件，校验后显示。
- 本地Markdown tracker已建立，一票一文件，状态ready-for-agent仅表示定义就绪；未获本轮实施授权。未创建外部Issue、不改旧父票。其余主题冻结。

## 当前代码与运行态

业务行为基线仍是 e943d26（公共入口）；本轮更改源文件位置、相对导入、静态构建路径、脚本和服务路径，没有实现新业务功能。

本轮验证：npm run check、npm run build:alva 通过，7 项核心测试通过；alva.service/alva-tunnel.service active，本机及公网 /healthz 返回 alva/ok，本机首页 200。未建立生产业务会话、未调用真实模型，不把健康检查称为业务全流程验收。构建仍有现有大 chunk 提示。迁移后首次检查因 shell 仍在已移除的旧目录而失败，切换新根目录后复跑通过。

应用：React/assistant-ui/Three.js与Fastify/Codex App Server，入口web、api；`npm run check`、`npm run build:alva`、`npm run start:alva`。旧start/build对应复用旧基线，不是新应用入口。

持久化为独立单写进程PGlite（PostgreSQL WASM），不是网络PostgreSQL。生产只监听127.0.0.1:4173；运行/私有配置路径、备份及回滚见 [ops/alva/DEPLOYMENT.md](ops/alva/DEPLOYMENT.md)。不得同时启动dev和production写同一数据库。运行密钥/链接/项目数据不复制进票或Git。

## 已有成果与证据边界

| 已有能力 | 历史证据 | 尚不能推导的结论 |
|---|---|---|
| 真实导入/校准、手动家具、真实咨询、保存与同版本导出 | evidence/20260919T113205287Z-c8336560/result.json：6项通过、console/page error 0 | 完整保留UI或八组全通过 |
| HTTPS10/10、120增量/96网络块、越权拒绝、服务/Tunnel重启一致 | evidence/20260919T113620651Z-7a9de8f6/result.json | 公共写权限获得批准；后续改动自动受此证据覆盖 |
| 备份隔离恢复与干净安装/类型/构建/启动 | evidence/20260919T113809595Z-130d7739/result.json；evidence/20260919T113939Z-1906c48f/result.json | 完整业务验收；源码包已包含ALVA-007及后续变更 |
| 核心规则/持久化与公共入口回归 | evidence/20260919T111200Z-core；evidence/20260919-public-entry | 完整Chat取消/失败注入和专业正向操作已覆盖 |
| 两个独立浏览器公共重复访问 | evidence/20260919T123833084Z-97cca135/result.json：7项通过 | 实体手机实测或访客编辑权限决策闭合 |
| 两图真实识别及转写 | PROGRESS指向用户6房间附件与合成2房间对照、公开音源 | 两个真实用户户型、现场尺寸或实体麦克风验收 |

更多失败/修正证据及命令保留在PROGRESS/ACCEPTANCE；本轮不改旧日志、不删除证据、不把模拟结果换成实体证据。

## 首批研究结果与剩余范围

原型是人工解释单图后手写参数几何：原生WebGL2共享立方体、矩阵变换、深度阴影与玻璃混合；没有运行时AI自动识图。隔离浏览器复核50对象/14墙/6房间视点/40碰撞体，有限值有效、控制台错误0，保留剖切与完整墙体截图：evidence/20260919T131207987Z-priority-research。

首批链路：验证码登录 → Codex识图导入 → 墙线/房间轮廓修改 → 门窗核对与校准确认 → 再次调用Codex生成建筑场景 → 总览/剖切/房间视角。每步单票，现有基础复用而非重写。

首批正式ID为ALVA-008–013；T01映射008，原T02需009–013全部完成才结案。其余T03–T15仅在TICKET-PROPOSAL保留冻结内容，本轮不扩大处理范围。U12/U33/U34–U36删除、Q58禁用、U17保留移回库及证据，U16最后的原决定不变。

## 本轮知识整理检查

| 事实面 | 状态 | 边界 |
|---|---|---|
| 代码 | changed-and-verified | 路径迁移，类型/构建及7项核心测试通过 |
| 运行态 | changed-and-verified | 服务路径适配、恢复运行、首页与本机/公网健康通过；不做业务模型复测 |
| 文档 | changed-and-verified | 结构图、研究、规则入口、交接和当前链接同步 |
| 规则 | changed-and-verified | 原根与项目 AGENTS 合并，不将私有凭据写入 Git |
| 记忆 | out-of-scope | 未读写生成记忆；GlobalHandoff 在根目录同步 |
| 工作区 | changed-and-verified | Git 历史保留；原同名文档及配置私有备份，旧证据不改 |

pending：全部44张正式票的实施指令、统一验证码和新建筑生成验收；其余功能未实施。生产业务回归与生成记忆不在本次范围。现有大 chunk 构建提示未处理。原根文件的迁移前副本位于 .runtime/root-migration-20260919/，保留供复核，不自动删除；MCP 配置及原 Docs 附件不变。

本轮验证边界：仅文档/规则对齐，38草案/115验收、依赖DAG及U16前置闭包、链接检查通过；六张正式票仅同步最新快照/环境范围。代码、运行态沿用上轮验证，不重新声称本轮业务实测；记忆不在范围，无新增清理项。

最新审核稿38张（R04/R29撤销），115条验收已验证；上一轮40张/120条为历史。依赖已移除已删票并将R26依赖R25；U16最后功能约束不变。

本次发票验证：38新票/44总票、115条验收保持、依赖链接与编号有效；原六票正文未变。当前代码和线上状态不在本轮复测范围。审核稿仅保留来源，实施以正式票为准。

本轮收尾：仅修改规则、票据协作元信息与交接；44票验收/依赖不变，5项就绪清单及署名空值已核对。未运行产品测试或变更服务，生产事实沿用此前核验。记忆不在范围，未清理他人Worktree。

## ALVA-052 看板收尾

https://prod.huiyuanxp.com/todo 已实测44票/150条验收/5可认领/39等待依赖，搜索、并行组筛选、详情深链刷新、文档和窄屏检查通过，控制台错误0。证据`evidence/20260919T165930206Z-ALVA-052-todo/`；首次启动窗口502与第二次Cloudflare脚本CSP冲突保留在各自failure.json，后者已修复。产品首页与healthz正常，MCP/Tunnel单元仍active且配置未改。

个人实现提交d902557及修正9fae8e6；main按ALVA-052一次实现集成提交。3项看板测试、4项原基础/入口回归、类型检查、构建和真实浏览器检查通过；已有大chunk构建提示未处理。只读源无需重复上传，版本随源内容变化。回滚文件在`.runtime/alva-todo-rollback/20260919T170000Z/api.ts`，操作见TODO-LIST。

neat-freak：代码/运行态/文档changed-and-verified；规则verified-current；生成记忆out-of-scope；工作区changed-and-verified，本票个人Worktree/分支保留供复核，不影响main权威源。产品44票实施仍pending，没有因此完成或解锁产品票。

## ALVA-009 导入户型图与二维初稿

ALVA-009 已在独立 Worktree `task/ALVA-009-codex` 完成，并在完整验证通过后合入 `main`。实现覆盖 PNG/JPEG/PDF 来源保留、PDF 页码说明、处理状态、真实 Codex 多模态识别、稳定候选 ID、原图与二维初稿对照、未校准提示、重复请求幂等，以及失败/取消时保留上一个已确认场景。

验证记录：`npm run check`、`npm run build:alva`、ALVA-009 定向测试 3/3、两个不同布局的真实模型调用、浏览器刷新持久化和退出验证码门禁均通过。完整测试为 66/67；唯一失败是既有 ALVA-031 tracker 预期与当前依赖状态不一致，和本票无关。

证据目录：`evidence/20260920T135517780Z-dad4bde2/`、`evidence/20260920T135803184Z-a144b2c5/`、`evidence/20260920T142711689Z-browser-reload/`。


## ALVA-010 墙线与房间轮廓

ALVA-010 已由 lzy 在独立 Worktree `task/ALVA-010-lzy` 完成并验证，随后合入 `main`。实现提供服务端拓扑命令和前端二维校正：墙端点数值/拖动、共享连接点同步、房间顶点修正、墙线补画/分段/移除、门窗引用保护、定位校验、失败不写坏候选及拓扑修改清除旧校准。

验证记录：类型检查、生产构建、ALVA-010 定向测试 3/3、隔离浏览器登录/数值修改/房间顶点控制/补画/刷新/退出门禁均通过。完整回归在 main 标记 done 后复跑；既有 ALVA-031 tracker frontier 偏差仍单独保留。

证据目录：`evidence/20260920T151500000Z-ALVA010-browser/`。


## ALVA-014 问卷范围精简与逐题回答

Lexie 在 `task/ALVA-014-lexie` 完成实现，原实现提交 `9e309ec241116f276c738c9d7ef4aecd7ea6a06c`。现役问卷保留 Q01–Q60 稳定 ID，停用 Q19–Q22、Q58、Q60；可用题继续支持 A 推荐、B/C/D、自由回答以及 unknown/skipped/not_applicable，房间/项目 scope 隔离且锁定答案服务端拒绝覆盖。预算能力已从现役 Project 合同、写接口、UI、Chat 工具快照和导出移除，旧数据库/快照字段不迁移、不自动删除。

两轮验收均通过：Round 1 `evidence/20260921T073000Z-ALVA014-round1/` 包含 TypeScript、生产构建和 8 个相关回归；Round 2 `evidence/20260921T074000Z-ALVA014-round2/` 为真实 Chromium，验证 54 个可用题、6 个停用题隐藏、无预算 UI、跨房间不串值、unknown 显示、锁定写入 422、刷新持久化且登录后无 console error。全量 `npm test` 补充跑到 70/73，两个 media 失败仅因未提供 `RENOVATION_MEDIA_FIXTURES`；原 tracker frontier 偏差在本次全量重算后同步修正。

## ALVA-011 门窗、校准与拓扑确认

ALVA-011 已由 lzy 在独立 Worktree task/ALVA-011-lzy 完成，原实现提交 b113ba9，已合入 main。服务端新增门窗增删改、墙段/墙高/同墙重叠校验、已知墙长同比例校准、不可变拓扑版本与来源指纹；前端新增门窗校核面板，并保留墙线分段入口，确认后显示版本指纹。

验证：npm run check、npm run build:alva、ALVA-010/011 定向测试 5/5 通过；真实 floorplan.png 的 Chromium 网页验收覆盖登录、原图显示、墙线分段 200、门窗增删改、非法几何 422、校准、确认 v1、刷新重载和 /api/candidate/topology 无 404。证据：evidence/20260921T100146840Z-ALVA011-real-browser/。实时 Codex 复试因供应商 usage limit 返回 429，未伪造成功结果；本票网页验收使用真实附件及既有实际识别候选来源。


## ALVA-017 文字与图片真实流式咨询

Lexie 在独立 Worktree `task/ALVA-017-lexie` 完成；实现提交 `0356cef4fe98df84bb172e5550ec11f193b6fbb2`、`c35e707256d6d24e117b602df68df42a87d4f7d5`。三栏工作台继续使用 assistant-ui 原语，模型选择器改为读取 `/api/models`。供应端目录仍列出 GPT 系列，但本轮真实调用发现当前凭据对 `gpt-5.5`/`gpt-5.6` 已达使用上限；`gemini-3-flash` 通过真实 Codex App Server 调用，因此当前聊天模型目录只暴露该已验证可用模型。

两轮验收均通过。Round 1 `evidence/20260921T103000Z-ALVA017-round1/`：真实文字调用 5 个非空增量、图片调用 4 个非空增量，均完成；跨项目访问 403、原始 Codex 路由 404、scene 与 savedVersion 不变、参考图字节未持久化。Round 2 `evidence/20260921T110500Z-ALVA017-round2/`：Chromium 三栏工作台、动态模型选项、文字与图片 UI 真实调用、加载/完成状态均通过，scene 不被模型直接修改，console error 0。


## ALVA-015 Chat提取与手填双向确认

Lexie 在 `task/ALVA-015-lexie` 完成，原实现提交 `1db54df0245788e67330c32e95ad61cf6c21a3a5`。Chat 待确认答案确认后以精确用户原话保存为 `chat` evidence，手填答案保留 `questionnaire` evidence，两类答案均进入后续 Chat 的 `get_snapshot`。重复确认返回 422 且不重复写入；锁定值服务端拒绝覆盖，解锁必须明确 `confirmed:true`。

两轮验收均通过：Round 1 `evidence/20260921T143000Z-ALVA015-round1/` 为真实 Codex API 链路；Round 2 `evidence/20260921T145000Z-ALVA015-round2/` 为 Chromium UI 链路。补充回归中 ALVA-017 的 2 个模型目录断言仍硬编码旧 `gemini-3-flash`，而当前 main 已由后续任务切到 `gemini-3.1-flash-lite`，属于主线既有陈旧测试，不是 ALVA-015 功能失败。


## ALVA-016 未答看板与退出问卷分析

Lexie 在 `task/ALVA-016-lexie` 完成，原实现提交 `04ca6de1a3e1f58f70c9f84bfe6e091c40d3f68a`。未答看板按全屋与各房间 scope 分开统计，仅计启用问题；点击未答项会携带题目文本和房间上下文进入 Chat。退出问卷分析使用 `lastAnalysisEvidence` 增量游标：只处理新增 evidence，模型失败时游标不推进可重试，无新增 evidence 时直接返回且 revision 不变，已排队问题按题号+scope 去重。

Round 1 `evidence/20260921T151500Z-ALVA016-round1/` 验证失败游标保持、真实模型重试成功、只消费新增 evidence、重复退出 no-op 与问题 scope 去重；Round 2 `evidence/20260921T153000Z-ALVA016-round2/` 为 Chromium，验证全屋/客厅/书房独立未答、禁用项排除、点击书房 Q25 后 Chat 自动带入题目与房间并完成真实咨询，console error 0。

## ALVA-018 咨询取消与故障重试

Lexie 在 `task/ALVA-018-lexie` 完成，原实现提交 `42b592b263a553dbdb50b06bfa39bab9502000d4`。Chat 使用专属 `/api/chat/cancel`；取消/失败仅更新当前 assistant 状态和故障留证，正常完成前累积的 proposal / pending answer 不进入项目。前端保留完整重试草稿（文本、附件、房间、模型），失败后恢复输入，重试使用新 requestId，成功后清空草稿。

Round 1 `evidence/20260922T104500Z-ALVA018-round1/`：真实模型请求建立后取消，scene/answers/pending/accepted proposal 均无副作用；重试成功并收到 8 个流式增量。Round 2 `evidence/20260922T112500Z-ALVA018-round2/`：Chromium 首次通过真实供应端不存在模型触发不可用故障，文本与参考图恢复；点击重试后正常真实模型成功完成，scene 不变、无自动采用、图片不持久化、console error 0。

## ALVA-019 录音转写、纠正与发送

Lexie 在 `task/ALVA-019-lexie` 完成，原实现提交 `c925bcef0fa82bc83a6b16d1df8b8e5345ee8654`。转写使用独立项目级 controller 与 `/api/transcribe/cancel`，不再误用 Chat 取消；前端支持显式取消录音并丢弃内存分片。转写成功只回填可编辑输入框，失败/取消不会发送，音频不进入项目消息、证据或永久附件；用户编辑后发送时仅以当前文字作为 Chat 原话和 evidence。

Round 1 `evidence/20260922T161500Z-ALVA019-round1/` 使用真实公开 WAV 文件与真实 provider，得到 “How old is the Brooklyn Bridge?”，转写前后 project revision 均为 0，随后修改后的测试文本才被持久化。Round 2 `evidence/20260922T162000Z-ALVA019-round2/` 使用 Chromium 原生 fake microphone + MediaRecorder + 浏览器 WAV 归一化 + 真实 provider；取消录音不发送且保留原输入，第二次录音转写后编辑发送只保存编辑文本，console error 0。实体麦克风因云端 runner 无物理设备，按票要求保持待验。

## ALVA-043 业务指导依据用于咨询

Lexie 在 `task/ALVA-043-lexie` 完成，原实现提交 `38e230ba1d2c48cf9f41da0c176ada09f1558135`。新增 `api/business-guidance.ts`，将已提供的问卷、样例交付和项目定位文档整理成带 citation、适用方式与限制的只读业务指导 Skill，并显式登记尺寸/机电、结构与材料性能、负责人/授权三类资料缺口。Chat 增加只读 `get_business_guidance` 工具；明确业务指导意图会由服务端 grounding 成“资料事实 / 基于当前信息的推断或建议 / 缺少资料”，普通 Chat 保持原行为。附件和工具结果始终作为资料而非授权；含管理员、负责人、批准、权限、预算/报价/费用或施工授权敏感内容的模型补充不会进入最终 grounded 指导答复。

Round 1 `evidence/20260922T180000Z-ALVA043-round1/` 使用真实 `gemini-3.1-flash-lite`：工作位咨询引用 BG01 与 `references/02_intake_form.html#Q10`，明确区分资料事实、推断与缺口，scene 不变且 proposal 0。Round 2 `evidence/20260922T181500Z-ALVA043-round2/` 使用真实 Chromium UI + 真实模型：用户输入同时包含“管理员、负责人、预算、批准施工”等附件式文字和石材问题，最终只引用 BG02/BG05 受控指导，未赋予负责人身份、未批准施工、未提供预算指导，proposal 0、console error 0。过程中的失败验收 run 均按独立 evidence 保留，修正后用新 run 完整复跑。

2026-09-22 ALVA-054：yang-chatgpt 完成“聊聊你的家”入口、54道现役题的逐题卡片、草稿保存/关闭恢复/确认/房间隔离/小结。9项接口与回归、11组Chromium交互通过，截图已审阅；证据 evidence/2026-09-22T091452922Z-ALVA054-browser/。实现 d603054，当前集成已验证；用户授权生产发布，发布证据随后登记。未实施ALVA-028。


## 2026-09-22 ALVA-055 拓扑三类告警

已在独立Worktree完成并集成main：内部空洞、相对整屋主轴的倾斜、孤立墙体/门窗，增加鉴权只读诊断接口和二维问题列表/定位。T形节点与共线包含校验改为顺序无关。原实现06b63c0，21项测试和类型/构建通过，Chromium七组实际交互及截图复核通过，证据evidence/20260922T104414767Z-ALVA055-browser-85278c。main集成源码指纹一致并复跑类型/21项测试。未更新生产web/dist、重启服务或覆盖生产户型。规则参数及局限见docs/TOPOLOGY-QUALITY.md；旧全站窄屏溢出和大chunk警告保留。下一票ALVA-056执行MiMo复测，不把合成错误夹具称为模型输出。


## 2026-09-22 ALVA-056 MiMo探针与鉴权阻塞

独立实现提交53566b7，类型检查和5项探针逻辑/真实失败证据回放通过；真实MiMo识图未通过，因此不合入功能代码、不标done。正常Codex路径在5174.052ms后报告刷新令牌撤销；本次参数设置MiMo官方Responses provider后，在2555.246ms报告缺少MIMO_API_KEY。原始输出均0字符、未返回token用量；耗时是鉴权失败时间，不是模型识图推理。证据为evidence/20260922T105705151Z-ALVA056-mimo-ff43a8与evidence/20260922T105903721Z-ALVA056-mimo-455835，原result.json保留，review.json按权威turn错误复核分类。

尚缺当前MCP的有效MiMo环境凭据及最新标注截图的未标注原图。已保留ALVA-056署名与独立Worktree，恢复用新run ID；不读取宿主机凭据、不注销用户、不修改生产模型配置或候选。文档docs/MIMO-VISION-RETRY.md说明实际命令与边界。ALVA-055的21项回归和7组Chromium验收已独立完成并合入c25fa79，不受本外部阻塞回退。代码、文档与证据已核验；生产发布未执行，生成记忆out-of-scope，所有复核工作区保留。

2026-09-22 ALVA-054 发布核验：9454057实现已发布，新前端资源index-Bq_Jy-gM.js在线，公网首页/healthz/资源200，鉴权边界正常。隔离9项回归与11组浏览器交互通过；线上登录后验证因现役私有验证码文件被拒绝而blocked，未修改验证码或绕过鉴权。证据 evidence/2026-09-22T122724115Z-ALVA054-deployment/；详见docs/ALVA-054-home-intake.md。

## 2026-09-25 功能分区：虚拟分区线与三墙自动成区

用户直接要求在已确认户型内增加不形成实体墙的功能分区。实现新增 Project.zones 语义层：二维工作稿可用两次点击画虚拟分区线，端点自动贴到同一物理房间边界并切成两个功能区；三面近似直角墙形成 U 型矩形时，双击内部位置可自动以缺失的一边作为虚拟边界生成新功能区。虚拟分区不修改 Scene.walls、confirmedTopology 或建筑3D结构；重新修改户型时随其他下游空间设计一起清除。普通四面墙房间不会被误判为“三墙成区”。定向回归 22/22、类型检查、生产构建通过；浏览器自动化脚本受工具安全层拦截，未伪造浏览器通过结果。

## 2026-09-25 ALVA-021 局部3D候选比较与采用

ALVA-021 已由 lzy 在独立 Worktree 完成并合入 main，集成提交 c2594e8（实现提交 22a1db1）。候选协议支持 referenceIds；模糊请求至少返回两个不同变更候选，精确请求可返回一个。候选卡使用真实 Three.js 3D预览，参考物禁用且不写入采用范围；选中范围沿用服务端版本门禁、幂等命令和事务回滚。

验证：npm run check；ALVA-021 专项回归 2/2；受影响 ALVA-012/020 联合回归 9/9；npm run build:alva；真实 Chromium 通过，覆盖两个候选、3D画布、参考物默认不选和部分采用，控制台错误 0。证据 evidence/20260925T091243419Z-ALVA021-browser/。根目录现有 AGENTS.md 用户修改及未追踪历史证据未触碰；未部署/重启生产。

## 2026-09-25 ALVA-022 房间用途与布局分开确认

ALVA-022 已由 lzy 在独立 Worktree 完成并合入 main，集成提交 4931415（实现提交 788296e）。用途通过独立路由确认并保存用途依据，通用布局命令不能绕过；用途确认不改家具。用途触发的布局候选可预览、暂不采用或局部采用，布局采用单独保存 selectedIds 和 proposalId；拒绝一个候选不会使同批其他候选失效；锁定房间由服务端拒绝。

验证：npm run check；ALVA-022、ALVA-021、ALVA-020 和业务联合回归 9/9；npm run build:alva；真实 Chromium 覆盖用途确认、家具不变、布局候选3D预览、拒绝、局部采用、锁定房间按钮与服务端拒绝，控制台错误 0。证据 evidence/20260925T093352998Z-ALVA022-browser/。未部署/重启生产，主目录 AGENTS.md 和历史未追踪证据未触碰。

## 2026-09-25 ALVA-023 家具添加、选择与复制

ALVA-023 由 lzy 在独立 Worktree 完成。家具库添加服务端校验许可资产和明确房间，实例与库定义分离；新增与复制均分配新 UUID，复制保留 sourceId；2D 平面与真实 Three.js 3D 射线选取共享同一实例 ID；刷新保持身份和位置，坏资产/坏房间整单拒绝且不留下半个实例。

验证：npm run check；ALVA-023 API 与 ALVA-021/022/业务回归共 8/8；npm run build:alva；真实 Chromium 覆盖添加、2D 选择、3D 射线选择、复制、刷新和坏资产原子拒绝，控制台错误 0。证据 evidence/20260925T094742274Z-ALVA023-browser-5e3711/。未部署生产或写入生产数据库。

## 2026-09-25 ALVA-024 家具移动、旋转与吸附

ALVA-024 由 lzy 在独立 Worktree 完成并合入 main。服务端统一处理家具 5cm 网格吸附、15°旋转归一化、旋转占地的房间边界校验、同房间碰撞拒绝和锁定对象保护；手动命令与 Chat 候选共用 applyChanges，2D/3D 拖动失败时不保留本地错误位置。

验证：npm run check；ALVA-024、ALVA-023、ALVA-021、ALVA-022 与业务回归共 10/10；npm run build:alva；真实 Chromium 覆盖 2D 拖动、Three.js 3D 拖动、旋转吸附、碰撞/越界拒绝、锁定绕过拒绝和刷新保持，控制台错误 0。证据 evidence/20260925T102254871Z-ALVA024-browser-2a4841/。失败调试 run 也按独立证据保留。未部署生产或写入生产数据库。


## 2026-09-25 · ALVA-041 参考图片偏好标注
实现 `api/references.ts` 与 WorkspacePanel“参考图”页签，并把主 Chat 接到 `propose_reference_preferences` 工具。模型/手工标注均先 pending，取消不污染 Project；确认后才形成有来源 Evidence/Finding。个人实现 `a22b81a`。第一轮专项 3/3 + tsc/build/diff-check；第二轮真实监听端口 HTTP 链路通过（首页/图片 200、model/manual 来源、2 条确认 evidence + 2 条 findings），并带 ALVA-043 回归共 6/6。浏览器包存在但恢复后的服务器无 Chromium cache/system Chrome，因此浏览器尝试未计入验收。证据见 ALVA-041 单票与 `evidence/20260925T2258Z-ALVA041-round1/`、`evidence/20260925T2312Z-ALVA041-round2-http/`。


## 2026-09-26 · ALVA-031 设计师只读访问与撤销
Lexie 完成并验收设计师只读授权：统一验证码+invite token 登录、当前项目查看、服务端硬只读、跨项目拒绝、授权列表/生成/撤销、撤销立即使活跃 session 与旧链接失效；设计师可正常 logout。前端 WorkspacePanel 新增“访问”页签，业主可管理邀请，设计师看到只读说明。个人实现 `95f9675`。第一轮专项 3/3 + 类型/构建/diff-check；第二轮真实 HTTP/生产 assets/服务重启验收通过，并复跑 access/public-entry/foundation/snapshot/topology 33/33。证据见单票与 `evidence/20260926T0955Z-ALVA031-round1/`、`evidence/20260926T1005Z-ALVA031-round2/`。ALVA-032 已解锁。


## 2026-09-26 · ALVA-037 快照列表与只读状态预览
Lexie 完成独立快照历史/预览层：列表仅显示手动保存版本，展示当前工作稿未保存状态、版本号和 ISO 时间；空列表有明确空态。点击版本进入独立只读覆盖层，可查看二维、三维、需求/依据；不调用模型、不替换当前工作稿，失败可重试。显式恢复按钮仍调用既有 `/api/restore`。同时修复 PGlite timestamp 在 `/api/versions` 被序列化为 `{}` 的问题。个人实现 `3ab060d`；第一轮 15/15，第二轮真实 HTTP + 相关回归 20/20，通过 TypeScript/production build/diff-check。ALVA-038 已解锁。


## 2026-09-26 · ALVA-038 从快照恢复全局状态
Lexie 完成快照显式全局恢复强化。恢复 scene/topology/building/answers/evidence/messages/findings/proposals/changes/zones 等完整状态；失败/冲突保持原子，恢复不自动建快照。增加建筑生成并发 409 保护及旧快照建筑指纹校验，避免恢复后旧生成任务或过期3D误用。UI确认文案明确未保存修改会被替换、恢复前不会自动备份。个人实现 `a812678`；第一轮 19/19，第二轮真实 HTTP + 相关回归 24/24，通过 TypeScript/production build/diff-check。


## 2026-09-26 · ALVA-039 桌面漫游与输入暂停
Lexie 完成桌面漫游。个人实现 `51f95f0`，随后持续同步 ALVA-066/067、ALVA-040、ALVA-029 最新 main 并复验；入口冲突始终以最新 main 为基线最小装配。第一轮 7/7；最终最新 main 真实 Chromium：Pointer Lock=true、WASD 位移 0.340m、鼠标视角有效、wall=false / door=true / furniture=false / free=true，输入聚焦/失焦/Esc 无漂移，房间/全屋返回成功，console errors=[]。截图与控制台证据见 `evidence/20260926T1324Z-ALVA039-round2-post029/`。


## 2026-09-26 · ALVA-042 偏好确认与后续建议引用
Lexie 在 ALVA-066 Stage MCP 合入后完成最终接线：living pack 挂载 `get_confirmed_reference_preferences`，并在当前新版 export 保留 room styles/user context/layout review 等主线字段的同时加入参考偏好来源标识。第一轮 ALVA-041+042 共 8/8；第二轮真实 HTTP + 保存/重启 + living Stage MCP 实际调用通过，confirmedCount=1、pendingExcluded=true、deliveryMarkedReference=true、stageMcpCalled=true、chatCitedConfirmedSource=true。
