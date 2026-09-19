# 恢复索引

当前为可运行核心成果，核心已发布prod.huiyuanxp.com；完整任务未完成、未 ready_for_review。阅读 Handoff.md → PROGRESS.md → NextTask.md；原始完整要求在 SPEC.md、references/initial-task.md。

最新公网浏览器通过：evidence/20260919T113205287Z-c8336560/result.json；核心代码指纹：evidence/20260919T111200Z-core/fingerprint.json；生产备份恢复：evidence/20260919T113809595Z-130d7739/result.json；公网HTTPS/流式/重启：evidence/20260919T113620651Z-7a9de8f6/result.json。

运行入口与私有配置路径见 Handoff.md，运维见 ops/alva/README.md。不要重新移植旧库，不要把旧 npm start 当作新应用入口。

本轮可复现源码包：evidence/20260919T113939Z-1906c48f/alva-source.tar.gz（含manifest与安装记录，不含私有配置/数据/参考附件）。

最新任务ALVA-007：公共入口直接访问域名，原项目跨浏览器共享；恢复详情见Handoff。
