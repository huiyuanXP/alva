# ALVA-040：昼夜、季节与地理假设

## 当前交付边界

本票由 `chatgpt-sunlight` 在独立分支 `task/ALVA-040-chatgpt-sunlight` 实施。现阶段实现日照纯计算、两个 Three.js 视图共用的灯光及真实画面回归；主 Chat 的生活设计 MCP 与带回执的 UI action 仍等待 ALVA-066 的共享接口。未完成主 Chat 端到端验收前，本票保持 `in-progress`，不合入或发布部分功能。

工作区为 `/home/ubuntu/Alva/.runtime/worktrees/ALVA-040-chatgpt-sunlight`。不修改 ALVA-057/066 已登记占用的 `web/src/main.tsx`、`api/chat.ts`、`api/model.ts`、`api/store.ts`、`api/api.ts` 和 `api/mcp/`；不接管其他分支或生产数据库。

## 已实现的行为

`SceneView` 和 `BuildingView` 使用同一个日照计算和灯光模块。太阳在上午从东侧照射、下午从西侧照射；图上北向参与世界坐标变换。太阳位于地平线下时直射强度为零，并关闭日光投影，不再将夜间太阳抬高到建筑上方或保留最低直射强度。夜间环境光只是保留查看场景所需的示意亮度，并非月光测算。

时间或年内日期改变只更新灯光并请求重绘，不重建几何、WebGL renderer 或相机。阴影相机按当前建筑包围球设置，避免对不同大小的住宅使用固定范围。建筑视图空闲时不再重复渲染相同画面；旋转、缩放、剖切、房间选择仍按原入口工作。

两个视图都显示实际参与计算的真太阳时、非闰年日期、纬度、图上北向、太阳高度和方位，以及原有地理假设。半小时在新读数中显示为 `14:30`；主页面旧滑杆旁的 `14.5:00` 文案属于已占用的 `main.tsx`，后续协同接入时一起修正，本轮未擅改该文件。

这些参数属于浏览器查看状态，不修改项目 Scene、revision 或手动保存快照。通过重新选择相同参数重现画面；尚未增加刷新后恢复查看参数或服务端查看状态持久化。

## 坐标、算法与限制

- 真太阳时范围 0–24 小时，24:00 和 00:00 对应同一太阳方向；不将本机时区或用户所在地默认为房屋地点。
- 年内日期为非闰年的第 1–365 天，按每天正午近似计算赤纬。不是指定真实年份的精密历法。
- 纬度范围沿用现役 Scene 合同的 -66° 至 +66°。北向角从图上方顺时针计算，0° 表示图上方为北；360° 与 0° 等价。
- 图上 x 向右、y 向下；Three.js 中 x 对应图 x、z 对应图 y、y 向上。先计算东、北、天顶分量，再按图上北向旋转，避免正午或接近天顶时通过除法求方位。
- 赤纬采用 NOAA 的近似傅里叶公式；高度由纬度、赤纬、太阳时角推导。公式来源为 NOAA《General Solar Position Calculations》第一页：<https://gml.noaa.gov/grad/solcalc/solareqns.PDF>。
- 光照向量和 Three.js DirectionalLight 的目标点共同决定方向。目标对象实际加入场景。实现参考：<https://threejs.org/docs/pages/DirectionalLight.html>。

未使用经度、时区和均时差换算钟表时间；未计算大气折射、天气、周边遮挡、实测朝向误差或法定日照时长。画面用于方案比较，不是现场日照分析或施工合规结论。

## 文件职责

| 文件 | 职责 |
|---|---|
| `packages/contracts/alva/sunlight.ts` | 无运行时依赖的查看参数、严格输入校验、日照计算及日期/时间格式化；不复制 Scene schema |
| `web/src/scene/sunlight.ts` | 两个视图共用的真实 Three.js 灯光、投影范围、昼夜与释放逻辑 |
| `web/src/scene/SunlightReadout.tsx`、`sunlight.css` | 参数与估算假设读数，不写项目状态 |
| `web/src/SceneView.tsx`、`BuildingView.tsx` | 装配共用日照；时间更新与几何重建分开 |
| `tests/alva-sunlight.test.ts` | 天文方向、边界输入、7,350 组参数、实际 Three.js 灯光与投影相机断言 |
| `scripts/alva-040-browser.ts` | 隔离真实 API、浏览器滑杆、日夜/季节截图、阴影像素对照、相机保持和项目不变验证 |

## 验收入口

使用锁文件匹配的独立依赖目录，不共享可写依赖或构建产物。本轮依赖从已安装主目录独立复制，不将其声称为干净联网安装验收。

```bash
node node_modules/tsx/dist/cli.mjs --test tests/alva-sunlight.test.ts tests/alva-building-views.test.ts
GOMEMLIMIT=650MiB GOGC=50 GOMAXPROCS=1 node node_modules/typescript/bin/tsc --noEmit
NODE_OPTIONS=--max-old-space-size=700 RAYON_NUM_THREADS=1 node node_modules/vite/bin/vite.js build --config web/vite.config.ts
node node_modules/tsx/dist/cli.mjs scripts/alva-040-browser.ts
```

上述重型命令必须通过项目共享重任务锁和任务 cgroup 串行运行；CPU80%、1200M（浏览器1600M）、Tasks128，并留资源采样。不能仅设置应用堆大小而省略任务级限额。完整实测结果和独立 run ID 在本票 `Implementation handoff` 中记录。

浏览器用明确标识的合成 8×6m 房间和确定性建筑构件，通过真实产品页面操作现有滑杆，未 mock 日照或渲染业务链。对同一时刻分别捕获真实投影画面与仅关闭投影的控制画面，比较像素；此控制只存在测试进程中，不改变场景数据。模型识图质量、真实建筑生成、生产登录和实体设备均不由此测试宣称通过。

首次完整检查中的 17 项测试通过，但原生编译器触及任务内存上限而被主动停止，构建未执行；保留原始日志和 `review.json`。`systemd-run` 对主动 TERM 返回零不能当作检查通过，后续任务增加正常完成标记，并给原生编译器单独设置内存目标。失败或未启动的 run 不覆盖。

浏览器脚本首轮因 TSX 转换的嵌套命名函数依赖 `__name`，在浏览器求值上下文中失败；改为直接解码两个捕获帧后继续验证，未修改产品逻辑或断言。下一轮全屋视图全部通过，但第二个合成项目被现有单授权项目会话规则拒绝（401）；随后改为在同一授权合成项目上顺序装载两个渲染夹具，而不是放宽认证或忽略控制台错误。两次失败日志均保留，不能算通过。

## ALVA-066 接入后的剩余动作

生活设计 MCP 应通过现役受约束 UI action 设置太阳时/年内日期，复用 `parseSunlightSettings` 与 `evaluateSunlight`，而不是复制公式或由模型直接写项目。地理参数采用最新项目已知值，不能静默猜测现场朝向。

主 Chat 必须从自然语言请求发起实际工具调用；服务端检查项目、角色和阶段，处理过期查看上下文；浏览器执行后返回实际参数、渲染成功或失败回执。未收到回执不得声称画面已改变。错误需沿 ALVA-066 返回 `isError=true` 及稳定代码、原因、可重试性和修复步骤。

补验自然语言改变时间/季节、非法参数、越权/跨项目、阶段隐藏、过期与取消重试、实际画面和回执后，再进行最新 main 同步、整票集成及协调收尾。当前纯函数和浏览器测试不是已接通的 MCP 工具。
