# ALVA-053：模型路由与平面拓扑诊断

**Status:** done

**Owner:** chatgpt-recovery

完成边界：本票的路由/输出/拓扑诊断收尾和确定性解析修复已验收；不是用户户型已经正确、不是全量产品验收、不是生产发布。下列未核验项保留，不以native CLI成功冒充业务App Server完整识图成功。

## 本轮恢复与修复

2026-09-25用户授权恢复53和56。基线main `815c85a`、认领`618a272`，实现分支`task/ALVA-053-recovery-20260925`，Worktree`.runtime/worktrees/ALVA-053-recovery-20260925`。旧诊断`88506f2`与全部旧Worktree保留；历史全文见[2026-09-22报告](history/20260922-model-topology-audit.md)。

`api/import/response.ts`将JSON、schema和几何错误统一纳入原有的一次修正预算；仅允许完整JSON围栏的无损去包裹，不把数组坐标/字符串evidence猜改成合法字段，不自动补房间。第一次失败才要求同图修正，第二次仍错则拒绝；传输/鉴权失败不进入输出修正循环。

实测MiMo Pro在业务App Server中持续推理但被原120秒限额截断。`api/codex-timeout.ts`新增显式有界时限，普通调用保持120秒，识图两次调用各240秒，所有覆盖参数最大300秒；保留原取消信号。240秒Pro完整App Server复试因涉及提权与环境传递的工具调用被拦截，未执行、未计通过。后续仅使用普通用户原生profile，不复制密钥、不提权，不替代这项未核验记录。

原PDF测试与PGlite API测试共用一个进程时超过1.5GiB任务上限；PDF测试原封不动移至`tests/alva-import-pdf.test.ts`，全部断言SHA核对不变。串行/独立进程后28/28通过，无跳过/取消/失败。没有修改业务数据库、api/model.ts、057入口或已有确认拓扑规则。

## 逐项验收

- [x] 实测模型目录与Gemini 3.8/Codex App Server，保存准确错误与耗时：目录200；MiMo Pro只读动态工具1次成功、2个文本增量；Gemini `gemini-3.8-flash-high`文本探针10.90秒成功。其历史渠道不可用记录不再作为当前结论；不宣称Gemini完整识图/工具链已验收。
- [x] 重放历史候选及合成反例，区分生成、校验、前端映射问题：当前T连接/包含共线的正反顺序均被拒绝，055的修复仍有效；4cm开放边界会告警；重叠房间仍有缺口，未扩展成新拓扑功能。历史候选2项重放结果保留。前端底图映射旧问题未冒充修复，057/preview共享文件未动。
- [x] 提取可证明的开始/完成时间，不把文件名或mtime当生成时间：历史精确时间及本轮App Server/token/native execution均有独立证据。原生`codex exec --profile mimo --model mimo-v2.6-flash`识图18.663秒、3,899字符，解析/schema/基础几何通过；17墙/5房间/9门窗。确认拓扑因T连接失败，约22.59m²未定义空间，不能作为已确认设计。
- [x] 运行相关现有检查，记录覆盖与缺口并更新恢复入口：28/28、最终`npm run check`退出0、native保留输出离线复核退出0；全量产品/浏览器/生产发布不在本轮。

证据总入口：`evidence/20260925T064257Z-ALVA053-recovery-acceptance/summary.json`、同目录manifest/日志。真实App Server：`evidence/20260925T062109616Z-ALVA053-8583bd/`；native输出复核：`evidence/20260925T063615925Z-ALVA053-6df438/`。原始响应/JSONL仅私有`.runtime`。请求模型与网关目录不独立证明最终上游提供者。

## 下一步、保护与回滚

进入ALVA-056，修复旧探针硬编码v2.5，直接沿用当前`mimo` profile并核验默认Pro与阶段结果。本票未覆盖的240秒业务App Server复试须通过获准执行环境后再验证，不能改写命令绕过原拦截；当前生产样本关联和最新截图的未标注原图仍未取得。缺原图时不以仓库原图冒充。

重型验证串行，`.git/alva-heavy-task.lock`；模型900MiB、包含PGlite/类型的验证1500MiB、CPU60%、Tasks128，开始前保留900MiB余量。900MiB和原PDF/PGlite聚合方式的OOM失败已留证，未计通过、未触发主机重启。最终验证峰值约1.38GiB。首次安装scope因PAM迁移未有效限额已单独更正，不能引用其内存峰值为本任务。

main原8个56暂存文件与2份文档修改保留至56获准集成；028暂停、057的在途修改、preview五文件、历史Worktree保留。回滚仅revert本票集成，不重置用户工作树或删除证据。生产服务及Tunnel不由本票重启。
