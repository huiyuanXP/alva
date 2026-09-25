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
