# ALVA-054 聊聊你的家逐题问卷

Status: in-progress
Owner: yang-chatgpt
Branch: task/ALVA-054-yang-chatgpt
Worktree: /home/ubuntu/Alva-worktrees/ALVA-054-yang-chatgpt

用户2026-09-22明确授权开发并发布 https://prod.huiyuanxp.com/。独立维护任务，不冒充ALVA-028生活痛点分析完成。

- 左侧“你的生活需求”替换为“聊聊你的家”按钮。
- 基于用户附件02_intake_form.md和已有同源问卷目录，逐题呈现A-D选择、E自由补充；选中仅为草稿，明确确认后写入现有问卷。
- 可随时保存进度、关闭、重新打开与刷新恢复；保存草稿不创建全局快照。
- 维持奶油色、橄榄绿和圆角设计；键盘操作、窄屏、关闭保护和保存失败可恢复。
- 维持现行已停用题Q19–22/Q58/Q60；不用附件虚构城市、金额、家庭情况作为用户事实。
- 使用独立合成数据、端口4284；验收通过后集成、备份发布文件、发布并校验生产。

预计共享文件：web/src/main.tsx、api/api.ts、api/model.ts；新增api/intake、web/src/intake及相关测试。ALVA-028仍暂停且同属本负责人，无同时写入。
