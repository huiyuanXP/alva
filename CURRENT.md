# 恢复索引

## 当前状态（2026-09-25）

根目录`/home/ubuntu/Alva`。ALVA-053已按诊断维护范围done并集成，个人提交`17a6308`；ALVA-056现由chatgpt-recovery恢复执行，独立`.runtime/worktrees/ALVA-056-recovery-20260925`。53的28项回归、类型检查与历史候选复核通过，证据`evidence/20260925T064257Z-ALVA053-recovery-acceptance/`。

ALVA-056需要更新旧v2.5探针，直接使用普通用户的`codex --profile mimo`（当前默认Pro，另有Flash），复测并分阶段留证。原main暂存8文件与未提交文档已有私有完整备份；56认领同步本票历史文档补充，代码/证据验收后按本票范围集成，不吞并其他人的工作。53的native Flash候选能解析但确认拓扑失败，不自动确认设计。

并行在途：[ALVA-057 Your Home Vision](docs/ALVA-057-home-vision.md)，yang-chatgpt，独立工作区`/home/ubuntu/Alva-worktrees/ALVA-057-yang-chatgpt`。其api/model.ts、api/intake、web入口等占用及新版附件范围以NextTask/单票为准，本轮不覆盖。ALVA-028继续用户暂停，Execution state=pending，不自动实施。

边界：53的240秒MiMo Pro业务App Server复试被工具拦截未执行；普通用户CLI profile成功不等于该业务复试通过。最新截图未标注原图和当前生产样本关联仍未取得。生产服务/本地及公网healthz正常；本轮未部署、未改生产配置或数据。

## 恢复入口

[NextTask](NextTask.md)为主目录协调源；[Handoff](Handoff.md)记录本轮提交、验证、依赖与回滚。单票：[53](docs/ALVA-053-model-topology-audit.md)、[56](.scratch/alva-topology-quality/issues/02-mimo-vision-retry.md)。[44张产品票](.scratch/alva-completion/README.md)完成12张不变；[拓扑补充票](.scratch/alva-topology-quality/README.md)55保持done。

[目录规范](docs/PROJECT-STRUCTURE.md)、[SPEC](SPEC.md)、[ACCEPTANCE](ACCEPTANCE.md)维持现役工程入口；不以旧week/step重排ALVA票号。[服务器事故](docs/INCIDENT-2026-09-25-server-recovery.md)区分历史内存/网络故障与Power key关机，不唯一归因某进程。

任务恢复保护基线`.runtime/20260925T060510Z-ALVA053056-recovery-b102c7/`；当前新增53工作区与旧22个工作区均保留。重任务只串行，含数据库/类型上限1500MiB、模型900MiB，启动预留900MiB；记录初始失败，不以放宽断言通过。
