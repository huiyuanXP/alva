## ALVA-071 家具细节建模与视觉critic

署名 codex-furniture；in-progress；task/ALVA-071-codex-furniture；/home/ubuntu/Alva-worktrees/ALVA-071-codex-furniture。用户授权真实详细模型、MCP生成与多视角自检重试。占用 api/model.ts、api/business.ts、api/chat.ts、api/api.ts、api/furniture/、web/src/SceneView.tsx、BuildingView.tsx、main.tsx、web/src/scene/、packages/contracts/alva/。测试使用隔离数据与动态空闲端口，生产不变。

## ALVA-070 已集成；下一步为发布验收

070已done并释放渲染入口占用。main含SceneView交互修复，生产固定release尚未切换；发布时准备回滚，并在真实户型/浏览器核验门窗、旋转、选择和阴影观感。独立Worktree与证据保留。其他任务署名、依赖和范围不变。

## 2026-09-26 ALVA-069 已集成，未发布

ALVA-069 左侧对话体验：用户/助手窄气泡、常见Markdown安全渲染、阶段交接专用重试与独立提示已合入main。合并候选分组类型、构建、阶段回归2/2、桌面/窄屏浏览器通过；页面错误0。生产固定release未切换，未发布。详情见 docs/ALVA-069-chat-ui.md。

## 2026-09-26 ALVA-068 已生产发布并复验

用户授权发布已完成：固定main `6eef743`，08:30 UTC上线。公网资源与已验构建一致、有效登录、当前floorplan实际inspect_topology、独立问卷入口通过，最终只读复验设计/问卷/候选/保存状态不变，页面错误0。生产当前处于户型阶段，未替用户确认建筑；生活问卷确认同步以本票隔离真实链路验收为据。

生产现由ALVA068-release.conf固定到私有release目录，main后续提交/构建不会自动发布；To Do List仍读取main。备份、回滚、失败run与验收边界见[发布收据](docs/ALVA-068-production-release.md)。068临时预览已恢复，CPU80%/总内存20%/swap0；旧066应用仍停止。其他票状态不因发布自动改变。

neat-freak已同步代码、运行态、合同和文档；生成记忆out-of-scope，备份及私有复核现场保留。以下带未发布字样的旧检查点为当时状态，以本节及发布收据为准。

## 2026-09-26 ALVA-068 当前临时预览

用户要求的最新main同步已完成，候选2380658在068 Worktree通过类型/构建、公网登录与Chat页面检查。当前链接 https://chamber-supposed-boring-opponents.trycloudflare.com ，详情见[068预览记录](docs/ALVA-068-outcome-questions.md)。测试项目为合成Alex/Sam，生产未改。

新应用4188与Tunnel共用20%总内存/0swap/CPU80%预算。旧066应用暂时停止，原库和Tunnel保留；不得同时对068预览库运行验收探针。服务、私有配置及证据见专题文档。neat-freak已同步临时运行态；原复核现场保留。

## 2026-09-26 ALVA-068 已验收并集成，未发布

主Chat先展示未确认的需求猜测、依据与不确定项，再提供具体结果/示例/取舍。确认后同步同一填写者的Home Vision原字段与扩展问答；独立问卷保留，修改后旧扩展结论失效，Chat重读新版本。生活设计MCP为默认入口，错误提供稳定码及修复步骤；确认使用数字版本，不用哈希。

真实主Chat/HTTP MCP三轮及浏览器双向同步通过，最终分组类型检查、26/26相关回归、前端构建与To Do List浏览器检查通过，CPU80%/20%总内存/0swap，无OOM。详情与边界见[ALVA-068](docs/ALVA-068-outcome-questions.md)。新题卡窄栏可用；整个主工作区仍有既有手机横向溢出，bundle警告保留。

068已done并释放占用；057继续ready-for-agent，042保留署名，030/033依赖就绪待认领，不自动开工。本票未发布生产。neat-freak：代码/文档/票据changed-and-verified，规则verified-current，发布/生成记忆out-of-scope；私有合成现场、失败证据与Worktree保留供复核。

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

## ALVA-066 两阶段 MCP：codex-stage-mcp 已认领
## ALVA-067 发布完成；下一步066同步main

已发布主Chat Gemini 3.8及等待圆点上方的最新浅色进度。类型/构建、本次5组桌面手机浏览器和公网登录只读核验通过；模型接口3.8、JS/CSS哈希一致、页面错误0、项目revision不变。备份与回滚在.runtime/ALVA067-release-20260926T045448Z/；详情见[发布收据](docs/ALVA-067-chat-model-progress.md)。066验收环境未改，仍需同步main并重验阶段MCP。


## ALVA-067 已集成；ALVA-066 下一步同步新模型与进度展示

主Chat已切为 Gemini 3.8 Flash High；保留等待圆点，最新工具进度改为其上方浅色文字，不再进入顶部横幅。类型/构建、17/17回归、桌面/手机与真实Chat工具调用通过；[ALVA-067](docs/ALVA-067-chat-model-progress.md)记录证据及失败run。2026-09-26已部署并完成公网登录只读核验；066验收工作区未改，须同步main后重跑受影响阶段MCP门禁。

## 2026-09-26 ALVA-057 问卷视觉修订发布

main `f9fd9ef` 已上线入口耳麦、长题提示分层及语义选项图标；发布收据见 `docs/ALVA-057-questionnaire-release.md`。057 阶段 MCP 仍待 066 联验，状态 in-progress。

## 2026-09-26 ALVA-057 文案精简发布

main `23a79da` 已上线问卷单问句与选项标签精简，收据见 `docs/ALVA-057-questionnaire-release.md`；057 阶段 MCP 仍待 066 联验，状态 in-progress。

## 2026-09-26 ALVA-057 界面反馈发布

main `39bc74f` 已上线五项问卷界面修订，详情见 `docs/ALVA-057-questionnaire-release.md`；057 仍待 066 阶段 MCP 联合验收，状态 in-progress。

## ALVA-066 当前检查点：43f4466，继续最终联合门禁

066独立Worktree已提交 `43f4466`。原图项目的真实分类→Markdown→复核→页面保存v1/刷新、交付生成中取消及重新生成/ZIP哈希、日照/房间聚焦真实回执均已通过。确认回答自动家具建议发现碰撞失败被冒称无需求，现按实际失败记录拒绝skip，并通过MCP返回尺寸/占地及同校验器验证的位置供模型修复；4/4回归与确认后自动生成待采用候选实测通过，草稿不触发、原场景不变。最新固定源码类型检查通过。

原floorplan thread恢复/仅讨论不清空；页面明确重开后失效旧设计，实际门窗宽度合成修改/校准/拓扑v2确认、现役模型建筑重生成、页面确认并恢复原living thread及立即送达失效摘要已通过。实际用途提案/页面确认和参考图片偏好候选也通过。所有中途失败保留，不拼成尚未完成的最终同候选整票结论。证据详见个人Worktree票内2026-09-25原图项目保存、交付与跨阶段检查点。

下一步在固定候选完成最终联合回归/构建、029分类→Markdown→review→保存和剩余业务门禁，再main产品集成/备份发布及生产验证。066/029仍in-progress；040/057保持各自署名与边界，生产未变。共享heavy锁继续串行CPU80%/1200M/swap0，当前过程检查已结束。

neat-freak：局部实测/类型verified-current，完整交付及生产pending；MCP优先合同verified-current，生成记忆out-of-scope，所有私有现场/失败证据/未完成Worktree保留。

## 2026-09-25 ALVA-065 已完成；下一项为主 Chat 识图接入

主 Chat 的入口、Agent 身份、Harness 与后续功能接入 Prompt 已固定，见[ALVA-065](docs/ALVA-065-main-chat-agent.md)。下一项应从“Chat 上传户型图 → Agent 实际调用识图工具 → 返回待校正候选”开始，随后接建筑生成；须另票按认领规则实施。已有直接上传和生成按钮仍可用，但不计作 Chat 接入。

## 2026-09-25 ALVA-064 已发布并验收

图片户型识别默认 Gemini 3.8 Flash High/high 已在生产 `alva.service` 生效；公网登录后只读验收通过，项目 revision 不变、页面错误 0。实现提交 `4870b0d`，备份、回滚和证据见[发布记录](docs/ALVA-064-gemini-default-release.md)。同会话截图自查仍是隔离流程；户型准确性待用户对照原图。ALVA-028 后续已集成，当前状态以单票为准。

## 2026-09-25 ALVA-036 正式完结

手动全局快照已验收并集成，后随 ALVA-064 的 main 构建发布到生产；公网资源与本机构建哈希一致。生产保存写入未单独验收，隔离保存验收和发布边界见[单票交接](.scratch/alva-completion/issues/29-manual-snapshot.md)。ALVA-037 已于 2026-09-26 完成并集成只读快照预览；ALVA-038 已解锁，可继续实现明确恢复。


## 2026-09-25 协调清理与根目录锁观察

用户已授权提交错别字修正、整理旧协调记录及保留旧验收证据。ALVA-024/025/028 已按单票及 main 提交完成，ALVA-040 本轮已完成真实验收并进入 main 集成与部署；ALVA-057 仍由原署名负责阶段MCP联合验收。

- 记录时间：**2026-09-25 18:49:54 UTC**。
- 观察对象：`/home/ubuntu/Alva/alva-coordination.lock`（根目录空文件）；当前未检测到实际持锁者。正式协调锁仍为 `.git/alva-coordination.lock`，不受此规则影响。
- 12 小时检查时间：**2026-09-26 06:49:54 UTC**。用户已授权：届时仍遗留且无人认领，自动释放该根目录残留文件。
- 定时器：用户级 `alva-root-lock-expiry.timer` 已安排；检查脚本 `.runtime/alva-lock-expiry/release.py`，结果 `.runtime/alva-lock-expiry/result.json`。只有文件身份未变、无人认领且能够非阻塞取得锁才删除；实际持锁、文件变化或认领后保留，不终止进程、不删除正式协调锁。
- 若认领此残留锁，必须把下一行标记中的 `unclaimed` 改为实际署名，定时器将保留文件。
<!-- alva-root-lock-owner: unclaimed -->

执行结果：2026-09-26 06:49:54 UTC定时器已释放身份未变且无人认领的根目录残留锁；正式协调锁保留。

旧 053/056 复核证据目录已归档提交；历史分支和其他 Worktree 保留。未完成预览分支不在本次清理范围。重型任务仍使用任务资源限额与共享锁串行运行。

## 当前集成偏好

后续 Ticket 统一采用“独立 Worktree 开发 → 完整验证 → 自动合入 `main`”流程。验证未全部通过时保留在 Worktree，不合入主线；验证通过后由执行 Agent 自动完成合入与中文提交，无需另行等待确认。

## 当前可以认领的全部任务

下表按正式Ticket依赖计算；所有前置必须已验收并集成到 main，不能仅在个人分支完成。已署名行仍保留直到集成完成，其他人不能再次认领。未满足依赖的票只在[完整tracker](.scratch/alva-completion/README.md)保留，不提前填入此表。

| Ticket | 任务 | 并行组 | 署名（填入即认领） | 分支 / Worktree | 预计共享文件、端口与状态 |
|---|---|---|---|---|---|
| [ALVA-049](.scratch/alva-completion/issues/42-acceptance-groups-5-8.md) | 验收组5–8 | `acceptance-scene` | lzy | 已合并 main；Worktree 已释放 | 编辑/保存/交付/桌面真实回归，独立 Cloudflare 通道；done |

当前依赖就绪项为“依赖就绪、条件可并行”，不保证任意两项都没有代码冲突。其余可同时认领各自负责的模块。任务编号不是锁，署名及共享文件登记才表示占用。


## 认领与 Worktree 规则

1. **唯一认领板**是 main 工作目录 `/home/ubuntu/Alva/NextTask.md`，不是个人 Worktree 中的旧副本。同一时刻只有一人更新认领/集成状态。使用共享 Git 目录中的 `alva-coordination.lock` 做短时 `flock` 互斥；锁内重新读取最新认领表和依赖，检查主工作树没有他人未提交改动，确认署名为空。
2. 在所选任务后填写稳定署名（姓名或用户/Agent标识）；**署名写入即认领**。同时登记分支、Worktree、预计修改的共享文件及测试端口，将该票状态设为 `in-progress`。以 `chore(claim): ALVA-xxx by <署名>` 单独提交认领记录；不得覆盖他人署名。认领提交是协调记录，不算该票的实现提交。
3. 从最新 main 新建独立分支和 Worktree：分支 `task/ALVA-xxx-<owner>`，目录 `/home/ubuntu/Alva-worktrees/ALVA-xxx-<owner>`。一个任务一个 Worktree，禁止多人在主工作目录或同一 Worktree 写产品代码。建目录失败时保留署名并记录原因，或本人按释放流程取消认领，不能悄悄抢占另一任务。
4. 进入自己的 Worktree 后先读 AGENTS、当前票、直接依赖及[文件规范](docs/PROJECT-STRUCTURE.md)。路径规范相对当前 Worktree 生效，不硬编码主目录。依赖必须来自已集成 main，不以另一个未完成分支作为基础，不交叉 cherry-pick 未验收功能。
5. 各 Worktree 使用独立依赖安装、构建输出、合成数据库、上传、证据目录和空闲端口；`.runtime/` 不共享，不复制生产配置或连接生产数据库。证据命名包含Ticket和唯一run ID。业务源码、测试、票内交接记录在自己的 Worktree 修改。
6. 个人分支不改共享认领表、tracker汇总、根Handoff/GlobalHandoff/PROGRESS，以免旧副本覆盖新认领；本票交接先写入票内 `Implementation handoff`（完成情况、验证、提交、遗留）。全局收尾由集成人在 main 串行完成。

## 并行可行性与冲突约束

| 并行组 | 主要职责 | 同组约束 |
|---|---|---|
| access | 登录、设计师权限 | 会话和鉴权修改串行 |
| import / topology / building | 导入、拓扑、Codex建筑生成 | 各组内部串行，跨组按正式依赖；共同场景合同需协调 |
| questions / chat / proposals | 问卷、咨询、候选确认 | 各组内部串行；聊天工具和消息协议跨组需协调 |
| furniture / review | 家具、审查 | 各组内部串行；对象/规则引用跨组需协调 |
| snapshots / references / delivery | 快照、图片偏好、交付 | 各组内部串行；快照与导出合同跨组需协调 |
| render | 场景视角、漫游、光照 | 渲染入口修改串行 |
| acceptance-business / acceptance-scene | 两批最终回归 | 可并行，必须同一候选代码SHA、独立数据/端口/证据 |
| production | 公网、重启、备份恢复 | 串行独占，实施须在获准发布范围内 |

- 同组默认一次一个执行者；不同组还必须检查文件归属。`api/api.ts`、`api/chat.ts`、`api/business.ts`、`api/model.ts`、`api/store.ts`、`web/src/main.tsx`、`web/src/Panels.tsx`、`web/src/SceneView.tsx`、共享schema、package.json和锁文件都是常见冲突点。
- 认领时在表中登记本票确实需要改的共享文件。相同共享文件已有署名占用时，后认领者可做其余独立文件，状态注明“等待共享文件”，不能自行修改被占用部分。由两位负责人商定先集成谁；接口/schema变更方先集成，另一方同步 main 后继续。无独立部分可做时暂停该任务，不以Worktree隔离当作无冲突保证。
- 不为绕开冲突另建重复schema/存储层，不改他人分支、不覆盖他人实现。文件冲突不是产品依赖，登记为临时协调阻塞，不随意改Ticket原始依赖。
- 最终回归若修复代码，必须重新确定候选SHA并复跑受影响组；不能把不同代码版本的通过结果拼成最终验收。

## 提交、集成与后续解锁

1. **个人完成**：在自己的 Worktree 完成本票验收，提交 `feat/fix/test(ALVA-xxx): <结果>`，把实现提交SHA和验证证据交给集成人。可以有过程提交；最终 main 每票保留一个实现提交。个人提交后仍保留署名，不删任务，不将票标done，不提前解锁后继。
2. **集成前同步**：集成由当前协调人（可由任务负责人担任）串行完成。负责人先合入最新 main 并解决冲突、复跑受影响检查；保持根共享文件采用 main 最新内容，补充的任务交接保留在票内。集成人持有同一协调锁，重新检查署名、依赖、共享工作树及提交范围。
3. **合入并验证**：在 main 对该任务分支执行 squash 集成。仅集成本票实现、测试、证据及票内交接；不得引入个人副本的旧认领表。验证集成结果，测试使用隔离端口/数据；不因合入而自动部署或重启生产。失败则不提交done、不移除署名；只撤回本次集成暂存内容并保留任务分支/证据，严禁重置他人改动。
4. **同一次实现提交收尾**：验证成功后，将该票标 `done`，在票中保留完成人署名、分支、原实现SHA和证据。然后从本表移除该任务整行（署名也随行移除），覆盖Handoff/NextTask，更新PROGRESS/必要的GlobalHandoff与tracker摘要。将这些协调收尾与实现一起提交到 main，使“代码可用”和“任务完成”同时生效。最终集成提交可由 `git log --grep=ALVA-xxx` 追溯，无需在提交内填写自身SHA。
5. **重新计算所有任务**：遍历44票，取所有非done且全部直接前置为done的票。保留其中已有署名行，新增所有刚解锁任务并留空署名；移除已done行。没有技术前置的任务也需列入，不只查看相邻编号。若需外部资源而暂时blocked，仍保留行、署名和阻塞原因，不冒充完成。
6. **中断或释放**：未完成时不得删任务。本人在协调锁内清空署名/分支占用，将票恢复ready-for-agent（外部阻塞则保留blocked），登记已有分支和进度供接手；后继不解锁。不能静默清除他人署名，失联任务须协调人明确确认交接。
7. **Worktree清理**：只有集成提交和验证均完成、工作树无未提交内容后，才能移除对应已完成Worktree和分支；保留原实现SHA的可达引用或标签，避免squash后失去原提交。不得删除未完成或含独有工作的Worktree。移出任务清单与删除工作目录是两个动作。

认领与集成示例（占位符需替换；本轮不执行）：

```bash
# 开一个短时协调会话；此会话内重读认领表、署名并提交，然后退出释放锁
flock /home/ubuntu/Alva/.git/alva-coordination.lock bash
# 在协调会话中使用主目录；不得在持锁期间跑耗时开发
cd /home/ubuntu/Alva
git add NextTask.md .scratch/alva-completion/issues/<本票文件>.md
git commit -m "chore(claim): ALVA-xxx by <owner>"
exit

# 认领成功后创建独立工作区，从包含认领记录的最新 main 开始
git -C /home/ubuntu/Alva worktree add -b task/ALVA-xxx-<owner> /home/ubuntu/Alva-worktrees/ALVA-xxx-<owner> main
```

运行长时间集成验证时会占用协调锁，期间其他开发可继续自己的Worktree工作；认领/状态更新等锁释放后重读再做。不要用聊天中的“我准备做”代替表内署名。

## 不变的产品范围

无预算；只考虑理想WebGL机器。只有手动保存创建全局快照，点击快照预览、明确恢复后整体替换；无逐操作历史、撤销或自动存档。ALVA-046/047在其他功能完成后，ALVA-048–051负责最终验收与发布复核。协作规则本身不授予生产变更或第三方通讯权限。


只读展示入口：https://prod.huiyuanxp.com/todo 。Ticket与本表在main更新后自动反映到看板；认领仍在本表进行。



ALVA-054 已完成集成：新增“聊聊你的家”逐题问卷；生产发布状态见 docs/ALVA-054-home-intake.md。ALVA-028 后续已集成。

## 拓扑质量补充任务

| Ticket | 署名 | 工作区与范围 | 状态 |
|---|---|---|---|

## ALVA-057 Your Home Vision

| 任务 | 署名 | 工作区与边界 | 状态 |
|---|---|---|---|
| [ALVA-057](docs/ALVA-057-home-vision.md) |  | 既有实现保留在 task/ALVA-057-xuanpu-chat-6pro；/home/ubuntu/Alva/.runtime/worktrees/ALVA-057-xuanpu-chat-6pro；恢复提交 53a39fc | ready-for-agent；用户要求释放原认领。问卷业务已发布；066阶段MCP已就绪，剩余联验待新负责人认领；068已获授权的共享入口接线继续由068负责，认领前先核对其文件占用 |

恢复提交 `53a39fc`，类型/40项回归/13组浏览器/构建通过。现役dynamicTools读取适配不等于阶段MCP接入；问卷业务已合main并生产发布；066阶段MCP运行层已集成，本票尚需联验，下一步见票据。当前无执行进程或重任务占用，重新实施前核对共享文件。

用户批准新版预算采集，不扩展自动报价。保留独立Git索引、共享重任务锁、CPU80%/1200M（浏览器1600M）与资源采样；不改MCP/生产资源配置。原yang-chatgpt分支及Worktree保留，不清场。
