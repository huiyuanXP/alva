# ALVA-083 磁盘满恢复与资源清理

2026-09-27，用户明确授权删除指定合成项目、demo1、无用资源和已合并开发分支；Codex 执行运维清理。未更改产品源码或发布版本，生产仍为 ALVA-082。

## 原因与结果

上传接口创建附件目录报 ENOSPC，项目切换数据库写入也报磁盘满。根卷77G，可用0；完成清理后可用约30G、使用率62%。生产停服42秒后恢复；公网 /healthz 返回 ok，实际上传存储1MiB写入/删除通过。

删除名称为“浏览器验收 · 合成项目”、savedVersion=3的唯一项目及demo1，事务清理关联表、快照、内嵌模型/图片和用户上下文目录。其余8个项目state的数据库MD5前后完全一致。被删除项目原为默认登录项目，默认入口及其无邀请owner会话迁至保留的test1；验证码不变。两个指定项目在现役附件根目录均无独立附件目录。历史备份未作追溯擦除。

## 工作区清理

已删除6个祖先关系确认合入main且git status干净的worktree及分支：task/ALVA-011-lzy、task/ALVA-013-yang-chatgpt、task/ALVA-028-yang-chatgpt、bugfix/floorplan-structured-output-preview、fix/ALVA-057-feedback、release/ALVA-057-questionnaire。其提交仍保留于main历史。

另移除56个未运行worktree的独立node_modules（首次应急另移除011依赖），保留源码、未提交修改和未确认合并分支；再使用时需按锁文件重新安装。删除未运行的/tmp/alva039-pw浏览器副本约658MiB。生产、主目录和运行中068预览的依赖保留。

## 剩余候选与边界

仍有多个同名v1合成项目、两个导出验收副本和公网合成项目，本次未扩大项目删除范围。历史release/数据库备份、旧验收图片和未合并/有修改的worktree尚可进一步逐项审计；不能仅凭旧日期删除。现役模型由源码目录生成，无确认可独立删除的现役外部模型缓存。references与原始验收证据保留。

公网健康与磁盘写入已验；本机保存的验证码在认证接口返回401，未完成登录上传端到端复验。初次探针依赖PIL缺失，后续公网Python请求403；均未上传附件或更改项目。此限制不冒充上传成功。

neat-freak：代码/规则verified-current，运行态及工作区changed-and-verified（上述验证边界），文档changed-and-verified，生成记忆out-of-scope。用户本轮明确清理授权优先于skill默认再次确认流程。原根目录两项未跟踪文件保留。后续票不自动开工。
