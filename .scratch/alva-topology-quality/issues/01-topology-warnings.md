# ALVA-055：三类拓扑告警与二维定位

**ID:** ALVA-055

**What to build:** 三类拓扑告警与二维定位，从实际候选到可复查结果，不生成或确认正式设计。

**Blocked by:** ALVA-009、ALVA-010、ALVA-011（均已集成；当前额外缺陷作为本票回归，不沿用旧验收）

**Status:** in-progress

**Parallel lane:** topology / import，串行执行。

- [ ] 内部空洞：基于墙与合法开口边界的闭合面，排除外部、墙厚和已定义房间；报告显著未定义面积、位置与相关实体，不自动补房间。
- [ ] 不合理倾斜：相对于整屋主正交方向检测墙体及关联门窗，整屋旋转不误报；曲线近似折段提示复核，保留角度与阈值，不自动拉直。
- [ ] 孤立墙体：对墙端点/交点/合法门窗附着建立无序图；报告非主体连通分量、孤立门窗及错误引用，不删除实体。
- [ ] 导入候选和已确认工作稿均可读取实时诊断，编辑/重载后刷新；页面显示告警列表与点击定位；空场景、服务失败不冒充无问题。
- [ ] 补正反例、墙顺序/方向无关性、旋转、门窗桥接、外部凹口、嵌套闭合面、微小缝隙和房间覆盖反例；保留已有几何拒绝约束。
- [ ] 类型检查、相关API回归和真实Chromium告警定位/刷新通过；原场景、revision和快照不被只读诊断改变。

## Implementation handoff

用户于2026-09-22直接授权创建并实施。基线HEAD `9454057f93a0f9d5780f6ed71efb095ae1d62366`。原44票与旧week/step编号不变。
Owner：chatgpt-topology；独立分支 task/ALVA-055-chatgpt-topology，Worktree /home/ubuntu/Alva-worktrees/ALVA-055-chatgpt-topology。
范围：api/topology/、共享诊断类型、api/api.ts仅路由接线、web/src/main.tsx仅展示接线、web/src/topology/、测试与证据。不改api/import.ts、api/store.ts、api/model.ts，不碰暂停的ALVA-028与输出格式预览Worktree。独立验收端口4195；不自动部署/重启生产。
