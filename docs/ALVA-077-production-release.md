# ALVA-077 生产发布收据

2026-09-27 14:49 UTC已发布并通过公网登录复验。固定产品提交`c053dc64c7639903e70541abb37986e3d933db99`，包含本票问卷批次/候选决策与此前中英文、即时阶段切换。后续main文档提交不自动改变生产。

## 固定版本与回滚

- 入口：https://prod.huiyuanxp.com；服务`alva.service`。
- 发布目录：`.runtime/20260927T144930Z-ALVA077-production/release/`。
- 覆盖配置：`/etc/systemd/system/alva.service.d/ALVA077-release.conf`。
- 停写备份与已校验回滚脚本：`.runtime/20260927T144930Z-ALVA077-production/data.tar.gz`、`rollback.sh`；保留076旧release。
- 171项产品源码与已验Worktree/最终清单一致；既有依赖、生产数据路径、环境文件、验证码和MCP/Tunnel配置不变。
- [部署结果](../evidence/20260927T144930Z-ALVA077-production/result.json)。

## 验收

10项相关回归、最终类型/构建、5项浏览器专项、4步实际主Chat→生活HTTP MCP→统一候选→关闭、5步原阶段导航通过。真实模型实际调用read_questionnaire_batch、get_snapshot、suggest_furniture并生成2个候选，页面逐张展示。完整证据见[功能票](ALVA-077-questionnaire-batches.md)。

[公网登录复验](../evidence/2026-09-27T145020208Z-ALVA077-public/result.json)通过：中英文显式发送入口、至多一张待处理候选/关闭入口/无小预览日照遮挡、两阶段往返、资源JS/CSS哈希一致，页面错误0。读取项目与切换未自动生成建议；scene、candidate、已确认拓扑/建筑、answers、homeVision、proposals、savedVersion均未改动，恢复原阶段。未替用户发送问卷、采用或拒绝候选。真实生成与拒绝写入在隔离合成数据中验收。

## 知识收尾与边界

neat-freak已枚举文件并核对本票文档/结构/规则/源码和运行态：代码、生产、文档changed-and-verified；规则verified-current；生成记忆与Git远端同步out-of-scope。本机main已集成；只读核对时远端main为`96503ad`，本票未推送远端。

本票无待完成产品或发布检查。既有Vite >500kB chunk提示、整页窄屏横向溢出未在本票处理。临时验证码副本已删除；备份、失败证据、Worktree和合成数据复核现场保留，等待用户确认后清场。未清理其他人的Worktree或两项原有未跟踪文件。
