## ALVA-066 当前检查点：35088ef，继续原图实测

066个人Worktree最新 `35088ef`：长调用HTTP MCP改用显式限时node:http，修复约300秒桥接中断；识图错误保留VISION_OUTPUT_JSON/SCHEMA/GEOMETRY及修复说明。真实Chat附件选择/上传及原字节SHA验证通过，但两轮真实识图尚未成功：第一轮传输中断，第二轮明确缺少geography.assumption，已补仅描述未核实状态的有限兼容，数值/几何不补造。下一步同附件原thread复测；辅助模型原始输出保留在隔离run私有目录。

进入阶段立即用thread/inject_items送达快照/摘要已装配，真实新进程Resume读到注入nonce且摘要只1次；thread/read不含原始注入项，恢复去重验证本stage私有rollout身份后读取。注入失败在页面明确提示及重试，不冒充已送达。19/19相关回归与构建通过；浏览器连续输入12次保持同一个3D renderer，修复新样式对象导致的重建，并释放旧WebGL上下文。

此前同一合成建筑项目/原living thread的真实Chat→Markdown→review→请求保存→页面确认v1与刷新通过，汇总在个人Worktreeevidence/20260925T2026Z-ALVA066-living-joint-checkpoint/result.json；不能替代原图/建筑/跨阶段失效的最终同SHA链路。仍需完整业务异常/重启与交付、最终门禁、main产品集成和备份发布。066、029及其他未完票保持in-progress，生产未变。重任务继续共享锁串行CPU80%/1200M/swap0，当前检查均已结束；后续原图复测将继续占用独立窗口。

neat-freak过程事实已同步，局部证据verified-current；整票/生产pending，生成记忆out-of-scope；所有未完成Worktree、失败与私有原始输出保留。

# What's next · 任务认领与并行开发

## 2026-09-25 ALVA-065 已完成；下一项为主 Chat 识图接入

主 Chat 的入口、Agent 身份、Harness 与后续功能接入 Prompt 已固定，见[ALVA-065](docs/ALVA-065-main-chat-agent.md)。下一项应从“Chat 上传户型图 → Agent 实际调用识图工具 → 返回待校正候选”开始，随后接建筑生成；须另票按认领规则实施。已有直接上传和生成按钮仍可用，但不计作 Chat 接入。

## 2026-09-25 ALVA-064 已发布并验收

图片户型识别默认 Gemini 3.8 Flash High/high 已在生产 `alva.service` 生效；公网登录后只读验收通过，项目 revision 不变、页面错误 0。实现提交 `4870b0d`，备份、回滚和证据见[发布记录](docs/ALVA-064-gemini-default-release.md)。同会话截图自查仍是隔离流程；户型准确性待用户对照原图。ALVA-028 后续已集成，当前状态以单票为准。

## 2026-09-25 ALVA-036 正式完结

手动全局快照已验收并集成，后随 ALVA-064 的 main 构建发布到生产；公网资源与本机构建哈希一致。生产保存写入未单独验收，隔离保存验收和发布边界见[单票交接](.scratch/alva-completion/issues/29-manual-snapshot.md)。ALVA-037 仍可认领，ALVA-038 仍依赖 037；旧“历史”入口不代表两票完成。


## 2026-09-25 协调清理与根目录锁观察

用户已授权提交错别字修正、整理旧协调记录及保留旧验收证据。ALVA-024/025/028 已按单票及 main 提交完成，移除过期执行占用；ALVA-040 尚未完成，恢复待认领。ALVA-057 保留原署名与未集成状态。

- 记录时间：**2026-09-25 18:49:54 UTC**。
- 观察对象：`/home/ubuntu/Alva/alva-coordination.lock`（根目录空文件）；当前未检测到实际持锁者。正式协调锁仍为 `.git/alva-coordination.lock`，不受此规则影响。
- 12 小时检查时间：**2026-09-26 06:49:54 UTC**。用户已授权：届时仍遗留且无人认领，自动释放该根目录残留文件。
- 定时器：用户级 `alva-root-lock-expiry.timer` 已安排；检查脚本 `.runtime/alva-lock-expiry/release.py`，结果 `.runtime/alva-lock-expiry/result.json`。只有文件身份未变、无人认领且能够非阻塞取得锁才删除；实际持锁、文件变化或认领后保留，不终止进程、不删除正式协调锁。
- 若认领此残留锁，必须把下一行标记中的 `unclaimed` 改为实际署名，定时器将保留文件。
<!-- alva-root-lock-owner: unclaimed -->

旧 053/056 复核证据目录已归档提交；历史分支和其他 Worktree 保留。未完成预览分支不在本次清理范围。重型任务仍使用任务资源限额与共享锁串行运行。

## 当前集成偏好

后续 Ticket 统一采用“独立 Worktree 开发 → 完整验证 → 自动合入 `main`”流程。验证未全部通过时保留在 Worktree，不合入主线；验证通过后由执行 Agent 自动完成合入与中文提交，无需另行等待确认。

## 当前可以认领的全部任务

下表按正式Ticket依赖计算；所有前置必须已验收并集成到 main，不能仅在个人分支完成。已署名行仍保留直到集成完成，其他人不能再次认领。未满足依赖的票只在[完整tracker](.scratch/alva-completion/README.md)保留，不提前填入此表。

| Ticket | 任务 | 并行组 | 署名（填入即认领） | 分支 / Worktree | 预计共享文件、端口与状态 |
|---|---|---|---|---|---|
| [ALVA-066](docs/ALVA-066-stage-mcp.md) | 两阶段 MCP 与持久 Chat | `chat` | codex-stage-mcp | task/ALVA-066-codex-stage-mcp / /home/ubuntu/Alva-worktrees/ALVA-066-codex-stage-mcp | in-progress；先 api/codex.ts、api/mcp、独立探针；后 api/chat.ts、store、model、api.ts 与 web 入口需衔接057；端口使用127.0.0.1动态分配 |
| [ALVA-031](.scratch/alva-completion/issues/24-designer-readonly.md) | 设计师只读访问与撤销 | `access` |  |  | 待认领；开工前登记 |
| [ALVA-037](.scratch/alva-completion/issues/30-snapshot-preview.md) | 快照列表与只读状态预览 | `snapshots` |  |  | 依赖 ALVA-036 已完成；待署名认领，不自动开工 |
| [ALVA-040](.scratch/alva-completion/issues/33-sunlight-seasons.md) | 昼夜季节与地理假设 | `render` | chatgpt-sunlight | task/ALVA-040-chatgpt-sunlight / /home/ubuntu/Alva/.runtime/worktrees/ALVA-040-chatgpt-sunlight | in-progress；独立日照实现 7c5129e：17/17测试、类型/构建、13/13浏览器检查通过；主Chat/MCP及UI action回执待066；不改057/066/029共享入口；未集成/未部署 |
| [ALVA-042](.scratch/alva-completion/issues/35-preference-confirmation.md) | 偏好确认与后续建议引用 | `references` |  |  | ALVA-041、ALVA-015 已完成；待认领 |
| [ALVA-029](.scratch/alva-completion/issues/22-layout-review.md) | 布局调整与保存前冲突复核 | `review` | xuanpu-chat-6pro | task/ALVA-029-xuanpu-chat-6pro / /home/ubuntu/Alva/.runtime/worktrees/ALVA-029-xuanpu-chat-6pro | in-progress；与066确认分类Markdown合同；独立实现dd6f948、证据交接8aa0f1a，类型/50项测试/构建通过；不改066共享入口；实际主Chat/MCP、保存前UI与同SHA联合验收待066；未集成/未部署 |
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
| [ALVA-057](docs/ALVA-057-home-vision.md) | xuanpu-chat-6pro | task/ALVA-057-xuanpu-chat-6pro；/home/ubuntu/Alva/.runtime/worktrees/ALVA-057-xuanpu-chat-6pro；questions；api/intake、api/model.ts、api/chat.ts、web/src/intake、web/src/main.tsx、packages/contracts/alva/home-vision、相关脚本/测试；测试4287 | in-progress；业务已验，阶段MCP待ALVA-066 |

恢复提交 `53a39fc`，类型/40项回归/13组浏览器/构建通过。现役dynamicTools读取适配不等于阶段MCP接入；业务未合main、未生产发布，下一步见票据。当前无执行进程或重任务占用，重新实施前核对共享文件。

用户批准新版预算采集，不扩展自动报价。保留独立Git索引、共享重任务锁、CPU80%/1200M（浏览器1600M）与资源采样；不改MCP/生产资源配置。原yang-chatgpt分支及Worktree保留，不清场。
