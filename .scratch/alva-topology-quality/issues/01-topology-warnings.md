# ALVA-055：三类拓扑告警与二维定位

**ID:** ALVA-055

**What to build:** 三类拓扑告警与二维定位，从实际候选到可复查结果，不生成或确认正式设计。

**Blocked by:** ALVA-009、ALVA-010、ALVA-011（均已集成；当前额外缺陷作为本票回归，不沿用旧验收）

**Status:** done

**Parallel lane:** topology / import，串行执行。

- [x] 内部空洞：基于墙与合法开口边界的闭合面，排除外部、墙厚和已定义房间；报告显著未定义面积、位置与相关实体，不自动补房间。
- [x] 不合理倾斜：相对于整屋主正交方向检测墙体及关联门窗，整屋旋转不误报；曲线近似折段提示复核，保留角度与阈值，不自动拉直。
- [x] 孤立墙体：对墙端点/交点/合法门窗附着建立无序图；报告非主体连通分量、孤立门窗及错误引用，不删除实体。
- [x] 导入候选和已确认工作稿均可读取实时诊断，编辑/重载后刷新；页面显示告警列表与点击定位；空场景、服务失败不冒充无问题。
- [x] 补正反例、墙顺序/方向无关性、旋转、门窗桥接、外部凹口、嵌套闭合面、微小缝隙和房间覆盖反例；保留已有几何拒绝约束。
- [x] 类型检查、相关API回归和真实Chromium告警定位/刷新通过；原场景、revision和快照不被只读诊断改变。

## Implementation handoff

用户于2026-09-22直接授权创建并实施。基线HEAD `9454057f93a0f9d5780f6ed71efb095ae1d62366`。原44票与旧week/step编号不变。
Owner：chatgpt-topology；独立分支 task/ALVA-055-chatgpt-topology，Worktree /home/ubuntu/Alva/.runtime/worktrees/ALVA-055-chatgpt-topology。
范围：api/topology/、共享诊断类型、api/api.ts仅路由接线、web/src/main.tsx仅展示接线、web/src/topology/、测试与证据。不改api/import.ts、api/store.ts、api/model.ts，不碰暂停的ALVA-028与输出格式预览Worktree。独立验收端口4195；不自动部署/重启生产。

## 完成验证，等待主线集成

- 类型检查通过；21项定向测试通过（13新增+8既有，0失败/跳过）；生产构建通过，保留原有大chunk提示。
- 真实Chromium七组行为通过；证据 `evidence/20260922T104414767Z-ALVA055-browser-85278c/`，源码指纹见result.json。桌面总览、三类定位、正常对照和窄屏截图已人工审阅。新面板自身适配，但旧三栏应用整体窄屏溢出仍存在，不称全站移动端通过。
- 只读鉴权、跨项目隔离、确认场景与快照不变、真实编辑后重算、故障不报假成功均已验证。两个预期负向请求分别是503故障注入与门窗保护422，非预期错误0。
- 第一次测试20/21，失败为合成夹具的房间ID与墙ID重名，已修夹具且完整复跑21/21；未放宽断言。独立安装曾并发导致缺库，串行npm ci后恢复，日志保留。
- 新增API/界面/确定性诊断和共享返回类型；polygon-clipping 0.15.7只在后端。未改import.ts、store.ts、model.ts或输出格式预览Worktree。
- 所有criteria的实现证据已满足，Status在main集成验证后才改done。
- 运行边界：本次无生产部署/重启、无生产候选覆盖；4195测试进程已关闭。下一步集成ALVA-055，再认领ALVA-056真实MiMo复测。
- 规则与文档已核对；生成记忆out-of-scope；工作区及复核截图保留，不删除其他Worktree。

## Main 集成验收

原实现提交 `06b63c0`，同步main后的工作分支 `512948b`。主目录squash结果与浏览器源码指纹一致；main类型与21项定向测试复跑通过。集成日志私有目录 `.runtime/20260922T105216Z-ALVA055-integration`。未在main重建web/dist或重启生产。ALVA-056已解锁。
