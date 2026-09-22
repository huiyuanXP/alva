# alva 正式 Ticket 索引

本地Markdown tracker，一票一文件。首批6票与获批38票共44张，正式编号 ALVA-008–051，均已发布；当前 ALVA-008–012、ALVA-014–018 已完成并集成 `main`，其余按依赖与并行认领规则推进。只读网页通过独立维护任务ALVA-052接入。历史ALVA-000至007及旧库父票不改号、不关票。

状态词：`ready-for-agent`（定义已就绪，依赖完成且获得执行范围后可启动）、`in-progress`、`blocked`、`done`。只有验收通过并完成提交/交接才标done；研究完成或票已发布不代表功能完成。

| 本地号 | 正式ID | 原草案 | 交付 | 前置 |
|---|---|---|---|---|
| 01 | ALVA-008 | T01 | [统一登录验证码与多设备访问](issues/01-shared-login-code.md) | 无 |
| 02 | ALVA-009 | T02-A | [导入户型图并由Codex生成二维初稿](issues/02-import-codex-draft.md) | 01 |
| 03 | ALVA-010 | T02-B | [修改墙线与房间轮廓](issues/03-edit-wall-topology.md) | 02 |
| 04 | ALVA-011 | T02-C | [修正门窗、校准尺寸并确认拓扑](issues/04-openings-scale-confirm.md) | 03 |
| 05 | ALVA-012 | T02-D | [调用Codex生成建筑3D场景](issues/05-codex-architectural-scene.md) | 04 |
| 06 | ALVA-013 | T02-E | [建筑3D总览、剖切与房间视角](issues/06-example-building-views.md) | 05 |

执行方式：按正式依赖与[NextTask认领表](../../NextTask.md)署名认领，在独立Worktree条件并行；登录/导入/3D优先，但不再要求其他独立任务等待首批全链完成。ready-for-agent仅表示定义就绪；验收且集成main后才done。下表将审核编号映射为正式票，R04/R29已删除，无对应正式票。

## 本次发布（38张）

| 本地号 | 正式ID | 审核号 | 交付 | 前置正式ID |
|---|---|---|---|---|
| 07 | ALVA-014 | R01 | [问卷范围精简与逐题回答](issues/07-questionnaire-scope.md) | 无 |
| 08 | ALVA-015 | R02 | [Chat提取与手填双向确认](issues/08-chat-answer-confirmation.md) | ALVA-014 |
| 09 | ALVA-016 | R03 | [未答看板与退出问卷分析](issues/09-unanswered-followup.md) | ALVA-015 |
| 10 | ALVA-017 | R05 | [文字与图片真实流式咨询](issues/10-multimodal-chat.md) | 无 |
| 11 | ALVA-018 | R06 | [咨询取消与故障重试](issues/11-cancel-retry.md) | ALVA-017 |
| 12 | ALVA-019 | R07 | [录音转写、纠正与发送](issues/12-voice-transcription.md) | ALVA-017 |
| 13 | ALVA-020 | R08 | [作用范围澄清与确认](issues/13-scope-confirmation.md) | ALVA-017 |
| 14 | ALVA-021 | R09 | [局部3D候选比较与采用](issues/14-candidate-adoption.md) | ALVA-020、ALVA-013 |
| 15 | ALVA-022 | R10 | [房间用途与布局分开确认](issues/15-room-purpose.md) | ALVA-021 |
| 16 | ALVA-023 | R11 | [家具添加、选择与复制](issues/16-furniture-add-copy.md) | 无 |
| 17 | ALVA-024 | R12 | [家具移动、旋转与吸附](issues/17-furniture-transform.md) | ALVA-023 |
| 18 | ALVA-025 | R13 | [家具属性与款式替换](issues/18-furniture-properties.md) | ALVA-023 |
| 19 | ALVA-026 | R14 | [移回家具库并保留证据](issues/19-furniture-return.md) | ALVA-023 |
| 20 | ALVA-027 | R15 | [跨房间转移与来源关系](issues/20-furniture-transfer.md) | ALVA-023 |
| 21 | ALVA-028 | R16 | [首次需求分析与生活痛点](issues/21-initial-pain-analysis.md) | ALVA-015 |
| 22 | ALVA-029 | R17 | [布局调整与保存前冲突复核](issues/22-layout-review.md) | ALVA-028、ALVA-024 |
| 23 | ALVA-030 | R18 | [专业未知与用户取舍分离](issues/23-professional-unknowns.md) | ALVA-029 |
| 24 | ALVA-031 | R19 | [设计师只读访问与撤销](issues/24-designer-readonly.md) | ALVA-008 |
| 25 | ALVA-032 | R20 | [墙体分类、证据与专业授权](issues/25-wall-evidence.md) | ALVA-011、ALVA-031 |
| 26 | ALVA-033 | R21 | [非承重墙改造与开口迁移](issues/26-wall-renovation.md) | ALVA-032、ALVA-021 |
| 27 | ALVA-034 | R22 | [空间合并与需求迁移](issues/27-room-merge.md) | ALVA-033 |
| 28 | ALVA-035 | R23 | [空间拆分与需求分配](issues/28-room-split.md) | ALVA-033 |
| 29 | ALVA-036 | R24 | [手动保存全局快照与失败重试](issues/29-manual-snapshot.md) | 无 |
| 30 | ALVA-037 | R25 | [快照列表与状态预览](issues/30-snapshot-preview.md) | ALVA-036 |
| 31 | ALVA-038 | R26 | [从快照恢复全局状态](issues/31-snapshot-restore.md) | ALVA-037 |
| 32 | ALVA-039 | R27 | [桌面漫游与输入暂停](issues/32-desktop-walkthrough.md) | ALVA-013、ALVA-024 |
| 33 | ALVA-040 | R28 | [昼夜季节与地理假设](issues/33-sunlight-seasons.md) | ALVA-013 |
| 34 | ALVA-041 | R30 | [参考图片偏好标注](issues/34-reference-annotation.md) | ALVA-017 |
| 35 | ALVA-042 | R31 | [偏好确认与后续建议引用](issues/35-preference-confirmation.md) | ALVA-041、ALVA-015 |
| 36 | ALVA-043 | R32 | [业务指导依据用于咨询](issues/36-business-guidance.md) | ALVA-017 |
| 37 | ALVA-044 | R33 | [设计师任务书与业主说明](issues/37-audience-documents.md) | ALVA-016、ALVA-030、ALVA-036、ALVA-042、ALVA-043 |
| 38 | ALVA-045 | R34 | [同版本完整交付包](issues/38-delivery-bundle.md) | ALVA-044、ALVA-034、ALVA-035、ALVA-013 |
| 39 | ALVA-046 | R35 | [参考家具变成可确认实例](issues/39-reference-furniture.md) | ALVA-018、ALVA-019、ALVA-022、ALVA-025、ALVA-026、ALVA-027、ALVA-037、ALVA-038、ALVA-039、ALVA-040、ALVA-045 |
| 40 | ALVA-047 | R36 | [整组参考方案采用与回退](issues/40-group-proposals.md) | ALVA-046 |
| 41 | ALVA-048 | R37 | [最终回归：导入、Chat、问卷、痛点](issues/41-acceptance-groups-1-4.md) | ALVA-047 |
| 42 | ALVA-049 | R38 | [最终回归：编辑、保存、交付、桌面](issues/42-acceptance-groups-5-8.md) | ALVA-047 |
| 43 | ALVA-050 | R39 | [公网与重启恢复复核](issues/43-public-verification.md) | ALVA-048、ALVA-049 |
| 44 | ALVA-051 | R40 | [备份、干净复现与最终交接](issues/44-recovery-handoff.md) | ALVA-050 |

开发位置：仓库根 `/home/ubuntu/Alva`，现役后端 `api/`、前端 `web/`。实施前读[目录规范](../../docs/PROJECT-STRUCTURE.md)、项目Handoff/NextTask及[首批研究](../../Research/LOGIN-IMPORT-3D.md)。

用户确认范围：无预算；Demo仅考虑理想WebGL机器；只有手动保存创建全局快照，可预览并明确恢复，无逐操作历史、自动存档或撤销。参考家具/整组方案仍在其他功能之后，最终验收在其后。有效验证码在实施首票时生成，不在发票阶段生成。

[审核来源与范围映射](../../Research/REMAINING-TICKETS-REVIEW.md)保留作发布依据；后续票据状态和验收以本索引及各正式文件为准。没有任何功能因发票而完成或上线。

每票已补充 Parallel lane；同组默认串行，跨组需协调共享文件。当前可认领列表及署名只维护在主目录NextTask，票据依赖不等同于无文件冲突。个人提交不解锁后继，完成集成提交后才移除认领行并补充新就绪票。

只读网页：[To Do List](https://prod.huiyuanxp.com/todo)。网页直接读取本目录与主目录NextTask，每30秒同步；不另建状态副本。
