# alva 文件结构与开发归属

本文件是文件放置与模块依赖的唯一规范。开发前先读根目录 AGENTS.md、本文、当前 Ticket；功能范围以 Ticket 为准。仓库根目录固定为 `/home/ubuntu/Alva`，持久项目名为 alva。

当前是一个根 package.json 管理的 TypeScript 仓库，包含两个现役应用，不是已经拆分发布的 npm workspace。已按用户要求将仓库与现役应用扁平化：去掉原根目录下的 alva/ 和现役 apps/ 包装层。仅改变组织和路径，不实施功能票；不创建空工程。图中的 `[规划]` 表示在对应 Ticket 实施时按需创建；其余为已有目录或文件。

## 整体结构图

```text
/home/ubuntu/Alva/                 唯一仓库根目录，Git/package.json 都在这里
├── api/                          后端：server、api、model、store、codex、import 等
│   ├── auth/              [规划] 验证码与会话
│   ├── topology/          [规划] 墙线、门窗、校准与确认
│   └── building/          [规划] Codex 建筑生成与结果校验
├── web/                          前端：index.html、vite.config.ts
│   └── src/                      main.tsx、Panels.tsx、SceneView.tsx 等
│       ├── auth/、import/、topology/、building/ [规划] 功能界面
│       ├── scene/         [规划] 3D 网格、材质、相机与剖切
│       └── components/、lib/、assets/ [规划] 复用 UI、客户端、静态素材
├── packages/contracts/           共享合同；alva 专用定义按票提取
├── Research/                     研究记录与示例分析
├── docs/                         项目结构、技术决策与开发说明
├── evidence/<run-id>/            独立验收结果与截图
├── tests/                        alva-*.test.ts；browser/ 为旧工程测试
├── scripts/                      alva-* 验收、运维脚本
├── ops/                          alva 服务配置；原 MCP 配置保留
├── .scratch/alva-completion/      已发布 Ticket，一票一文件
├── references/                   已归档输入与示例源码
├── Docs/                         原有附件目录，保留不改
├── apps/api/、apps/web/           旧工程保留基线，不是现役开发入口
├── vendor/、taskboard/            旧依赖与任务板保留基线
├── .agents/                      本机技能，保留不随产品发布
├── .runtime/                     私有配置、数据、上传与备份，不入库
├── .data/                        旧运行数据目录
├── AGENTS.md、README.md           统一规则与启动入口
├── CURRENT.md、Handoff.md、NextTask.md、GlobalHandoff.md
├── SPEC.md、SCOPE.md、ACCEPTANCE.md、PLAN.md、PROGRESS.md 等
└── package.json、package-lock.json、tsconfig.json、.env.example
```


## 开发哪个工程，文件放哪里

| 开发内容 | 写入位置 | 职责边界 |
|---|---|---|
| 服务入口、HTTP 路由 | `api/server.ts`、`api.ts` | 路由做请求解析、鉴权和调用；新增成组业务逻辑进入对应模块 |
| 登录验证码 | `api/auth/`、`web/src/auth/` | 服务端验证和建立会话；浏览器只提供输入与登录状态 |
| 图片/PDF 导入与识图 | `api/import.ts`、`src/import/` | 复用 Codex 适配器；不得把供应商调用放到前端 |
| 墙线、房间、门窗、校准 | `api/topology/`、`src/topology/` | 服务端决定合法修改；前端负责操作和预览 |
| 建筑 3D 生成 | `api/building/`、`src/building/` | 服务端基于已确认拓扑调用 Codex、校验与存储；前端展示生成过程与候选结果 |
| 3D 几何显示、视角、剖切 | `web/src/scene/` | Three.js 确定性渲染；不发起模型调用、不修改权威拓扑 |
| 咨询、家具、审查、导出 | 已有 `chat.ts`、`business.ts`、`export.ts` 与前端同名 feature | 未来获准做相关票时按需创建 src/chat、furniture、review、export，不提前建空目录 |
| 数据库与版本 | `api/store.ts` | 集中持久化；新迁移随实现进入此层，不让路由/前端另写数据库 |
| 两端共享结构与纯校验 | `packages/contracts/alva/` | 无 Node、数据库、React、Three.js 或模型进程依赖 |
| 模块内部类型/工具 | 使用它的模块目录内 | 不因名称叫 types/utils 就放共享包；只有真正跨模块复用才上移 |
| 测试与合成夹具 | `tests/alva-<feature>.test.ts`；必要时新建 `tests/fixtures/alva/` | 使用合成/获准公开数据，不使用生产客户数据 |
| 真实浏览器与模型验收 | `scripts/alva-<feature>-check.ts` | 结果写入独立 evidence run；私有原始数据留在 .runtime |
| 运维与发布 | `ops/alva/`；可执行探针在 `scripts/alva-*` | 模板与说明入库，有效配置留私有运行目录 |
| 产品素材 | `web/src/assets/` | 随代码构建；用户上传不是产品素材，不放这里 |
| 研究/技术决策 | `Research/`、`docs/` | 决策建议命名 `YYYY-MM-DD-<topic>.md`；专题文档直接放对应目录，不额外套项目名 |
| Ticket、进度、交接 | tracker、`PROGRESS.md`、`Handoff.md`、`NextTask.md` | Ticket 写行为和验收；实现路径统一在本文维护 |

表中 `src/` 简写均指 `web/src/`。规划目录仅在有实际文件时建立，不加占位文件或独立 package.json。

## 模块依赖与唯一数据定义

目标依赖方向：浏览器功能 → HTTP 客户端 → 服务端路由 → 业务模块 → Codex/存储适配；两端均可依赖共享合同。共享合同不反向依赖应用，服务端不依赖前端组件，浏览器不导入服务端运行时代码。

现状例外必须认识清楚：场景 schema 目前在 `api/model.ts`，前端存在对此文件的 `import type`；`packages/contracts/index.ts` 是另一套旧工程合同，不能直接当成 alva 场景使用。当前 `model.ts` 含 `node:crypto`，不得整体搬入浏览器依赖链。

后续首次需要共享运行时 schema 时，将相关无副作用定义提取到 `packages/contracts/alva/scene.ts`，同步修改使用方；原 `model.ts` 可兼容转出，服务器对象创建/随机 ID 等仍留服务端。不得复制出两个分别维护的 Scene。新建筑结果 schema 放 `packages/contracts/alva/building.ts`，引用同一场景 ID 与版本合同。仅在相关票实施时做必要提取，不为目录规范一次性重构全部旧代码。

Codex 进程协议统一经过 `api/codex.ts`。`import.ts` 管识图提示与二维初稿；`building/generate.ts` 管第二阶段建筑生成提示与结果编排，`building/validate.ts` 管构件、引用和确认拓扑的一致性。建筑生成必须真实调用 Codex；输出结构化场景描述，前端 `scene/building-meshes.ts` 等模块解释为网格，不执行模型返回的任意代码。具体合同见[研究结论](../Research/LOGIN-IMPORT-3D.md)。

## 首批 Ticket 文件落点

以下是实施时的归属，文件名可在同模块内按具体职责调整；不能以本表代替 Ticket 验收或视作开工授权。所有新增路径均为规划。

| Ticket | 服务端落点 | 前端落点 | 验证落点 |
|---|---|---|---|
| ALVA-008 统一验证码 | `auth/login.ts`，接入 `api.ts`/`store.ts` | `auth/LoginGate.tsx`，接入 `main.tsx` | `tests/alva-auth.test.ts`、`scripts/alva-auth-check.ts`；修订现有公共入口回归的预期 |
| ALVA-009 导入初稿 | 现有 `import.ts`/`api.ts` | `import/ImportPanel.tsx` | `tests/alva-import.test.ts`、`scripts/alva-import-check.ts` |
| ALVA-010 墙线拓扑 | `topology/commands.ts`、`topology/validate.ts` | `topology/PlanEditor.tsx` | `tests/alva-topology.test.ts` |
| ALVA-011 门窗/校准/确认 | `topology/calibration.ts`，接入版本存储 | `topology/OpeningEditor.tsx`、`CalibrationPanel.tsx` | `tests/alva-calibration.test.ts`、拓扑浏览器验收 |
| ALVA-012 Codex 建筑生成 | `building/generate.ts`、`building/validate.ts`，接入存储；共享建筑合同 | `building/GenerationPanel.tsx`、`scene/building-meshes.ts` | `tests/alva-building.test.ts`、`scripts/alva-building-check.ts` |
| ALVA-013 示例式视角 | 仅必要的场景合同配合 | `scene/cameras.ts`、`scene/cutaway.ts`，接入 `SceneView.tsx` | `scripts/alva-building-views-check.ts`，独立截图证据 |

本表服务端相对 `api/`，前端相对 `web/src/`；门窗的 CalibrationPanel 与 OpeningEditor 同目录。008–013仍按[本地tracker](../.scratch/alva-completion/README.md)依赖推进，其余独立票可按[NextTask](../NextTask.md)署名并行。

## 命名、验证与交付约定

- React 组件使用 `PascalCase.tsx`；其他 TS 文件和目录使用 `kebab-case`；现有文件名保留，不做无关重命名。测试使用 `alva-<feature>.test.ts`，脚本使用 `alva-<purpose>.ts` 或 `.py`。
- 当前 `npm test` 只发现 `tests/*.test.ts`。不把新测试放到深层目录后假定会被执行。`tests/browser/` 和根 `playwright.config.ts` 仍启动旧工程；在另票明确建立 alva 专用配置前，不能把旧 `npm run test:browser` 当新产品验收。
- 现役命令：`npm run check`、`npm run build:alva`、`npm run start:alva`。旧 `dev`、`start`、`build` 不指向新应用。开发测试针对当前票选取，如 `node_modules/.bin/tsx --test tests/alva-auth.test.ts`（文件实施后才可运行）。
- `main.tsx`、`api.ts`、`SceneView.tsx` 已有集中实现；新增独立功能优先进入上述模块，入口只保留装配。提取旧逻辑与调用方在同一票完成，避免留下两个行为不同的入口。
- 原项目 `/home/ubuntu/aws-hackthon/renovation-consultation`、本库旧工程、vendor、taskboard 与 references 不作为新功能写入位置。复用时先确认需求/许可/依赖，再将所需实现纳入现役模块并记录来源。
- `.runtime/` 存放有效验证码/密钥配置、上传和数据库等私有数据；实际生产布局以[部署文档](../ops/alva/DEPLOYMENT.md)为准，不因本文迁移运行目录。`.scratch/alva-completion/` 是已入库 tracker，不是随手清除的临时目录。
- 新顶层工程或跨层依赖改变时，先在 `docs/` 说明理由并同步本文及相关构建/测试入口；普通功能沿既定模块放置。每票在独立Worktree完成实现提交，集成人串行合入main并更新PROGRESS、Handoff/NextTask和必要的GlobalHandoff；开发分支不覆盖共享协调文件。

迁移前后的对应关系：`Alva/alva/apps/alva/` → `Alva/api/`；`Alva/alva/apps/alva-web/` → `Alva/web/`；`Alva/alva/docs/research/` → `Alva/Research/`。其他仓库内容上移一级。历史 evidence、PROGRESS 与原始附件里的旧路径属于当时记录，不批量改写。原根目录同名文档已合并，迁移前副本私有保留在 `.runtime/root-migration-20260919/`；原远端接入说明在 [REMOTE-ACCESS.md](REMOTE-ACCESS.md)，MCP 服务未改。

## 并行工作区

主目录 `/home/ubuntu/Alva` 是 main 集成与认领协调入口。每票工作区位于 `/home/ubuntu/Alva-worktrees/ALVA-xxx-<owner>`，分支 `task/ALVA-xxx-<owner>`；所有应用路径相对各自Worktree根目录使用，不能仍写主目录的api/web。依赖安装、构建、测试数据库、端口与运行配置独立。忽略文件和本机技能不会随Git自动复制：技能从主目录只读使用，测试配置在本Worktree独立建立，不复制生产运行数据。认领、共享文件归属、提交/集成及清理按NextTask执行。
