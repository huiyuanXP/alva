# ALVA-029：分类用户信息与布局复核

Owner: **xuanpu-chat-6pro**。2026-09-26（Asia/Singapore）。

状态：独立模块实施与验证；**未合入 main、未部署、未完成主 Chat 联合验收，不标 done**。
认领提交 `e9ee173`。分支 `task/ALVA-029-xuanpu-chat-6pro`；工作区 `/home/ubuntu/Alva/.runtime/worktrees/ALVA-029-xuanpu-chat-6pro`。

## 与 ALVA-066 的实际协调

已通过 Herdr `w1:t1 / w1:p1` 向 `codex-stage-mcp` 发出请求并取得文件回复。源记录在 main 的私有协调目录：`.runtime/alva-coordination/ALVA-029-066-request.md`、`ALVA-066-029-reply.md`。066 的回复及追加回复确认了路径、分类、来源、原子代目录、接口、共享入口分工和审查复用规则。

029 负责 `api/user-context/`、`api/review/`、两份纯合同、测试与本票文档。066 负责主 Chat 分类提取、确认/拒绝/更正、Project 字段、成功持久化后的投影 hook、生活设计 MCP 注册、布局修改及保存前界面。029 未修改 `api/chat.ts`、`api/model.ts`、`api/store.ts`、`api/api.ts` 或 `web/src/main.tsx`，未修改 066 的 Worktree。

## 唯一用户信息位置

运行数据根为 `resolve(process.env.ALVA_DATA_DIR || '.runtime/alva-data')`，由服务端配置，不能接受模型路径。

```text
<ALVA_DATA_DIR>/user-context/<authorized-project-uuid>/
  current.json
  generations/
    <projectRevision>-<sourceFingerprint>/
      habits.md
      preferences.md
      requirements.md
      unresolved.md
      index.md
```

四类分别保存生活行为、视觉/材料偏好、明确功能需求以及未决/推断/拒绝/旧来源。旧版未分类的已确认答案留在 unresolved 并保留 confirmed 状态，不猜测所属类别或用户身份。每条含稳定 ID、原话、来源 message/evidence/question IDs、房间/对象范围、状态、更新时间与可选 supersedesId。

Project 数据库是唯一权威；Markdown 不能反向编辑数据库。只消费 confirmed 且未被有效更正的条目。待确认更正不能抹掉已确认事实；已确认更正/拒绝将旧条目标记为 rejected。原始证据不删除。来自 intake 分析的结论始终为 inferred，review 输出不反向进入用户资料，避免反馈污染。引用必须来自本项目真实用户消息/证据，原话必须能在引用中找到。

四个分类文件均含可阅读正文及转义的机器可读来源块。读取真的读取并解析 Markdown，不是只返回数据库里的假文件结果。用户正文是数据，不是 Agent 指令；代码围栏和 HTML 被转义。

## 原子性与失效

目录 0700、文件 0600。UUID/代目录严格校验，受控读取拒绝符号链接与非普通文件，不返回宿主机绝对路径。先完整写入临时代目录并 fsync，原子 rename，再原子替换 current.json。四分类 SHA256 位于 index.md；index 的 SHA256 仅在 current.json，避免自引用。读取逐个检查文件、哈希、版本和与权威输入的一致性，不静默退到旧代。

同输入写入幂等，保留 generatedAt；独占写锁避免并发混代，较旧 revision 不得覆盖较新指针。最多保留当前和前一代正常目录，不是自动产品快照。不自动删除未知残留。崩溃留下的 `.write.lock` 必须先确认无活跃写入，再由维护者处理；不以超时猜测方式偷锁。

确认已提交而投影刷新失败时，不能向用户声称数据库确认回滚。消费工具对 missing/stale/corrupt 最多重建一次，再重新读取 Project 校验；失败抛出结构化错误，不能显示“无冲突”。I/O、锁忙、来源错误不无限重试。

## 导出合同

`packages/contracts/alva/user-context.ts`：UserContextEntry、UserContextProjection、UserContextManifest、UserContextReadResult；`packages/contracts/alva/layout-review.ts`：LayoutReviewResult、LayoutReviewFinding、LayoutReviewDecision、LayoutReviewAdoption。

`api/user-context/index.ts`：

```ts
buildUserContextProjection(project): UserContextProjection
writeUserContextProjection(project, options?: {dataRoot?: string}): Promise<UserContextReadResult>
readUserContextProjection(project, options?: {dataRoot?: string}): Promise<UserContextReadResult>
assertUserContextCurrent(project, context): void
createUserContextTools({getProject, dataRoot?}): BusinessTool[]
```

输入兼容 `Project & {userContextEntries?: UserContextEntry[]}`，029 未改 Project 全局 schema。返回值有 manifest、entries、五份 markdown，不暴露绝对文件路径。

`api/review/index.ts`：

```ts
runLayoutReview(project, context): LayoutReviewResult
isLayoutReviewCurrent(project, context, review): boolean
recordLayoutReviewDecision(project, context, review, input): LayoutReviewResult
prepareLayoutReviewForSave(project, context, review): LayoutReviewAdoption
createLayoutReviewTools({getProject, dataRoot?, onReview?}): BusinessTool[]
```

`getProject` 是每次执行重新读取的 Promise 回调，必须由066绑定当前授权 Session。`onReview(result): Promise<void>` 可选，必须服务端原子持久化并核验 expectedRevision。工具返回 `{review, persisted}`；没有回调时 persisted=false，不能声称保存了审查。工厂不创建数据库、Codex 或 MCP 服务器，不接受模型提供 projectId/path。

工具名称固定为 `read_user_context` 和 `run_layout_review`，由066加入 `packs.living`。当前 handler 测试不等于实际阶段 MCP 或模型端到端验收。

`ContextProjectionError` 同时导出 `.code/.message/.retryable/.repairActions/.statusCode/.detail`。066 应把 `.detail` 映射到自有 McpError，保留 CONTEXT_MISSING、CONTEXT_STALE、CONTEXT_CORRUPT、CONTEXT_SOURCE_INVALID、CONTEXT_IO_FAILED、CONTEXT_BUSY、REVIEW_* 稳定错误码，而不是全部降成 TOOL_FAILED。

## 审查内容与边界

几何检查旋转占地、凹多边形边界和家具分离轴重叠；通行检查门洞两侧矩形占用，并在同一网格分别计算空房基线与含家具布局的门间可达性，只有基线可达而当前不可达才归因于家具。路径与门洞/阻挡家具 ID 一并返回。

行为/偏好检查有明确原话依据的宠物玩具空隙及避用材质；需求检查高绿植与采光，以及明确提出但尚未表达的书桌/收纳柜/咖啡机功能；家具检查咖啡操作台。只匹配受支持的字面规则，**不是通用自然语言需求推理或全部风格审查**。咖啡色、熊猫视频不等于做咖啡或养宠物。范围由 roomIds/objectIds 约束，旧证据与待确认模型推断不参与当前事实判断。

每项带稳定 ID、ruleId、原因、建议、对象/房间/路径、evidenceIds/contextEntryIds、置信。professional 是额外独立未知项，不能用生活偏好接受取舍关闭。

0.6 米筛查通行宽度、0.15 米网格、每房间 6400 格上限及咖啡/绿植阈值均为明确的 Demo 假设，不是法规或施工标准。缺少两个门、超大空间、空房基线不可达等情况返回 needs_information/limitations。未建模门扇方向、三维上下放置、真实设备尺寸或材料支撑；零提示不等于设计安全。任一新规则或语义变更须更新 algorithmVersion 并补验收。

## 版本、用户取舍与保存

结果绑定 projectId、实际审查 projectRevision、sceneFingerprint、contextFingerprint。文件读取必须匹配当前 revision。若之后只有审查持久化、用户取舍或保存等管理写入使 revision 递增，而两个输入指纹不变，可采用旧审查，但保留原 reviewedRevision；不能伪称重新分析。任一布局或用户资料指纹改变，旧审查立即过期。

用户取舍是针对 reviewId/findingId 的明确确认并附理由。accept_tradeoff 只确认用户接受该问题，defer 仍保留待处理；专业未知永不被偏好关闭。prepareLayoutReviewForSave 只生成采用凭证，既不自动复核也不创建快照。adoptedAtRevision 是用户采用时的工作版本；外层手动保存交易还会产生自己的 snapshot revision/version，两者不能混淆。

066 应将服务端审查与采用凭证纳入 Project，由现有手动全局快照机制保留。不接受模型/客户端伪造审查结果。问卷-only/无当前布局的草稿沿原有保存规则处理，不能为本票强迫生成布局。

## 验证与接入门

可复跑：`bash scripts/alva-029-validate.sh`。脚本串行获得共享 alva-heavy-task.lock、CPU80%、MemoryMax1200M、Swap0、独立 cgroup，保留日志与资源采样。单次执行可使用 `bash scripts/alva-029-run.sh <label> <command...>`。

测试覆盖真实 Markdown 读写、原子写/哈希损坏/符号链接/跨项目路径拒绝、来源与更正、三类生活痛点正反例与修复、房间范围、旋转/凹边界、通路阻塞与绕行、材质/功能冲突、版本失效、专业边界、工具回调新鲜度，以及实际 PGlite 快照保存失败回滚和同 requestId 重试。

验证结果与实现提交在本票 `Implementation handoff` 更新。首轮模块测试 33/34，发现待确认显式分类重复生成原始证据投影，已修复；失败记录保留，不能把第一次运行写成全部通过。

联合门仍待066：真实 Chat 提取→用户确认/更正→分类 Markdown→实际 living MCP 读取/复核→页面定位及保存前展示→手动保存凭证→刷新/恢复。必须同一候选 SHA 联合验收后才能关闭 ALVA-029；29 的旧 `/api/review` 与生产主 Chat 尚未由本独立增量替换。

## 知识收尾事实面

代码/类型/模块测试：以本票最新证据为准；文档/接口：本文件为现役解释；共享规则和 AGENTS 未改；main 集成、前端、实际阶段 MCP、生产：pending；Codex 生成记忆：out-of-scope，不修改；个人分支、Worktree、失败与成功证据均保留，不清场其他协作者产物。
