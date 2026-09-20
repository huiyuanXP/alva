# 01: 统一登录验证码与多设备访问

**ID:** ALVA-008

**Parent scope:** T01

**What to build:** 访问者先输入统一验证码，验证成功后进入授权项目。你获得验证码并自行分发；同一码可在多个设备重复登录。

**Blocked by:** None（可开始）

**Status:** done

**Execution:** 已发布，尚未实施。依赖全部在 main 集成且验收完成后，按 NextTask 署名认领，在独立 Worktree 开发；本次协作规则更新不自动认领或开工。

- [x] 打开域名先显示验证码登录页；未验证时不能获取项目、版本、图片、下载或发起模型调用。
- [x] 服务端核验验证码，正确后建立各设备独立的限时会话；错误码、空码、退出后和过期会话不能进入业务接口。
- [x] 关闭免验证公共入口；旧hash链接、旧匿名owner会话和只读邀请不能绕过验证码门槛。已有项目、设计和版本完整保留。
- [x] 验证码持有人可使用当前授权项目；已有设计师只读身份不自动升级，不赋予专业墙改角色或其他项目权限。共享码不等于识别每个人的实名账号。
- [x] 实施时生成一个随机统一码，只交给项目发起人，由其自行转授；不接入短信/邮箱，不代发，不把验证码放进Git、URL、前端包、票据、截图或日志。
- [x] 提供退出和服务器更换验证码的恢复步骤；验证码轮换使旧登录失效。限制错误尝试，正常多设备重复登录不被误判为一次性使用。
- [x] 两个独立浏览器完成登录/刷新/退出/重登；未登录及旧入口绕过请求被拒绝，原项目内容不变。内部同版本导出仍能渲染，不留下公开绕过端点。

**Scope boundary:** 不做注册、短信验证码、个人账号体系或完整管理员控制台；本票只完成用户指定的共享验证码准入。

**Development location:** 实施前阅读[当前目录规范与本票落点](../../../docs/PROJECT-STRUCTURE.md)。以其中对应 ALVA 编号的归属为准，不沿用迁移前目录；此链接不改变本票范围、依赖或实施授权。

**Snapshot scope:** 确认操作只更新当前工作状态；只有用户手动点击全局保存才建立存档快照。点击已有快照只读预览，明确恢复才整体替换；不要求逐操作历史、撤销或自动存档。

**Parallel lane:** `access`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。

## Implementation handoff

- Owner: Codex
- Branch: `task/ALVA-008-codex`
- Worktree: `/home/ubuntu/Alva-worktrees/ALVA-008-codex`
- Shared files registered: `api/api.ts`, `api/server.ts`, `api/store.ts`, `web/src/main.tsx`
- Verification port: `4181`
- Scope: shared-code gate, per-device expiring sessions, protected business/media/export/model routes, logout and code rotation recovery, two-browser regression.
- Started from main HEAD before claim; implementation and evidence remain in this worktree.

## Final implementation handoff

- Delivery location: `/home/ubuntu/Alva` main（按用户后续指示改为主目录直接协作）。
- Implementation: `api/store.ts` 的授权代次与限时会话、`api/api.ts` 的统一门禁/退出/错误限流、`api/server.ts` 的私有随机码初始化、`web/src/main.tsx` 的验证码登录页、旧邀请的验证码绑定、内部导出会话及轮换脚本/运维步骤。
- Verification: `npm run check`；`npm test` with `RENOVATION_MEDIA_FIXTURES=/home/ubuntu/Alva/.runtime/fixtures`（64/64）；`npm run build:alva`；`node_modules/.bin/tsx scripts/alva-auth-check.ts`（双浏览器）；`git diff --check`，均通过。
- Security boundary: 验证码只写入 `.runtime/alva-access-code` 等私有运行目录；不会进入 Git、URL、前端包、票据、截图或日志。旧 `/api/public-access` 返回 404，未登录业务接口返回 401。
- Implementation commit: 本次主目录实现提交（可由 `git log --grep=ALVA-008` 追溯）。
