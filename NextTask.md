# What's next · 任务认领与并行开发

## 2026-09-25 ALVA-036 已验收集成

手动全局快照、失败回滚与幂等重试已通过 main 集成态的类型检查、24/24 相关回归、构建和真实 Chromium 验收。后续移除无效用途提案夹具与 422 豁免，main 再跑快照 13/13 和 Chromium 8 项流程通过；证据见[单票交接](.scratch/alva-completion/issues/29-manual-snapshot.md)。本票执行占用释放，后继 ALVA-037 已依赖就绪，可在署名认领后开工。未部署或重启生产服务；其他署名保持不变。

## 2026-09-25 ALVA-061 Codex Gemini profile 已完成

本机 Codex 用户配置已有单一 `gemini` profile，复用 `newapi` provider；模型目录包含 `gemini-3.6-flash-high`、`gemini-3.7-flash-high`、`gemini-3.8-flash-high`，默认 3.8，可在 Codex 模型设置中切换。三个型号均已通过原生 CLI 的最小真实调用。此任务无后续执行占用；业务服务模型和生产配置未变。交接见 [ALVA-061](docs/ALVA-061-codex-gemini-profile.md)。

## 2026-09-25 ALVA-062 已完成，Gemini 预览待用户核对

当前临时公网入口展示 Gemini 3.8 的 20 墙/6 房/9 门窗候选；原生业务导入因两轮 schema 不合格而失败，隔离字段映射后可渲染并通过结构检查。完整证据、原始结果和服务位置见[ALVA-062](docs/ALVA-062-gemini-preview.md)。本任务不占用产品票认领；028 继续暂停。

## 2026-09-25 ALVA-060 已集成，历史预览已切换

该临时公网入口此前展示 Codex GPT-6 Luna xhigh 的首轮识图候选。使用原有 `OPENAI_VISION_MODEL` 参数和新增推理强度参数，17 墙/10 房/5 门窗可渲染，但确认拓扑失败且有 15 项诊断问题。结果、截图、原 MiMo 保留位置和停用方式见 [ALVA-060](docs/ALVA-060-codex-luna-preview.md)。本票执行占用释放；预览运行态保留供用户查看，不能自动采用候选。其他署名与 ALVA-028 暂停状态不变。

## 2026-09-25 ALVA-059 预览交接

ALVA-056 已合入 main；按用户要求建立的 MiMo 候选独立预览已完成并验证，历史截图与隔离数据见 [ALVA-059](docs/ALVA-059-mimo-render-preview.md)。同一链接曾由 ALVA-060 展示 Luna 候选，现由 ALVA-062 展示 Gemini 候选；不占用产品票认领，028 继续暂停。后续若要评价户型准确性，需对照原图由用户校核，不能以结构检查和渲染替代。

## 2026-09-25 ALVA-053/056已完成

53已集成`97c0ae7`；56个人实现`fbfe8e8`经最新main基线的类型/36项相关回归和5轮输出回放通过，已在本次main集成。两票不再占用执行资源；下一步不重复模型调用或自动部署。收据`evidence/20260925T084025Z-ALVA056-integration-3bc356/`，边界见单票和CURRENT。其他署名保持不变，028继续用户暂停。以下重启Pending记录仅保留仍未开工的028。

## Pending 恢复队列（2026-09-25）

用户明确授权本轮由协调人将已中断/暂停工作退回待办，释放的是当前执行占用，不删除历史负责人、分支、工作区或证据。pending不是done，也不是自动重新开工。44票看板不接受字面Status=pending；产品待办沿用ready-for-agent并在票内写Execution state=pending，额外维护票直接使用pending。此处是恢复索引，不另建产品状态数据库。

| 对象 | 当前待办原因 | 保存的位置 | 恢复后的第一步 |
|---|---|---|---|
| [ALVA-028](.scratch/alva-completion/issues/21-initial-pain-analysis.md) | pending：用户原先要求暂停，尚未实施 | 历史负责人yang-chatgpt；f3aedbb工作区保留 | 等新的开工指令，确认ALVA-015证据与共享文件，重新登记署名后实施三个正反例及来源/幂等验收 |

额外保护：`bugfix/floorplan-structured-output-preview`有5个未提交文件，当前无对应工作区执行进程，未编号、未集成；恢复前由原负责人核对，不新建假完成票、不覆盖或清理。ALVA-054整体done保留，其线上登录后核验仍是票内单独未完成边界，不因本次重启伪造通过。

取证与保护清单：[docs/INCIDENT-2026-09-25-server-recovery.md](docs/INCIDENT-2026-09-25-server-recovery.md)；`evidence/20260925T034733Z-server-recovery-2cae71/`。本轮所有复核命令串行、轻量，不执行重建/浏览器/模型。重型任务恢复前确认前一个进程已结束，先制定任务级CPU/内存限额与采样方案；本次不改变服务配置，不以多开重试解决卡顿。

当前已完成并集成 ALVA-008–013、ALVA-014–019、ALVA-043；其余正式票仍按依赖和验收状态管理。本次ALVA-052只接入只读任务看板。最新用户决定允许满足条件的任务在独立 Worktree 并行，覆盖此前“所有任务串行/其余票必须等首批全部完成”的安排；登录/导入/3D仍优先，但只有正式依赖构成阻塞。U16最后功能约束保留。

运行边界已于 2026-09-22 覆盖更新：`/home/ubuntu/aws-hackthon` 全目录归档且不使用；Coding Machine MCP 仍临时依赖其中 `.venv-mcp` 与 `.mcp-runtime`。现役密码来源、旧副本删除记录和迁移前提见 [远端访问](docs/REMOTE-ACCESS.md)。

## 当前集成偏好

后续 Ticket 统一采用“独立 Worktree 开发 → 完整验证 → 自动合入 `main`”流程。验证未全部通过时保留在 Worktree，不合入主线；验证通过后由执行 Agent 自动完成合入与中文提交，无需另行等待确认。

## 当前可以认领的全部任务

下表按正式Ticket依赖计算；所有前置必须已验收并集成到 main，不能仅在个人分支完成。已署名行仍保留直到集成完成，其他人不能再次认领。未满足依赖的票只在[完整tracker](.scratch/alva-completion/README.md)保留，不提前填入此表。

| Ticket | 任务 | 并行组 | 署名（填入即认领） | 分支 / Worktree | 预计共享文件、端口与状态 |
|---|---|---|---|---|---|
| [ALVA-028](.scratch/alva-completion/issues/21-initial-pain-analysis.md) | 首次需求分析与生活痛点 | `review` |  |  | pending；用户此前要求暂不实施；2026-09-25释放当前执行占用，历史yang-chatgpt/f3aedbb与Worktree保留；详见票内恢复记录，新的开工指令前不实施 |
| [ALVA-031](.scratch/alva-completion/issues/24-designer-readonly.md) | 设计师只读访问与撤销 | `access` |  |  | 待认领；开工前登记 |
| [ALVA-037](.scratch/alva-completion/issues/30-snapshot-preview.md) | 快照列表与只读状态预览 | `snapshots` |  |  | 依赖 ALVA-036 已完成；待署名认领，不自动开工 |
| [ALVA-040](.scratch/alva-completion/issues/33-sunlight-seasons.md) | 昼夜季节与地理假设 | `render` |  |  | 依赖已完成；待署名认领 |
| [ALVA-041](.scratch/alva-completion/issues/34-reference-annotation.md) | 参考图片偏好标注 | `references` |  |  | 待认领；开工前登记 |
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


只读展示入口：https://prod.huiyuanxp.com/todo 。Ticket与本表在main更新后自动反映到看板；认领仍在本表进行。ALVA-052维护任务已完成本地验收，集成收尾见Handoff。


## 独立维护任务（不计入44张产品票）

| 任务 | 署名 | 工作区与边界 | 状态 |
|---|---|---|---|
| [ALVA-053 模型与拓扑诊断](docs/ALVA-053-model-topology-audit.md) |  | chatgpt-recovery已完成；task/ALVA-053-recovery-20260925 / .runtime/worktrees/ALVA-053-recovery-20260925；17a6308；诊断与解析修复已集成，不是生产户型正确性验收 | done |


ALVA-054 已完成集成：新增“聊聊你的家”逐题问卷；生产发布状态见 docs/ALVA-054-home-intake.md。ALVA-028仍按用户要求暂停。

## 拓扑质量补充任务

| Ticket | 署名 | 工作区与范围 | 状态 |
|---|---|---|---|

## ALVA-057 Your Home Vision

| 任务 | 署名 | 工作区与边界 | 状态 |
|---|---|---|---|
| [ALVA-057](docs/ALVA-057-home-vision.md) | yang-chatgpt | task/ALVA-057-yang-chatgpt；/home/ubuntu/Alva-worktrees/ALVA-057-yang-chatgpt；questions；api/intake、api/model.ts、web/src/intake、web/src/main.tsx、packages/contracts/alva/home-vision；测试4287 | in-progress |

用户2026-09-25明确按新版MD/Word/3个ZIP实施并沿用生产发布授权；预算问答为本次附件明确范围，覆盖旧问卷无预算限制，仅问卷采集，不扩展自动报价。沿用恢复任务的独立Git索引，只提交本票，保留ALVA-056原暂存/未提交成果。重任务串行，任务级限额CPU100%、内存1200M（浏览器1600M），留采样；不修改MCP/生产资源配置。
