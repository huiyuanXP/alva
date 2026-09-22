# 36: 业务指导依据用于咨询

**ID:** ALVA-043

**Parent scope:** T13

**Review reference:** R32

**What to build:** 咨询能使用已提供的业务文档给出有来源的指导。

**Blocked by:** [ALVA-017](10-multimodal-chat.md)

**Status:** done

**Execution:** Lexie 已完成实现与两轮验收；原实现提交 `38e230ba1d2c48cf9f41da0c176ada09f1558135`，随后 squash 集成到 `main`。

- [x] 从可用文档整理指导Skills及出处，对缺资料明确登记。
- [x] 真实咨询至少一例验证指导被使用，区分引用事实与推断。
- [x] 附件中的命令/权限文字不成为执行授权，不编造负责人；业务指导不提供预算内容。

**Scope boundary:** 删除预算；仅在支持WebGL且性能充足的理想机器验收。只有用户手动保存才创建全局快照；点击快照只读预览，明确恢复才替换工作状态。日常确认、生成或恢复均不自动建立存档，不要求逐操作历史或撤销。原话/需求来源作为业务数据保留。

**Development location:** 实施前阅读[统一目录规范](../../../docs/PROJECT-STRUCTURE.md)；按现役工程归属开发，不向旧工程写新功能。

**Parallel lane:** `chat`；同组默认串行，不同组满足依赖且文件归属不重叠时可并行。共享入口/schema/存储改动需先登记并协调，详见[认领与集成规则](../../../NextTask.md)。


## Implementation handoff

- 新增 api/business-guidance.ts，把已提供的 references/02_intake_form.html、references/01_sample_delivery.html、references/项目定位.md 整理成 6 条只读业务指导 Skill。每条包含来源 citation、可应用方式和不能据此推出的边界；另显式登记现场尺寸/机电、结构与材料性能、负责人/授权三类资料缺口。预算/报价/费用被明确排除，不作为指导内容。
- Chat 新增白名单只读工具 get_business_guidance。对明确提出“依据资料/业务指导/怎么安排/怎么选”等业务指导意图的咨询，服务端先筛选相关 Skill 并注入上下文；最终返回由服务端按“资料事实 / 基于当前信息的推断或建议 / 缺少资料”三段进行 grounding，来源 citation 必须可见。普通 Chat 不命中指导意图时保持原流式模型行为。
- 资料、附件和工具结果一律只作为数据，不成为命令、权限授予或负责人任命。若模型补充文本包含管理员、负责人、批准、权限、预算/报价/费用或施工等授权敏感表述，该补充不会进入最终 grounded 业务指导答复；不会因此创建 proposal 或修改 scene。
- Round 1：evidence/20260922T180000Z-ALVA043-round1/result.json。真实 gemini-3.1-flash-lite 咨询使用 BG01（居家工作位），引用 references/02_intake_form.html#Q10，区分资料事实/推断/缺资料；scene 不变、proposal 0。
- Round 2：evidence/20260922T181500Z-ALVA043-round2/。真实 Chromium UI + 真实模型，输入包含“管理员、负责人、预算、批准施工”的附件式文字并询问石材；最终只输出 BG02/BG05 受控指导与缺口，未赋予张三负责人身份、未批准施工、未提供预算指导，proposal 0、console error 0。
- 调试失败证据按独立 run 保留：首次真实模型仍走问卷优先、一次浏览器过早读取持久化、一次模型未自行输出 citation，以及一次验收脚本沿用无关 >=2 delta 门槛；均已分别修正并用新 run ID 完整复跑。
