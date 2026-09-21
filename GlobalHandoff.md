# GlobalHandoff

- 项目根 `/home/ubuntu/Alva`；现役工程 api/、web/，开发前读 docs/PROJECT-STRUCTURE.md。
- 正式tracker：`.scratch/alva-completion/README.md`。44票 ALVA-008–051 已发布；当前 ALVA-008–010、ALVA-014 已完成并集成 `main`。
- 用户已要求并行认领机制；当前规则任务不自动开工。依赖满足后在主目录NextTask署名即认领，独立Worktree开发，main串行集成后释放并解锁。参考家具及整组方案最后，随后最终验收。
- 当前范围：无预算；理想WebGL环境Demo；只有手动保存创建全局快照，可预览并明确恢复，不提供逐操作历史、撤销或自动存档。
- ALVA-014 已从现役问卷/API/UI/Chat工具/导出合同移除预算，并保留旧持久层/快照历史数据不迁移；统一验证码已由 ALVA-008 实施，新建筑生成仍待后续票且必须真实调用 Codex。
- 恢复读CURRENT/Handoff/NextTask。技能to-tickets用于发票，neat-freak用于知识对齐，不扩大生产权限。旧源码和历史证据保留。

- 并行入口：NextTask.md；当前未认领 frontier 为 ALVA-011/015/017/023/031/036。旧“全串行/首批全完成才可开始其他票”被覆盖。共享文件需协调，个人分支提交不等于done；全局交接只在main集成时更新。

- ALVA-052恢复原prod.huiyuanxp.com/todo入口，现役api/todo与web/todo直接读取44张正式票和NextTask；无需重复上传，30秒刷新。源状态和认领仍在main维护，不修改MCP。运维与验证见docs/TODO-LIST.md。

- ALVA-010 已在 main 集成：拓扑校正统一经过 `api/topology/commands.ts` 与 `validate.ts`，墙端点/房间顶点修改会同步共享连接并清除旧校准；分段保留来源，带门窗引用的墙不得静默移除。下一项已解锁为 ALVA-011。

- ALVA-014 已由 Lexie 完成：保留 Q01–Q60 稳定 ID，停用 Q19–Q22/Q58/Q60，问卷保留逐题状态与房间/项目 scope；预算能力退出现役合同但不清除历史数据。证据见 `evidence/20260921T073000Z-ALVA014-round1/` 与 `evidence/20260921T074000Z-ALVA014-round2/`。
