# ALVA-072 新建与切换项目

Status: done
Owner: codex-projects
Branch: task/ALVA-072-codex-projects
Worktree: /home/ubuntu/Alva-worktrees/ALVA-072-codex-projects

用户授权实现新建与切换入口，从新空项目重新开始户型导入。页面顶部项目名打开“新建 / 切换项目”，输入名称后新建并进入，也可切回列表中的旧项目。切换保留数据库中的工作稿、保存版本、问卷、设计与聊天；未发送文字/附件不跨项目携带。不会自动保存或覆盖旧项目。空项目主按钮上传真实附件给主 Chat，原直接导入入口保留在附件菜单。

## 现役合同

- 统一验证码仍是业主入口；默认登录进入原授权项目。`alva_owner_projects` 只登记原授权项目及本入口创建的项目，不能把数据库中所有测试/历史项目当授权目录。
- 当前项目保存在本设备 session，其他设备继续原项目。同一浏览器标签页共享 cookie，因此所有页面请求附 `X-Alva-Project`，旧标签页收到明确409并要求刷新，不把旧表单写进新项目。
- `POST /api/projects/navigate` 接收 requestId、expectedProjectId、navigation。新建项目、纳入授权目录、更新当前会话及幂等回执在同一事务完成；重复请求不重复创建，跨项目的迟到请求不得回退当前选择。切换后页面整体重载，清除原表单、选择、附件和阶段组件。
- 旧的未接线 `POST /api/projects` 已被新导航事务替代。`GET /api/projects` 仅业主可用；`/api/projects/prepare` 与当前阶段 MCP 共用参数/目标检查。
- 设计师与专业邀请固定到被邀请项目，验证码仍必需。它们不能列出业主目录、新建或切换；撤销邀请后旧会话失效。旧项目邀请保持有效，不因业主切换而改绑。
- 两阶段分别装配 `list_projects` / `request_project_navigation`，只加载当前一包。工具打开同一个面板并等实际 UI 回执；只返回 awaiting_user_confirmation，最终由用户点击完成导航。`PROJECT_NOT_FOUND`、`FORBIDDEN`、`INVALID_ARGUMENTS` 等错误通过 MCP 保留原因和修复步骤。
- 各项目的两阶段 thread 独立。切回项目继续原 thread；旧 MCP grant 仍绑定原会话项目，不能因切换获得另一个项目的写入权限。

## 验证与复现

在独立 Worktree 使用独立依赖、合成数据与动态空闲端口。验证遵守共享heavy锁、CPU80%、总内存20%、swap0。

- 类型与前端构建已通过；保留既有 Vite >500kB chunk warning。
- 专项/登录/设计师回归6/6：新空项目、往返保持原对象、刷新读取、重复创建幂等与不同参数拒绝、多设备独立、旧标签页409、隐藏项目403/404、邀请固定项目及撤销、两个阶段MCP目录与可解释错误。
- 真实主Chat三轮 → 当前阶段HTTP MCP → 面板及真实回执 → 点击新建/切换 → 项目重读通过。空项目附件入口、刷新、原thread Resume、390px面板及页面错误0通过；独立进程重开合成库后目录/当前session/分项目历史/原thread保持。

命令：`bash scripts/alva-072-tests.sh tests/alva-projects.test.ts tests/alva-auth.test.ts tests/alva-designer-readonly.test.ts`；`bash scripts/alva-072-final-check.sh`（需现役模型环境凭据，使用独立合成库）。均通过 `scripts/alva-066-run.sh` 启动。大型PGlite用例每例独立进程；重启校验由 `scripts/alva-072-restart.ts` 在新进程读取同一合成库。

## 失败与资源现场

前三轮测试遇到共享slice内存上限：旧068临时预览约占342MB，测试未计通过。减少测试调度子进程后仍不足，暂停旧068测试应用后6项通过；生产未停，原测试数据库/Tunnel保持。旧应用为collect transient unit，停止后unit被回收，不能直接start；按原Worktree、私有EnvironmentFile、入口和原资源限额重建恢复；2026-09-27 08:01 UTC验证服务active、4188 healthz正常，生产公网healthz正常。

首轮浏览器探针忘记向buildAlva传入随机端口对应origin，真实POST被同源校验403拒绝，修正探针后独立新run复验；未放宽产品同源校验。所有失败证据保留。

## Implementation handoff

实现与验收已完成并集成main；个人实现提交 `d6172be`。2026-09-27已发布生产；上线与登录复验边界见 [发布收据](ALVA-072-production-release.md)。

- 最新类型/构建：`evidence/20260927T075534Z-ALVA066-alva072-browser-331730/` 的类型/构建阶段通过，该run后续探针403失败保留；最终新测试/脚本类型：`evidence/20260927T080118Z-ALVA066-alva072-probe-types-334712/`。
- 登录/权限与专项6项：`evidence/20260927T075328Z-ALVA066-alva072-tests4-330939/`。
- 最终专项/阶段Chat/MCP12项与重启：`evidence/20260927T075922Z-ALVA066-alva072-final-regression-333876/`；与上组去重共16项通过。
- 真实浏览器：`evidence/2026-09-27T075705085Z-ALVA072-browser/`，含桌面新建确认、空项目、手机项目列表截图；资源/退出结果 `evidence/20260927T075659Z-ALVA066-alva072-browser2-332440/`。

neat-freak：代码与本票隔离运行态 verified-current；合同、目录、票据 changed-and-verified；规则 verified-current；生产已发布，登录后复验pending（见发布收据）；生成记忆 out-of-scope。既有bundle警告和主工作区手机横向溢出未改；新项目面板手机宽度通过。失败run、合成库、原thread与Worktree保留用于复核。
