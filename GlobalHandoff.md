# GlobalHandoff

- 项目根 `/home/ubuntu/Alva`；现役工程 api/、web/，开发前读 docs/PROJECT-STRUCTURE.md。
- 正式tracker：`.scratch/alva-completion/README.md`。全部44票ALVA-008–051已发布、未实施；首批六票不变，本次将剩余38张批准稿正式发票。
- 用户已要求并行认领机制；当前规则任务不自动开工。依赖满足后在主目录NextTask署名即认领，独立Worktree开发，main串行集成后释放并解锁。参考家具及整组方案最后，随后最终验收。
- 当前范围：无预算；理想WebGL环境Demo；只有手动保存创建全局快照，可预览并明确恢复，不提供逐操作历史、撤销或自动存档。
- 当前代码尚未移除预算或实现统一验证码与新建筑生成，不把发票当上线。有效验证码在实施ALVA-008时生成交付用户；建筑3D必须真实调用Codex。
- 恢复读CURRENT/Handoff/NextTask。技能to-tickets用于发票，neat-freak用于知识对齐，不扩大生产权限。旧源码和历史证据保留。

- 并行入口：NextTask.md；44票均有Parallel lane，初始就绪008/014/017/023/036，无人认领。旧“全串行/首批全完成才可开始其他票”被覆盖。共享文件需协调，个人分支提交不等于done；全局交接只在main集成时更新。

- ALVA-052恢复原prod.huiyuanxp.com/todo入口，现役api/todo与web/todo直接读取44张正式票和NextTask；无需重复上传，30秒刷新。源状态和认领仍在main维护，不修改MCP。运维与验证见docs/TODO-LIST.md。
