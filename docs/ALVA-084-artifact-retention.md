# ALVA-084 开发产物保留与代码回滚

用户授权：Agent视觉PNG只使用一次；其他开发验收产物保留一天、自动清理；代码依靠Git/GitHub，数据单独备份。本票为开发运维工具，不新增产品功能或MCP工具，不变更生产应用发布版本。

## 使用方式

```bash
# 输出候选，不删除
python3 scripts/alva-artifacts.py gc --all-worktrees
# 执行清理（定时器使用同一入口）
python3 scripts/alva-artifacts.py gc --all-worktrees --apply
# 新验收：输出目录通过ALVA_ACCEPTANCE_DIR传入子进程
python3 scripts/alva-artifacts.py run ALVA-084-unique-run python3 my-check.py
```

截图优先直接以内存buffer供视觉检查；需要落盘时放`.runtime/visual/`或验收目录。在同一编排工具调用里，先取得图片内容，再删除本地文件，模型仍能看见已返回的图片：

```javascript
const result = await tools.view_image({path: absolutePngPath});
image(result.image_url);
// 使用固定、安全引用的绝对路径；不拼接不可信shell文本。
const cleanup = await tools.exec_command({cmd: "python3 scripts/alva-artifacts.py discard /absolute/development/screenshot.png"});
text(cleanup);
```

`consume <PNG路径>`另提供返回data URL并立即删除的接口，适合能直接接收JSON图像数据的客户端；CLI标准输出不应重定向到长期日志。`discard`给view_image流程使用。二者都拒绝上传/生产目录、符号链接和已入Git文件。

## 一天保留与范围

每小时执行一次，实际删除在产物最后更新24–25小时后（另最多60秒随机延迟）。完整run按其中最新文件时间判断，避免近期run被部分清理。新入口通过flock持有`.active`运行锁，任务结束才解锁；即使运行超过一天仍受保护。额外扫描本机进程cwd、绝对命令参数、环境路径、打开文件，保护现役目录。

清理范围：所有注册Git工作区的`evidence/*`、`.runtime/acceptance/*`、`.runtime/visual/*`，以及旧`.runtime/<日期T...ALVA...>`隔离验收run。旧run名称含production/release/backup/deploy/live一律排除。不跟随符号链接、不删除Git跟踪文件；不扫描node_modules、嵌套worktrees或.git。无明确归属的旧诊断目录不猜删。

生产数据库、用户上传、模型资产、references、配置、备份及现役release不在清理范围。历史分支跟踪文件由Git管理；当前main移除424个二进制验收文件（约94.7MiB逻辑大小），历史提交仍可恢复。不重写Git历史，不自动清空其他分支。

## 安装与检查

```bash
sudo install -m 644 ops/alva/alva-artifact-gc.service ops/alva/alva-artifact-gc.timer /etc/systemd/system/
sudo systemctl daemon-reload
sudo systemctl enable --now alva-artifact-gc.timer
sudo systemctl start alva-artifact-gc.service
systemctl list-timers alva-artifact-gc.timer
journalctl -u alva-artifact-gc.service --no-pager -n 5
```

自动任务使用ubuntu身份、全局flock防重叠，日志输出删除数量/字节/路径及跳过计数。停用：`sudo systemctl disable --now alva-artifact-gc.timer`。恢复代码通过git revert本票，不恢复已经过期删除的临时产物。

## 回滚合同

代码的权威恢复点是完整Git SHA及锁文件。发布前核实`git fetch origin`后候选SHA可由GitHub上的引用到达；在隔离目录用`git archive <SHA>`恢复源码，按锁文件安装并构建、验证，再切换服务。不得在生产工作目录执行reset，也不使用旧验收工作区作为回滚权威。当前正在运行的固定release必须保留；历史发布目录不由开发产物定时器删除。

Git不包含生产数据库、上传与密钥。数据备份单独轮换和验证恢复。本票不删除历史数据备份，不改变其保留期；后续可独立实施数据备份策略。GitHub同步状态必须以实际远端检查为准，不能把本地已提交冒称远端可恢复。

## 验证与Implementation handoff

保护测试覆盖24小时阈值、preview不删除、生产/上传保护、Git跟踪文件、符号链接、活动进程路径、长运行锁、近期run整体保护、PNG消费即删及越界拒绝。5项保护测试通过；真实run子进程输出/完成回执通过；真实view_image后discard删除通过。13个近期浏览器验收脚本已接入ALVA_ACCEPTANCE_DIR，截图/私有输出不再写长期evidence。实际安装/首轮清理与远端状态由main集成后补记。
