# 恢复索引

## 2026-09-25 Codex 升级完成

CLI 运维任务（不对应旧 week/step，不认领产品票）：0.155.1 → 0.157.0；Sol/Luna 原生目录、网关列表与真实调用均通过。默认 New API/Astra、MiMo 双模型 profile 保持，三份配置字节不变；证据及回滚见 [Codex provider 配置](docs/CODEX-PROVIDERS.md)。本轮基线 HEAD `a11cd11`，原 8 暂存文件与 2 未提交文档保留。MiMo Flash 首次标记不匹配及新 run 重试通过均留证。未重启服务、变更业务数据或推进下列 pending 队列。

## 2026-09-25 重启后状态

本轮是服务器取证与待办恢复，不是产品实施。根目录 `/home/ubuntu/Alva`，main检查基线 `5e1513a`。已完成的12张产品票与ALVA-055保持done；ALVA-053/056退回pending，ALVA-028从进行中退回待办，未自动开工。

恢复入口：[事故与保护清单](docs/INCIDENT-2026-09-25-server-recovery.md) → [NextTask](NextTask.md) → 对应单票。取证 `evidence/20260925T034733Z-server-recovery-2cae71/`；私有原补丁 `.runtime/20260925T034733Z-server-recovery-2cae71/`。

- ALVA-053：pending，个人诊断成果在`task/ALVA-053-chatgpt-audit` / `88506f2`；待路由/样本关联复核及主线收尾，不再显示执行中。
- ALVA-056：pending，最新个人提交`0d7ea5f`；已存在真实MiMo返回，确认拓扑未通过。main 8个原暂存文件和2份原未提交文档保留，尚未完成集成。下一步先比对这些成果、串行离线复核，再进行独立集成；不能沿用“仅鉴权失败、无模型输出”的旧结论。
- ALVA-028：Execution state=pending；未实施、用户暂停保留，当前署名已释放。为兼容现役看板Status回到ready-for-agent，定义就绪不等于开工许可。原分支/负责人信息在票内保留。

无对应上述工作区的现役执行进程；另有Codex resume进程位于归档目录，未确认属于这些票，未终止。structured-output-preview的5个未提交文件及全部21个Worktree保留，不接管或删除。

## 当前服务与资源边界

本地`127.0.0.1:4173`、公网`prod.huiyuanxp.com`的healthz均alva/ok，MCP和生产/Tunnel服务active；不代表产品全链路验收。历史严重压力位于9月22日夜至23日凌晨（新加坡时间），25日11:30后是Power key/poweroff；尚不能精确归因单个程序。未调整Swap/CPU/内存限制或部署，恢复重任务前按NextTask串行并检查资源。

## 权威文档

1. [正式tracker](.scratch/alva-completion/README.md)：44张产品票及直接依赖；现有完成ALVA-008–012、014–019、043。
2. [拓扑补充票](.scratch/alva-topology-quality/README.md)：ALVA-055 done/main；ALVA-056 pending。
3. [Handoff](Handoff.md)、[NextTask](NextTask.md)：本轮交接与Pending队列，主目录为唯一协调源。
4. [目录规范](docs/PROJECT-STRUCTURE.md)、[远端访问](docs/REMOTE-ACCESS.md)：现役路径与私有配置来源；不读取或分享凭据。
5. [SPEC](SPEC.md)、[ACCEPTANCE](ACCEPTANCE.md)：无预算、理想WebGL机器、仅手动全局快照；[审核来源](Research/REMAINING-TICKETS-REVIEW.md)。

产品依赖就绪仍为ALVA-013/020/023/028/031/036/041；028用户暂停，其他票未因本次事故获得实施授权。只读看板`/todo`读取源文件；53/56是额外维护任务，仅在NextTask恢复队列，不计入44票完成数。
