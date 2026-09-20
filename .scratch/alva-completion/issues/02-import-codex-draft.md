# 02: 导入户型图并由Codex生成二维初稿

**ID:** ALVA-009

**Parent scope:** T02-A

**What to build:** 登录后上传PNG/JPEG/PDF，看到原图和Codex实际识别出的二维墙、房间、门窗候选，作为后续修图起点。

**Blocked by:** 01：统一登录验证码与多设备访问

**Status:** done

**Execution:** 已实施并完成验收。实现先在独立 Worktree 完成，验证通过后自动合入 main。

- [x] 上传后保留原图与来源，说明PDF使用的页面，显示处理状态；不是上传成功就宣称建模成功。
- [x] 真实调用Codex读取当前图像，返回有稳定ID的墙线、房间轮廓和门窗关联；二维候选来自该次输出，不复制固定户型或样例坐标。
- [x] 原图与识别初稿可对照；缺尺寸时明确标估算、未校准，看不清的用途/开口标待核对。
- [x] 成功候选可重载继续编辑；调用失败、取消、重复提交不覆盖上一个已确认场景或伪造候选。
- [x] 验收至少使用两个不同布局并保留实际模型调用证据，明确真实附件与合成对照来源；这张票不要求完成建筑3D。

**Scope boundary:** 不在本票添加家具、改造墙体或生成最终3D；重点是从上传到可复查二维初稿的最短闭环。

**Development location:** 实施前阅读[当前目录规范与本票落点](../../../docs/PROJECT-STRUCTURE.md)。以其中对应 ALVA 编号的归属为准，不沿用迁移前目录；此链接不改变本票范围、依赖或实施授权。

**Snapshot scope:** 确认操作只更新当前工作状态；只有用户手动点击全局保存才建立存档快照。点击已有快照只读预览，明确恢复才整体替换；不要求逐操作历史、撤销或自动存档。

**Parallel lane:** `import`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

- Owner: Codex
- Branch: `task/ALVA-009-codex`
- Worktree: `/home/ubuntu/Alva-worktrees/ALVA-009-codex`
- Shared files registered: `api/api.ts`, `api/import.ts`, `api/store.ts`, `web/src/main.tsx`
- Verification port: `4182`
- Scope: PNG/JPEG/PDF upload provenance, PDF page-1 disclosure, real Codex layout recognition, original/candidate comparison, failure/cancel/replay protection, dual-layout browser acceptance.
- Started from main HEAD `6292b96`; implementation and evidence remain in this worktree.

## Verification

- `npm run check`：通过。
- `npm run build:alva`：通过。
- `node_modules/.bin/tsx --test tests/alva-import.test.ts`：3/3 通过。
- 真实 Codex 双布局证据：`evidence/20260920T135803184Z-a144b2c5/result.json`；真实附件与合成对照均返回墙、房间、门窗候选，且候选不同、`calibration` 为 `null`。
- 真实 Codex 多模态探针：`evidence/20260920T135517780Z-dad4bde2`（增量文本、图片理解与工具调用通过）。
- 浏览器刷新/来源/退出门禁证据：`evidence/20260920T142711689Z-browser-reload/result.json`；候选 15 墙、6 房间、11 开口可刷新保留。
- 全量 `npm test`：66/67 通过；唯一失败是既有 `tests/alva-todo.test.ts` 对 ALVA-031 当前依赖前沿的期望不一致，与本票代码无关，未修改无关票据。
