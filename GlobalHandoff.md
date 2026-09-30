## ALVA-088 户型采用与生活设计入口

当前主流程以用户采用户型为生活设计前置；允许保留诊断问题和未校准尺寸，不再依赖confirmedBuilding。诊断结果不能冒充通过。默认阶段迁移保持旧行为，显式确认后切换；共用服务/MCP和发布状态见 [ALVA-088](docs/ALVA-088-living-entry.md) 与 CURRENT.md。

## 公开项目介绍与媒体（ALVA-086）

README 面向使用者，只保留产品、演示、架构、安装和许可证说明，不展示任务进度、认领表、团队或活动信息。公开产品预览位于 `docs/media/`，是用户授权发布的产品素材，不是临时验收截图；完整 MP4 与字幕使用 GitHub Release `product-demo-2026-09-28`，不写入 Git 对象历史。业务密钥不进入公开介绍。

## ALVA-087 并发交互合同

Chat 工作不锁定问卷/家具等页面操作。忙时问卷分段只保存，显式待发；家具候选按ID与绝对目标应用最新工作稿，建筑结构和真实业务冲突仍校验。后续功能不得重新使用Chat忙碌作为全局只读，也不得用整项目revision废弃家具候选。见[权威合同](docs/ALVA-087-chat-concurrency.md)。

## 2026-09-27 ALVA-084 已完成并启用

开发截图通过统一查看入口即用即删；其他验收产物保留24小时，每小时自动清理。13个近期浏览器脚本已接入新目录，424个main二进制验收文件移出跟踪。首轮成功清理121817文件、约1.57GiB，可用约32G；生产健康，应用仍为082。GitHub已同步实现并确认现役生产SHA可恢复，代码靠Git，数据备份独立。详情见[保留与回滚合同](docs/ALVA-084-artifact-retention.md)。

本票释放认领，无后续自动开工。历史分支跟踪证据、未安全识别的旧目录及数据备份未自动删除。neat-freak已同步，生成记忆out-of-scope；不把这些保留项误报为全部清空。

## 项目许可（ALVA-085，2026-09-27）

根目录 [LICENSE](LICENSE) 是原创内容许可权威：学习及个人非商业自用，禁止商用，免费分享/修改须保留许可，第三方条款独立。对外不得称为 OSI 开源许可；npm 使用 `SEE LICENSE IN LICENSE`。

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

## ALVA-078 全局 Vision 模板

后续生活设计问卷/选项/确认复用 `web/src/vision/VisionTemplate.tsx` 的外框、选项和勾选组件，保留 Home Vision 苹果风格；不再添加家具等右侧独立选项卡。每段最多四题，Submit 合为一条消息沿现役批次链路调用主Chat/MCP并生成下一段；有待答段时自动引导等待。整段确认原子保存、按填写者隔离、相同提交可重试。详见[ALVA-078](docs/ALVA-078-vision-template.md)。本票已发布固定 main 3542aaa；公网健康、登录页和资源哈希通过，登录后复验 pending，见[078发布收据](docs/ALVA-078-production-release.md)。

## ALVA-077 问卷发送与决策依据

问卷保存和建议生成已解耦，原自动建议队列退役；新功能需保留显式批次快照、成功后消费和生成中新增答案。候选依据只覆盖真实设计，用稳定JSON摘要消除数据库字段排序差异；拒绝是无版本门禁的scene-noop。现役合同见[ALVA-077](docs/ALVA-077-questionnaire-batches.md)。已发布固定main c053dc6并通过公网登录复验；运行入口见[077发布收据](docs/ALVA-077-production-release.md)。

## 2026-09-27 ALVA-076已发布并登录后验收

14:02 UTC发布固定main `0a25f98`。阶段导航不再等待模型Resume/交接；自动Chat期间点击会停止旧回复后切换，蓝色标识当前阶段。生产正常登录owner后英文两阶段4次往返通过（0.5–0.9秒），自动回复中切换1.2秒通过，页面错误0；原thread、设计/问卷/保存版本保持，已回原floorplan。见[发布收据](docs/ALVA-076-production-release.md)。

169项源码、类型/构建、5项回归、5步浏览器与真实Chat/MCP已验。备份/回滚保留，临时验证码已删除。neat-freak已同步；生成记忆out-of-scope，既有bundle/窄屏问题与复核现场保留。050未认领、051仍等050，不自动开工。以下未发布/pending为历史检查点。

## ALVA-076 导航与模型恢复分离

手动阶段切换不再同步等待Resume/注入；保存摘要后立即显示目标历史，下轮Chat恢复原thread并实际送达。导航可取消当前Chat后继续，业务写入仍需原门禁。见[合同](docs/ALVA-076-stage-navigation.md)。

## 2026-09-27 ALVA-074 / 075 已联合发布

用户授权后10:09 UTC已发布固定main `96503ad`：中英文界面及Agent输出语言、左右阶段导航和原会话恢复一起上线。169个产品文件与最终验收清单一致；服务健康、公网JS/CSS哈希、真实浏览器中英文切换和刷新保持通过，页面错误0。

当前保存的验证码返回401，登录后生产交互复验pending；未改验证码或生产项目。备份、回滚、失败run及边界见[联合发布收据](docs/ALVA-074075-production-release.md)。生产固定到074075 release，后续main提交不自动上线。050未认领、051仍等050，不自动开工。

neat-freak已同步；生成记忆out-of-scope，既有bundle提示/窄屏溢出及复核现场保留。以下未发布内容为历史检查点。

## 2026-09-27 双语展示与每轮输出语言

ALVA-074已随96503ad联合发布。唯一语言合同和词典在 packages/contracts/alva/i18n；网页展示适配不翻译 value/ID/用户原话，新增用户文本必须标 raw 或 translate=no。请求头 X-Alva-Language 与 Chat language 驱动 start/resume、引导和后台建议；MCP get_interface_language只读返回本轮语言，工具执行恢复同一上下文。导出缓存包含语言，不能跨语言复用旧文件。新增展示文案同步词典并保持用户存储值原样。机制与验收见 [ALVA-074](docs/ALVA-074-bilingual-interface.md)。

## 2026-09-27 阶段导航统一入口

ALVA-075已随96503ad联合发布。右侧生活工作区随Chat阶段，右侧进入按钮复用StageControls服务端切换；阶段读取独立于确认卡读取，初始化完成前不发自动引导，切换中不发消息。074已保留这些行为并完成阶段导航回归。证据与边界见[ALVA-075](docs/ALVA-075-stage-navigation.md)。

## 2026-09-27 ALVA-073 已发布生产

用户授权后09:08 UTC已发布固定main `aa4f900`。主Chat首次开场、户型自查、生活问卷及阶段切换/Resume断点引导已上线。服务健康、公网资源哈希与未登录API拒绝通过，页面错误0；登录后线上复验仍待当前有效验证码，未改认证或生产项目。备份、回滚及完整边界见 [发布收据](docs/ALVA-073-production-release.md)。

生产固定073 release，后续main改动不自动发布。neat-freak已同步发布与交接；生成记忆out-of-scope，备份及复核现场保留。050未认领、051仍等050，其余任务不自动开工。下方“未发布”为历史检查点。

## 2026-09-27 主Chat引导的新合同

初始化/恢复/切阶段现在由原主Chat的系统引导轮接续，不能把它当成用户原话；断点来源、当前阶段MCP、执行证据门禁及前端触发均以[ALVA-073](docs/ALVA-073-stage-guidance.md)为准。普通对话结尾也读取下一步，业务已完成项不重做。建筑确认仍是生活设计前置。073已集成但未发布，生产保持072固定release。

## 2026-09-27 ALVA-072 已发布生产

用户授权后已发布固定main `30156f7`（08:16 UTC）。顶部项目名可新建/切换，空项目从主Chat附件开始，原数据和验证码保留。发布前数据备份、回滚脚本已准备；服务/公网首页/JS与CSS哈希/未登录API拒绝通过，页面错误0。生产固定到072 release，后续main改动不自动上线；详见 [发布收据](docs/ALVA-072-production-release.md)。

下一步：使用当前验证码登录后，从顶部项目名新建空项目并导入户型图。本机旧验证码401，已请求现行验证码；登录后只读复验pending，未自动新建或切换生产项目。ALVA-050未认领、051仍等050，其余任务不自动开工。

neat-freak已同步发布状态、运维入口、功能票据和交接。生成记忆out-of-scope，备份/失败证据/复核现场保留。以下未发布记录属于当时检查点。

## 2026-09-27 ALVA-072 已验收并集成，未发布

顶部项目名已提供新建/切换入口；新项目为空并从主Chat户型附件开始，旧项目工作稿、保存版本及聊天保留。设备session独立选择，旧标签页请求有项目绑定，设计师/专业邀请固定原项目。当前阶段MCP可列项目及打开同一确认面板，用户点击后才创建/切换。

16项相关回归、类型/构建、真实主Chat→HTTP MCP→页面回执→新建/切回与原thread恢复、独立进程重启、桌面/手机面板通过，页面错误0。详情及失败证据见 [ALVA-072](docs/ALVA-072-project-switching.md)。本票未发布，生产仍为071固定release；068临时预览已按原数据/配置恢复并健康。neat-freak收尾完成，既有bundle警告及主工作区手机横向溢出保留，复核现场保留。

下一步：需要线上使用本入口时，按发布流程备份并切换已验候选，再验证登录/新建/切回。未自动创建生产项目或改验证码。ALVA-050依赖就绪未认领，ALVA-051仍等待050；其他任务不自动开工。

## 2026-09-27 GitHub 仓库同步

用户授权将现有 main 推送至 https://github.com/huiyuanXP/alva 。origin 保持该仓库 HTTPS 地址；SSH publickey 认证未通过，使用已登录 huiyuanXP 的 GitHub CLI 配置 Git HTTPS 认证。推送结果以远端 main 与本地 HEAD 一致核验。

本任务仅同步 Git，不改变生产部署或其他票状态。下一步保留原有待办，不自动开工；ALVA-070/071 公网登录只读复验仍待有效验证码。

neat-freak：代码无改动；远端同步核验在本任务收尾执行；交接文档 changed-and-verified，规则 verified-current；生产与生成记忆 out-of-scope。原有未跟踪文件 alva-coordination.lock 和 `h -u origin main` 保留且不纳入提交。

## 2026-09-27 ALVA-070/071 已发布生产

用户授权后已发布固定main `0c52ea0`，包含SceneView交互修复与详细家具生成/三视角critic。服务健康、公网资源哈希及生产真实三视角截图通过；旧验证码失效，登录后只读验收pending，已向用户请求当前验证码。未自动更改设计、采用家具或保存。生产已改由ALVA071-release.conf固定，旧069 release及数据备份可回滚；详见 [发布收据](docs/ALVA-071-production-release.md)。neat-freak已同步，失败与复核现场保留。下方未发布字样均为历史检查点。

## 家具模型与视觉critic合同（ALVA-071）

共享模型合同在 packages/contracts/alva/furniture-model.ts；两种3D视图与审查截图共用 web/src/scene/furniture。定制模型只能通过生活MCP generate_furniture_model审查后进入候选，原始需求取服务端用户消息，三视角均为实际WebGL图；生成/审查失败不得口头冒称成功。属性保存保留模型，仅换不同目录款式时清除；后续属性修改不冒充已经重审。生产未发布，详见 [ALVA-071](docs/ALVA-071-furniture-models.md)。

## 主工作区3D渲染职责（ALVA-070）

主工作区普通3D和漫游已由ALVA-079统一使用SceneView；BuildingView仅保留独立建筑/快照展示。选中变化不重建renderer；同房间家具/样式更新保留相机，显式房间切换仍聚焦。详情见 [交互合同与验收](docs/ALVA-070-scene-interaction.md)。已集成未发布。

## 2026-09-26 ALVA-047 已验收并集成

整组方案现在使用groupId组织同一次生成的真实不同候选；组级预览并排返回每个候选的真实场景、可选目标、周边参考和锁定排除项。组级采用在单一项目事务中只应用所选候选的勾选范围，失败零部分写入，成功后同组选中项accepted、其余rejected；沿用request receipt幂等和预分配newId稳定实例。采用不创建快照，只有手动保存产生存档，显式恢复可回到此前保存版本。

第一轮专项4/4；第二轮typecheck、生产构建及相关扩大回归44/44，0 fail/0 skip。仅保留既有Vite >500 kB chunk warning。未发布生产。

## 2026-09-26 ALVA-046 已验收并集成

参考图家具现在只能从已确认参考偏好进入匹配，并仅返回项目现有许可资产。候选展示资产许可、目录默认尺寸、未实测状态和匹配理由；参考图明确不作为可靠几何。确认时服务端重新校验参考批次、房间和许可候选，通过现有边界/碰撞规则创建全新UUID，并在实例上保留referenceSource；拒绝为scene-noop，无许可资产或自造assetId明确失败。

前端参考图页支持候选比较/确认/拒绝，家具属性页与交付D04继续显示来源、许可、目录尺寸依据和未实测状态。第一轮专项3/3；第二轮typecheck、生产构建和相关扩大回归40/40。额外两条旧家具测试在本票和未修改main均失败，分别为旧保存测试未适配REVIEW_REQUIRED、旧复制坐标触发现行碰撞规则，已记录为既有基线而非046回归。未发布生产。

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

## 2026-09-26 ALVA-066 临时预览占用

当前 066 Worktree 已合入最新 main，独立预览占用 127.0.0.1:4186 和原隔离验收数据库，原阶段 thread 保留。不得对该库并发运行独立验收进程。生产未改；运行入口与已知回复错误见 [临时预览](docs/ALVA-066-temporary-preview.md)。

## 2026-09-26 主 Chat 上下文边界（066 候选）

基础约束用 thread 配置，普通轮次不重复附完整项目与历史；阶段进入送去重摘要和快照，详细状态按需 MCP 读取。compact 成功与工具目录可见不代表业务调用完成，验收须核对实际结果。066已完成并发布，现役状态见主 Chat 合同及066生产收据。
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

## 2026-09-25 ALVA-066 协作增量

安装版 App Server Resume 不接受 dynamicTools 覆盖；066通过固定 mcp_list_tools/mcp_call_tool 让旧thread发现并调用现役阶段MCP新工具，真实网关已验。029补充合同确认：index.md含四分类SHA，current.json另含indexSha256；审查复用保留reviewedRevision，重读当前revision投影且scene/context指纹不变后记录adoptedAtRevision。066过程提交2d6b6cd，新业务增量待验、未集成/发布；主目录NextTask是重任务窗口与下一步入口。

## 2026-09-26 ALVA-040 日照独立实现，阶段接入待066

ALVA-040 由 chatgpt-sunlight 认领并在独立分支 `task/ALVA-040-chatgpt-sunlight` 提交 `7c5129e`。统一两种3D视图的日照与投影，修正早晚方向和建筑夜间直射，时间/日期变化不重建视图；显示真太阳时、日期、纬度、北向和估算限制。17/17回归（含7350组参数）、完整类型检查、前端构建、真实浏览器13/13检查通过，控制台错误0；相同参数画面哈希一致，项目/revision/快照不变。

仍为 **in-progress**：生活设计MCP、主Chat实际调用与UI action回执等待ALVA-066。产品代码和证据只在 `/home/ubuntu/Alva/.runtime/worktrees/ALVA-040-chatgpt-sunlight`，未合入main或部署。工作区内 `docs/ALVA-040-sunlight.md`、单票Implementation handoff与 `evidence/20260925T192458558Z-ALVA040-browser-110e48/` 是本里程碑入口；失败run、编译中止与资源采样保留。未改057/066/029共享入口、生产服务或配置；复核现场保留，不清场。

## 2026-09-25 用户信息投影协作合同

029负责独立用户上下文/布局审查模块，066负责MCP和共享入口装配。确认的私有位置为运行数据根 user-context/<projectId>/，分类 habits/preferences/requirements/unresolved/index，Project持久数据为权威，Markdown为分代原子生成且带revision/来源指纹/hash的可重建投影，不进Git；正式模块合同随029提交。当前协作答复在 `.runtime/alva-coordination/ALVA-066-029-reply.md`，不含客户内容。066运行层过程代码仍只在独立Worktree，不能据此宣称生产已切MCP。

## 2026-09-25 协调清理与锁到期检查

用户授权提交原错别字和协调整理；024/025/028 过期占用已移除，040 恢复待认领，057 保留。根目录空锁暂留，记录时间 18:49:54 UTC；用户级定时器将于 2026-09-26 06:49:54 UTC 检查无人认领且未被持有的原文件再释放，正式 .git 协调锁不变。053/056 既有验收证据保留提交；neat-freak 复核仅覆盖本次状态与文档，无产品代码或生产变更。

## 2026-09-25 MCP 默认接入约束

所有后续用户功能必须同票接入所属阶段 MCP，主 Chat 优先实际调用工具；错误通过 MCP 提供可解释原因和用户修复步骤。权威合同见 [主 Chat 合同](docs/ALVA-065-main-chat-agent.md)，迁移票为 [ALVA-066](docs/ALVA-066-stage-mcp.md)。规则已更新，运行实现尚待完成，不能把接入计划当作上线状态。

## 2026-09-25 主 Chat 接入规则

现役主 Chat 入口固定为登录后左侧咨询栏 → `POST /api/chat`；Agent 身份在 `api/main-chat-agent.ts`，Codex App Server Harness 在 `api/codex.ts`，工具白名单在 `api/chat.ts`。后续用户功能在同票完成 Chat 工具适配与端到端验收，直接 API/按钮不算已接入；执行模板见 [ALVA-065](docs/ALVA-065-main-chat-agent.md) 和 [Prompt](docs/MAIN-CHAT-FEATURE-PROMPT.md)。本次未新增识图/建筑 Chat 工具。

## 2026-09-25 ALVA-064 现役图片识图模型

生产 `alva.service` 已发布 main `4870b0d`：图片户型识别默认 Gemini 3.8 Flash High、high 推理强度，聊天模型独立保持 Gemini 3.1 Flash Lite。公网登录后只读验收通过，项目 revision 不变、页面错误 0；[发布与回滚记录](docs/ALVA-064-gemini-default-release.md)。同会话截图自查仍是隔离 Skill，户型准确性待用户对照原图；ALVA-028 暂停。

# GlobalHandoff

2026-09-25 ALVA-036 已在 main 完成集成验收，随后随 ALVA-064 的 main 构建发布到生产；公网资源与本机构建 SHA256 一致，登录后只读页面检查通过，生产保存写入尚未单独验收。只有显式保存创建全局快照，失败回滚与同请求重试已在隔离验收中验证。快照只读预览和明确恢复仍由 ALVA-037/038 实施；旧“历史”入口不是两票的完成证明。恢复入口见 [ALVA-036 单票](.scratch/alva-completion/issues/29-manual-snapshot.md)和 NextTask。

## 2026-09-25 ALVA-061 本机 Codex Gemini 接入

Codex 用户配置增加单一 `gemini` profile，复用已有 `newapi` provider、网关和 `NEWAPI_KEY` 环境变量。模型目录可选 Gemini 3.6/3.7/3.8 Flash High，默认 3.8；三款已通过原生 CLI 真实最小调用。使用和边界见 [ALVA-061](docs/ALVA-061-codex-gemini-profile.md)。配置仅在本机，不代表业务 App Server、生产模型或其他机器已切换。

## 2026-09-25 ALVA-063 当前预览与手动 Skill

临时 tunnel 现展示 Gemini 3.8 同会话自查候选（19 墙/5 房/7 门窗）。同一 thread 接收生成后的仅平面截图和原图；模型判为 `mismatch`，疑点待人工核对。业务原生 schema 未通过，隔离字段映射后可渲染，旧候选及生产保持不变。Skill 位于 `docs/skills/alva-floorplan-self-review/SKILL.md`，未装进标准目录；脚本在自查 prompt 中显式附入全文。详情见[ALVA-063](docs/ALVA-063-floorplan-self-review.md)。

## 2026-09-25 ALVA-062 历史预览

临时 Cloudflare 链接当时展示 Gemini 3.8 户型候选，20 墙/6 房/9 门窗。模型两轮原始输出未通过业务严格 schema；仅隔离预览字段映射后通过几何/拓扑并在公网验证二维/3D。原 MiMo/Luna 数据保留，生产未改；准确性待用户对照原图。入口、服务与证据见[ALVA-062](docs/ALVA-062-gemini-preview.md)。

## 2026-09-25 ALVA-060 历史预览

同一临时 Cloudflare 链接当时曾展示 Codex GPT-6 Luna xhigh 的业务识图候选。模型由已有 `OPENAI_VISION_MODEL` 选择，推理强度现可用 `OPENAI_REASONING_EFFORT` 传给 App Server。17 墙/10 房/5 门窗能渲染，但拓扑失败且有 15 项诊断问题；原 MiMo 候选数据库和截图保留。入口、验证与停用方式见 [ALVA-060](docs/ALVA-060-codex-luna-preview.md)，生产未变。

## 2026-09-25 ALVA-059 MiMo 预览

ALVA-056 已集成 main。MiMo 候选当时在隔离 Worktree、数据库和临时 Cloudflare Tunnel 中完成二维/全屋 Chromium 实测，未改生产；同一链接后来切换为 ALVA-060 的 Luna 候选，现在由 ALVA-062 展示 Gemini 候选。原截图、验证码位置与历史运行边界见 [ALVA-059](docs/ALVA-059-mimo-render-preview.md)。MiMo 结果仍是待人工核对的识图候选，非已确认户型或建筑生成模型验收。

## 2026-09-25 ALVA-020 完成

ALVA-020 已由 lzy 完成并集成 main。范围确认、取消、锁定目标排除、越界服务端拒绝和候选 scopeId 关联均已通过真实 Chromium 验收；证据 evidence/20260925T-ALVA020-real-browser/，实现提交 a20b15b。

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

2026-09-25恢复：ALVA-053/056退pending，028退待办且继续用户暂停；本轮不实施产品、重启服务或改资源配置。事故报告[docs/INCIDENT-2026-09-25-server-recovery.md](docs/INCIDENT-2026-09-25-server-recovery.md)与CURRENT/NextTask为本次入口。内存压力、网络故障及SSH限流已留证；9月25日Power key关机与9月22日资源故障分开记录，具体肇事程序仍未唯一确定。21个Worktree和所有原未提交成果保留。

- 项目根 `/home/ubuntu/Alva`；现役工程 api/、web/，开发前读 docs/PROJECT-STRUCTURE.md。
- 正式tracker：`.scratch/alva-completion/README.md`。44票 ALVA-008–051 已发布；当前 ALVA-008–012、ALVA-014–019、ALVA-043 已完成并集成 `main`。
- 用户已要求并行认领机制；当前规则任务不自动开工。依赖满足后在主目录NextTask署名即认领，独立Worktree开发，main串行集成后释放并解锁。参考家具及整组方案最后，随后最终验收。
- 当前范围：无预算；理想WebGL环境Demo；只有手动保存创建全局快照，可预览并明确恢复，不提供逐操作历史、撤销或自动存档。
- ALVA-014 已从现役问卷/API/UI/Chat工具/导出合同移除预算，并保留旧持久层/快照历史数据不迁移；统一验证码已由 ALVA-008 实施，新建筑生成仍待后续票且必须真实调用 Codex。
- 恢复读CURRENT/Handoff/NextTask。技能to-tickets用于发票，neat-freak用于知识对齐，不扩大生产权限。本库旧基线和历史证据保留；`/home/ubuntu/aws-hackthon` 已全目录归档且不使用。
- 2026-09-22 MCP 凭据收尾：现役授权密码只在 `/home/ubuntu/aws-hackthon/.mcp-runtime/server.env`，旧副本 `config.json`、`connection.txt`、`mcp-login-password.txt` 已删除。MCP 仍临时依赖该目录下 `.venv-mcp` 与 `.mcp-runtime`，迁移到 `alva-*` 目录前不得删除；详见 `docs/REMOTE-ACCESS.md`。

- 并行入口：NextTask.md；当前依赖就绪 frontier 为 ALVA-023/028/031/036/041；ALVA-028 已退待办（Execution state=pending、未实施，历史负责人保留），其余未认领。旧“全串行/首批全完成才可开始其他票”被覆盖。共享文件需协调，个人分支提交不等于done；全局交接只在main集成时更新。

- ALVA-052恢复原prod.huiyuanxp.com/todo入口，现役api/todo与web/todo直接读取44张正式票和NextTask；无需重复上传，30秒刷新。源状态和认领仍在main维护，不修改MCP。运维与验证见docs/TODO-LIST.md。

- ALVA-010 已在 main 集成：拓扑校正统一经过 `api/topology/commands.ts` 与 `validate.ts`，墙端点/房间顶点修改会同步共享连接并清除旧校准；分段保留来源，带门窗引用的墙不得静默移除。下一项已解锁为 ALVA-011。

- ALVA-014 已由 Lexie 完成：保留 Q01–Q60 稳定 ID，停用 Q19–Q22/Q58/Q60，问卷保留逐题状态与房间/项目 scope；预算能力退出现役合同但不清除历史数据。证据见 `evidence/20260921T073000Z-ALVA014-round1/` 与 `evidence/20260921T074000Z-ALVA014-round2/`。

- ALVA-011 已由 lzy 完成并合入 main（实现提交 `b113ba9`）：门窗增删改与墙体关联、越界/重叠/墙高校验、比例校准、不可变拓扑版本与来源指纹均已落地。真实 `floorplan.png` Chromium 验收覆盖墙线分段接口 200、非法几何 422、确认与刷新重载，证据 `evidence/20260921T100146840Z-ALVA011-real-browser/`；实时 Codex 复试受供应商 429 限流，未伪造通过。

- ALVA-017 已完成真实文字/图片流式咨询；模型目录动态来自 `/api/models`。ALVA-017 当轮真实验收使用 `gemini-3-flash`；当前 `main` 已由后续变更切换为 `gemini-3.1-flash-lite`。证据：`evidence/20260921T103000Z-ALVA017-round1/`、`evidence/20260921T110500Z-ALVA017-round2/`。

- ALVA-015 已完成 Chat 提取与手填双向确认：确认后保留精确原话来源，手填与 Chat 确认统一进入 answers/evidence，重复确认幂等拒绝，锁定值须显式解锁。证据见 `evidence/20260921T143000Z-ALVA015-round1/`、`evidence/20260921T145000Z-ALVA015-round2/`。

- ALVA-016 已完成未答看板与退出问卷分析：scope 独立统计、未答跳转 Chat、增量 evidence 游标、失败可重试和重复退出 no-op 均已验证。证据：`evidence/20260921T151500Z-ALVA016-round1/`、`evidence/20260921T153000Z-ALVA016-round2/`。

- ALVA-018 已完成咨询取消与故障重试：专属 Chat 取消、草稿/附件恢复、安全新 requestId 重试、取消前工具候选不落业务副作用均通过两轮验收。证据：`evidence/20260922T104500Z-ALVA018-round1/`、`evidence/20260922T112500Z-ALVA018-round2/`。

- ALVA-019 已完成录音转写、纠正与发送：文件 WAV 与 Chromium 模拟麦克风均通过真实 provider 转写；录音/转写取消不误发送，音频不持久化，发送只采用用户编辑后的文字。证据：`evidence/20260922T161500Z-ALVA019-round1/`、`evidence/20260922T162000Z-ALVA019-round2/`。实体麦克风在云端 runner 无物理设备，保持待验。

- ALVA-043 已完成有来源的业务指导咨询：已提供 references 被整理为 6 条只读 Skill 与显式资料缺口；业务指导回答服务端区分资料事实/推断/缺口并保留 citation，附件中的命令、负责人、预算或批准文字不获得执行/授权语义。真实模型与 Chromium 两轮通过，证据：`evidence/20260922T180000Z-ALVA043-round1/`、`evidence/20260922T181500Z-ALVA043-round2/`。

- ALVA-055已集成main，拓扑质量接口与二维定位见docs/TOPOLOGY-QUALITY.md；21回归+7组Chromium通过，未生产发布。诊断只读，MiMo实际识图结论由后续ALVA-056验证。

- ALVA-056当前done：原生MiMo默认Pro复测及输出修复已集成，个人`fbfe8e8`；26墙/5房/12门窗通过当前结构检查，不自动确认，完整边界见docs/MIMO-VISION-RETRY.md。

2026-09-22 ALVA-054 发布核验：9454057实现已发布，新前端资源index-Bq_Jy-gM.js在线，公网首页/healthz/资源200，鉴权边界正常。隔离9项回归与11组浏览器交互通过；线上登录后验证因现役私有验证码文件被拒绝而blocked，未修改验证码或绕过鉴权。证据 evidence/2026-09-22T122724115Z-ALVA054-deployment/；详见docs/ALVA-054-home-intake.md。

## 2026-09-25 ALVA-021 完成

ALVA-021 已由 lzy 完成并集成 main，集成提交 c2594e8。模糊请求至少两个不同候选、精确请求单候选、真实3D预览、参考物不默认采用、选中范围原子提交、旧版本拒绝和重复提交幂等均已验证；证据 evidence/20260925T091243419Z-ALVA021-browser/，浏览器控制台错误 0。未部署生产。

## 2026-09-25 ALVA-022 完成

ALVA-022 已由 lzy 完成并集成 main，集成提交 4931415。用途确认与布局采用已拆成独立服务端流程和确认依据；用途确认不移动家具，布局建议可预览、拒绝或局部采用，锁定房间拒绝。真实 Chromium 证据 evidence/20260925T093352998Z-ALVA022-browser/，控制台错误 0。未部署生产。

## 2026-09-25 ALVA-023 家具添加、选择与复制

ALVA-023 由 lzy 在独立 Worktree 完成。家具库添加服务端校验许可资产和明确房间，实例与库定义分离；新增与复制均分配新 UUID，复制保留 sourceId；2D 平面与真实 Three.js 3D 射线选取共享同一实例 ID；刷新保持身份和位置，坏资产/坏房间整单拒绝且不留下半个实例。

验证：npm run check；ALVA-023 API 与 ALVA-021/022/业务回归共 8/8；npm run build:alva；真实 Chromium 覆盖添加、2D 选择、3D 射线选择、复制、刷新和坏资产原子拒绝，控制台错误 0。证据 evidence/20260925T094742274Z-ALVA023-browser-5e3711/。未部署生产或写入生产数据库。

## 2026-09-25 ALVA-024 家具移动、旋转与吸附

ALVA-024 由 lzy 在独立 Worktree 完成并合入 main。服务端统一处理家具 5cm 网格吸附、15°旋转归一化、旋转占地的房间边界校验、同房间碰撞拒绝和锁定对象保护；手动命令与 Chat 候选共用 applyChanges，2D/3D 拖动失败时不保留本地错误位置。

验证：npm run check；ALVA-024、ALVA-023、ALVA-021、ALVA-022 与业务回归共 10/10；npm run build:alva；真实 Chromium 覆盖 2D 拖动、Three.js 3D 拖动、旋转吸附、碰撞/越界拒绝、锁定绕过拒绝和刷新保持，控制台错误 0。证据 evidence/20260925T102254871Z-ALVA024-browser-2a4841/。失败调试 run 也按独立证据保留。未部署生产或写入生产数据库。


## 2026-09-25 · ALVA-041 参考图偏好数据边界
参考图片偏好采用独立 `alva_reference_batches` / `alva_reference_annotations` 持久化：model/manual 候选在确认前不进入 Project 需求；业主确认后才转成 `Evidence(source=image)` + intake `Finding(kind=requirement)`，并用 `objectIds: [reference:<batchId>]` 回指原图批次。参考图只能作为视觉偏好来源，不能作为尺寸、结构、真实材料身份或材料性能证据。后续 ALVA-042 只能读取 confirmed 标注，不得把 pending/cancelled 批次当作已确认偏好。

## ALVA-066/029联合运行契约（未上线）

066检查点087094c在个人Worktree：用户分类的Markdown在DB提交后原子投影，错误必须保留稳定code/repairActions；模型实际能按CONTEXT_SCOPE_INVALID修正房间/家具ID混用。审查凭证保留真实reviewedRevision/adoptedAtRevision；样式参与失效指纹。真实局部联合链已通过，整票与生产仍pending，以NextTask和066票据为现役入口。原thread恢复与串行新进程验证不等于新建替代会话。

ALVA-066检查点35088ef：进入阶段用thread/inject_items追加摘要/快照；thread/read有损视图不包含原始注入项，恢复去重只读取当前stage CODEX_HOME内匹配thread身份的rollout。HTTP MCP长调用不能依赖fetch默认响应头等待时限。真实识图仍pending，缺失说明只补未核实标签，不伪造地理值或几何。

## ALVA-066 当前检查点：aea3cc2，继续真实识图

066独立Worktree已提交 `aea3cc2`。补齐拓扑修复/补墙和功能分区MCP，与直接API共用服务；类型检查与41/41导入、拓扑、分区、阶段Chat回归通过。闭合环只去掉精确末尾重复点，内部重复仍拒绝；私有真实输出回放通过，但未注入项目。

第四次真实识图仍失败于模型漏rooms.name（20260925T211018Z-ALVA066-floorplan-recognize-574753）；现已在首轮和修正提示正文附完整JSON Schema，不猜补名称，并约束主Chat不能将模型格式错误归咎附件。已启动同原附件/原thread下一轮实测，重任务仍共享锁串行CPU80%/1200M/swap0。成功后用续跑脚本完成标注、明确合成输入的校准、浏览器确认、真实建筑生成及进入阶段立即送达检查。

029已接收并装配，原生活设计thread的局部真实分类→Markdown→review→浏览器保存链通过；最终同SHA联合链、原图/建筑/跨阶段失效、交付/取消/重启、main产品集成及备份发布仍pending。066和029保持in-progress，生产未改。neat-freak过程事实已对齐，生成记忆out-of-scope，复核现场保留。


## ALVA-066 当前检查点：ba1c9e6，继续联合保存与交付验收

066独立Worktree已提交 `ba1c9e6`。真实原附件→主Chat HTTP MCP识图成功（24墙/5房/8门窗），实际修复T节点、标注与明确合成输入的校准，浏览器确认拓扑；按生产现役模型生成建筑并进入living。建筑确认收尾有一轮异常退出，保留失败，新进程/浏览器重读确认建筑、原floorplan thread、新living thread及摘要送达均保持。候选仍有一项未连接端点待核对，不宣称施工精度。

原living thread曾增长至243225 token并空结束；官方thread/compact/start在同一thread压缩成功，估计降至20783，项目revision不变。已提前自动压缩并移除快照重复拓扑几何。压缩后原回答任务实际生成家具候选，页面明确采用/刷新通过；真实样式候选的2D/3D预览、确认/重读与几何不变通过。修复明确家具参数/初始旋转、结果完整性、错误原因保留、同房间旧样式候选过期。类型检查与16/16最新回归通过；过程失败与边界见个人票据。

下一步在固定实现上完成原图项目029分类→Markdown→review→保存、确认后自动建议成功正路径、ZIP交付/取消重试、返回原阶段及拓扑失效、最终同候选门禁，再main产品集成/备份发布。066/029保持in-progress，生产未变；029无需重跑其独立模块。共享heavy锁仍串行CPU80%/1200M/swap0，当前检查已结束，066继续下一独立窗口。

neat-freak过程事实已同步：局部代码/实测verified-current，整票/生产pending，生成记忆out-of-scope，私有现场与其他Agent署名保留。



## 2026-09-26 · ALVA-031 设计师只读访问合同
设计师访问必须同时经过统一验证码和项目 invite token；服务端 session 固定 `role=designer` 与项目/邀请 link。设计师默认仅允许 GET/HEAD 当前项目内容，任何项目写入在全局 onRequest 层 403，仅 `/api/logout` 例外用于结束本人 session。业主可列出、生成、撤销当前项目只读邀请；撤销后已有 designer session 与旧 invite token 立即失效。跨项目 `/api/projects/:id` 请求在 session 项目校验处拒绝。该层属于登录/授权边界，不属于户型或生活设计阶段 MCP。


## 2026-09-26 · ALVA-037 快照只读预览合同
全局历史只展示 `/api/save` 创建的手动快照；版本列表时间由 `AlvaStore.versions()` 统一转 ISO。读取 `/api/versions/:version` 仅返回保存副本，不修改当前工作稿、revision 或版本列表。前端 `SnapshotHistory` 使用独立覆盖层渲染快照 2D/3D、需求与依据，不把快照赋值给当前 App project；关闭预览即回到原工作稿。只有明确 restore 才允许替换工作状态。

## 2026-09-26 ALVA-066 确认与诊断合同

确认卡使用相关业务域的持久化数字版本，不使用内容哈希；旧卡刷新不等于用户确认。MCP 户型/生活阶段都可读取页面同源诊断详情，自动修复 issue 为空不能解释成无告警。当前仅个人 Worktree 临时预览验证，未发布。资源采用共享 alva066.slice 合计物理内存 20%、零 swap；入口和证据以 docs/ALVA-066-temporary-preview.md 为准。

## 2026-09-26 · ALVA-038 快照全局恢复合同
恢复只接受已存在的手动快照，并通过 `/api/restore` 显式确认执行；预览仍保持只读。恢复采用 `prepareSnapshotRestore()` 深拷贝快照完整 Project 状态，保留当前 revision/savedVersion 计数并标记 dirty；恢复本身不创建新快照或恢复前备份点。不存在快照、stale revision、数据库失败均不部分写入。若当前正在生成建筑3D，restore 409；快照内 building 与其 confirmedTopology 版本/指纹不一致时建筑结果清空并标记 expired，不能误用过期3D。

## 2026-09-26 ALVA-066 与主线同步

用户授权集成；066 候选保留主线 Gemini 3.8、进度展示与快照恢复。主 Chat 进度使用 ChatProgressContext，保留阶段消息筛选、MCP 附件与 UI 回执；新增恢复测试必须先生成当前审查，再保存。此次合并不关闭 029，不将生产发布状态与代码集成状态混同。

2026-09-26 集成确认：用户授权的 `c53d3ac` 已进入 main；保存前复核与采用凭证也随 066 集成，旧 029 主线路由缺口是历史审计事实。029 整票验收仍 pending；生产未发布。

## 2026-09-26 066依赖与占用边界

066运行层已集成即满足下游MCP接入前置；032/040/042/057无需等待066生产发布，可由原负责人继续联验。066不再占用共享产品入口；整票done仍须满足原票生产验收。029自身验收留在029，不作为066接入能力未就绪的理由。

## 2026-09-26 ALVA-066 生产状态

066已在05:32 UTC发布（5bb823b，产品c53d3ac）；生产资源与健康通过，登录后两阶段MCP业务验收待验证码。先前“仅临时预览运行”已是历史状态。回滚需同时指向备份旧后端与静态资源，不能只恢复首页；详见docs/ALVA-066-production-release.md。

2026-09-26 066最终结论：生产两阶段实际工具调用、真实目录隔离与原thread恢复已通过，066标done。已恢复原living阶段，设计数据不变；有效验证码临时文件删除。后续接入与验收按各票独立推进。


## 2026-09-26 · ALVA-039 桌面漫游输入与碰撞合同
主工作区 walk 模式由独立 `WalkthroughController` 接管（ALVA-079起统一绑定SceneView）：Pointer Lock + WASD/方向键 + 鼠标 yaw/pitch；相机方向通过 OrbitControls target 驱动，与 SceneView、ALVA-040 日照/季节 render loop 共存。碰撞从权威 SceneData 解析：墙体与旋转家具阻挡；仅 floor-level 且宽高足够的真实 door opening 放行，window 不作为通道。输入框聚焦、Esc、window blur 均清空按键并退出锁定，重新进入不得沿用旧输入。SceneView host/alvaView 重建时控制器重新绑定最新实例。


## 2026-09-26 · ALVA-042 已确认参考图偏好 Stage MCP 合同
生活设计阶段 MCP 现役工具 `get_confirmed_reference_preferences` 只返回 owner 已明确确认的参考图片视觉偏好及来源，pending/cancelled 永不进入返回。参考图只作为视觉偏好来源，不可证明尺寸、结构、真实材料身份或材料性能。确认前不写需求；确认时重新校验作用房间，不能覆盖锁定问卷答案。交付文本和 sidecar 明确带 `referencePreferences` / “参考图偏好·仅参考”。
