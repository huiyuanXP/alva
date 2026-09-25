# GlobalHandoff

## 2026-09-25 ALVA-053已完成，继续ALVA-056

ALVA-053按诊断维护范围完成并集成，个人实现`17a6308`，总证据`evidence/20260925T064257Z-ALVA053-recovery-acceptance/`。JSON/schema/几何错误统一一次修正，识图显式240秒上限，普通调用仍120秒；PDF与PGlite测试隔离而未删断言。28/28、最终类型检查与历史候选重放通过；MiMo Pro业务动态工具/流式文本通过，Gemini3.8别名文本恢复；原生mimo profile的Flash识图18.663秒通过输出合同，但确认拓扑失败且约22.59m²未定义空间，不宣称户型已正确。

Pro在旧120秒业务时限下超时；240秒App Server复试的提权/环境传递调用被工具拦截未执行，保留未核验边界。原生profile用普通用户、无密钥复制/提权，不能冒充被拦截的业务复试。最新标注截图未标注原图/当前生产样本关联仍缺，未更改生产配置/数据、未部署。

下一步按本轮已有授权执行ALVA-056，改旧探针硬编码v2.5为当前`codex exec --profile mimo`并复测默认Pro；53不再占用共享文件。028仍暂停，057的yang-chatgpt与其共享文件保持不变。原8个56暂存文件/2份文档修改、preview五文件及全部历史Worktree保留；本次独立Git索引不吞并它们。重型任务串行、CPU60%、任务内存模型900MiB/含PGlite和类型1500MiB、Tasks128；初始限额失败留证，最终运行未OOM。回滚仅revert本票集成，不重置工作树。

2026-09-25恢复：ALVA-053/056退pending，028退待办且继续用户暂停；本轮不实施产品、重启服务或改资源配置。事故报告[docs/INCIDENT-2026-09-25-server-recovery.md](docs/INCIDENT-2026-09-25-server-recovery.md)与CURRENT/NextTask为本次入口。内存压力、网络故障及SSH限流已留证；9月25日Power key关机与9月22日资源故障分开记录，具体肇事程序仍未唯一确定。21个Worktree和所有原未提交成果保留。

- 项目根 `/home/ubuntu/Alva`；现役工程 api/、web/，开发前读 docs/PROJECT-STRUCTURE.md。
- 正式tracker：`.scratch/alva-completion/README.md`。44票 ALVA-008–051 已发布；当前 ALVA-008–012、ALVA-014–019、ALVA-043 已完成并集成 `main`。
- 用户已要求并行认领机制；当前规则任务不自动开工。依赖满足后在主目录NextTask署名即认领，独立Worktree开发，main串行集成后释放并解锁。参考家具及整组方案最后，随后最终验收。
- 当前范围：无预算；理想WebGL环境Demo；只有手动保存创建全局快照，可预览并明确恢复，不提供逐操作历史、撤销或自动存档。
- ALVA-014 已从现役问卷/API/UI/Chat工具/导出合同移除预算，并保留旧持久层/快照历史数据不迁移；统一验证码已由 ALVA-008 实施，新建筑生成仍待后续票且必须真实调用 Codex。
- 恢复读CURRENT/Handoff/NextTask。技能to-tickets用于发票，neat-freak用于知识对齐，不扩大生产权限。本库旧基线和历史证据保留；`/home/ubuntu/aws-hackthon` 已全目录归档且不使用。
- 2026-09-22 MCP 凭据收尾：现役授权密码只在 `/home/ubuntu/aws-hackthon/.mcp-runtime/server.env`，旧副本 `config.json`、`connection.txt`、`mcp-login-password.txt` 已删除。MCP 仍临时依赖该目录下 `.venv-mcp` 与 `.mcp-runtime`，迁移到 `alva-*` 目录前不得删除；详见 `docs/REMOTE-ACCESS.md`。

- 并行入口：NextTask.md；当前依赖就绪 frontier 为 ALVA-020/023/028/031/036/041；ALVA-028 已退待办（Execution state=pending、未实施，历史负责人保留），其余未认领。旧“全串行/首批全完成才可开始其他票”被覆盖。共享文件需协调，个人分支提交不等于done；全局交接只在main集成时更新。

- ALVA-052恢复原prod.huiyuanxp.com/todo入口，现役api/todo与web/todo直接读取44张正式票和NextTask；无需重复上传，30秒刷新。源状态和认领仍在main维护，不修改MCP。运维与验证见docs/TODO-LIST.md。

- ALVA-010 已在 main 集成：拓扑校正统一经过 `api/topology/commands.ts` 与 `validate.ts`，墙端点/房间顶点修改会同步共享连接并清除旧校准；分段保留来源，带门窗引用的墙不得静默移除。下一项已解锁为 ALVA-011。

- ALVA-014 已由 Lexie 完成：保留 Q01–Q60 稳定 ID，停用 Q19–Q22/Q58/Q60，问卷保留逐题状态与房间/项目 scope；预算能力退出现役合同但不清除历史数据。证据见 `evidence/20260921T073000Z-ALVA014-round1/` 与 `evidence/20260921T074000Z-ALVA014-round2/`。

- ALVA-011 已由 lzy 完成并合入 main（实现提交 `b113ba9`）：门窗增删改与墙体关联、越界/重叠/墙高校验、比例校准、不可变拓扑版本与来源指纹均已落地。真实 `floorplan.png` Chromium 验收覆盖墙线分段接口 200、非法几何 422、确认与刷新重载，证据 `evidence/20260921T100146840Z-ALVA011-real-browser/`；实时 Codex 复试受供应商 429 限流，未伪造通过。

- ALVA-017 已完成真实文字/图片流式咨询；模型目录动态来自 `/api/models`。ALVA-017 当轮真实验收使用 `gemini-3-flash`；当前 `main` 已由后续变更切换为 `gemini-3.1-flash-lite`。证据：`evidence/20260921T103000Z-ALVA017-round1/`、`evidence/20260921T110500Z-ALVA017-round2/`。

- ALVA-015 已完成 Chat 提取与手填双向确认：确认后保留精确原话来源，手填与 Chat 确认统一进入 answers/evidence，重复确认幂等拒绝，锁定值须显式解锁。证据见 `evidence/20260921T143000Z-ALVA015-round1/`、`evidence/20260921T145000Z-ALVA015-round2/`。

- ALVA-016 已完成未答看板与退出问卷分析：scope 独立统计、未答跳转 Chat、增量 evidence 游标、失败可重试和重复退出 no-op 均已验证。证据：`evidence/20260921T151500Z-ALVA016-round1/`、`evidence/20260921T153000Z-ALVA016-round2/`。

- ALVA-018 已完成咨询取消与故障重试：专属 Chat 取消、草稿/附件恢复、安全新 requestId 重试、取消前工具候选不落业务副作用均通过两轮验收。证据：`evidence/20260922T104500Z-ALVA018-round1/`、`evidence/20260922T112500Z-ALVA018-round2/`。

- ALVA-019 已完成录音转写、纠正与发送：文件 WAV 与 Chromium 模拟麦克风均通过真实 provider 转写；录音/转写取消不误发送，音频不持久化，发送只采用用户编辑后的文字。证据：`evidence/20260922T161500Z-ALVA019-round1/`、`evidence/20260922T162000Z-ALVA019-round2/`。实体麦克风在云端 runner 无物理设备，保持待验。

- ALVA-043 已完成有来源的业务指导咨询：已提供 references 被整理为 6 条只读 Skill 与显式资料缺口；业务指导回答服务端区分资料事实/推断/缺口并保留 citation，附件中的命令、负责人、预算或批准文字不获得执行/授权语义。真实模型与 Chromium 两轮通过，证据：`evidence/20260922T180000Z-ALVA043-round1/`、`evidence/20260922T181500Z-ALVA043-round2/`。

- ALVA-055已集成main，拓扑质量接口与二维定位见docs/TOPOLOGY-QUALITY.md；21回归+7组Chromium通过，未生产发布。诊断只读，MiMo实际识图结论由后续ALVA-056验证。

- ALVA-056当前pending：个人0d7ea5f已有真实MiMo返回，确认拓扑失败；main原暂存8文件及2份文档修改未集成，恢复见docs/MIMO-VISION-RETRY.md及NextTask。旧鉴权失败只是早期run，不是最新唯一结果。

2026-09-22 ALVA-054 发布核验：9454057实现已发布，新前端资源index-Bq_Jy-gM.js在线，公网首页/healthz/资源200，鉴权边界正常。隔离9项回归与11组浏览器交互通过；线上登录后验证因现役私有验证码文件被拒绝而blocked，未修改验证码或绕过鉴权。证据 evidence/2026-09-22T122724115Z-ALVA054-deployment/；详见docs/ALVA-054-home-intake.md。
