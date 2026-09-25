# 2026-09-25 服务器重启与任务恢复调查

检查时间：2026-09-25，Asia/Singapore（UTC+8）。取证 run：`20260925T034733Z-server-recovery-2cae71`。主仓库 `/home/ubuntu/Alva`，取证基线 main `5e1513ad588e3b0c2a359684f2157124bf381dd2`。本次范围是只读取证、退回待办和交接更新，不包含产品实施、模型重试、服务配置调整或再次重启。

## 结论与证据强度

**已证实**：历史上发生严重内存压力、页面回收/磁盘等待拥塞，网络管理服务 watchdog 失败，SSH 发生 MaxStartups 限流丢弃连接。**有力推断**：这些资源和网络故障共同造成当时远程访问失效。**尚未证实**：具体哪个可执行程序/PID/测试命令是2026-09-22那次资源峰值的首要制造者；也没有证据证明9月22日到9月25日重启前CPU持续满载。

本次实际停机触发是系统收到 Power key 事件并执行 poweroff；不是日志中可见的 kernel panic 自动重启。云控制台操作者/操作API没有在本轮查询，不能由操作系统日志推定具体账户或点击动作。用户报告为满载失联后人工强制重启；OS仍记录了有序关机过程，这两者不应混为“内核自己重启”。

## 时间线（以下统一新加坡时间）

| 时间 | 观察 | 直接证据 |
|---|---|---|
| 9月22日23:18前后 | memory pressure；systemd-networkd、journald、snapd watchdog失败；networkd随后自动拉起 | `pressure-events.txt`、`network.txt` |
| 9月23日00:12 | ens5 设置路由超时，随后进入 Failed；该单元日志直到本次停机没有后续恢复成功行 | `network.txt` |
| 9月23日00:21–00:54 | SSH 开始 MaxStartups throttling；累计记到8次连接丢弃 | `ssh-throttling.txt` |
| 9月23日02:14:37 | 2 CPU：load1/5/15=70.17/95.06/108.41；可用内存111,244 KiB（108.6 MiB）；16个blocked任务；Swap为0 | `sar22.txt` |
| 9月23日00:00:12–02:14:37的延迟采样区间 | user=1.47%、system=51.08%、iowait=44.41%、idle=1.12%；正常十分钟采样出现约134分钟缺口；页面扫描约1,604,151页/秒、回收效率约2.87% | `sar22.txt` |
| 9月23日02:20以后及9月23/24日主要采样 | 负载回落；23/24日UTC日统计CPU平均idle均98.96%；不是一直持续计算满载 | `sar22.txt`、`sar23-averages.txt`、`sar24-averages.txt` |
| 9月25日08:00–11:30 | 重启前采样CPU平均idle98.97%；可用内存约1.21 GiB；load1平均0.01 | `sar25.txt` |
| 9月25日11:30:42、11:31:13、11:31:53 | 三次Power key / poweroff事件，中间两次启动很短 | `shutdown-peaks.txt`、`boot-2-power-events.txt`、`boot-1-power-events.txt` |
| 9月25日11:32:06 | 当前boot开始；本轮MCP、本地及公网healthz可用 | `boots.txt`、`health.json` |

sar采用间隔/累计采样；上述百分比是对应区间平均，不是事件开始的逐秒画像。134分钟缺口本身不是精确故障起点。journal部分行存在延迟写入与时间顺序混杂，保留UTC原始时间，不捏造毫秒级因果链。

## 为什么表现为“满载且SSH不可用”

本次采样不是普通用户程序算满CPU的典型画像：内核态与I/O等待占比很高，伴随可用内存下降、极高页面扫描和低回收效率，符合内存回收颠簸/工作集反复读取的特征；因为Swap为0，不称为“交换分区已用满”。网络服务还真实出现 watchdog 和 route timeout。SSH日志直接记录未认证连接上限触发及丢弃，因此不是仅凭“连不上”猜测SSH问题。无法据此证明每一条被丢弃连接都属于用户，也不把重复连接直接定性为攻击。

Linux PSI文档说明资源争用可造成延迟与系统停顿；OpenSSH手册将MaxStartups定义为未认证连接并发限制。这里引用它们解释机制，实际事故数值来自本机日志，不来自外部文章。

## 能否锁定到某个程序

停机时systemd累计资源记录：开发会话 `session-886.scope` 历史memory peak=2.8G；`coding-tools-mcp.service` peak=2.0G；`alva.service` peak=957.8M。它们是各自生命周期峰值，**不保证同一时刻，不能相加，也不能当成具体进程峰值**。MCP单元还包含其执行的子任务，不能把2.0G直接归咎于MCP服务本体。开发/验收任务是后续应优先加资源约束、采样的范围，但尚不能点名某次Codex、MiMo、Chromium或npm命令为确定根因。

现存内核日志另有9月16日的OOM记录，受害者包括MainThread与chrome-headless；这是另一日期的历史事件，不能移花接木成9月22日的证据，也不能由“被杀进程”反推唯一肇事者。9月22日事件未检出可用于精确归因的OOM victim进程表。本机未发现atop历史或进程记账pacct、CloudWatch agent日志目录；未查询云端CloudWatch/CloudTrail，未访问主机凭据或Codex对话日志。本轮可归因到故障机制，尚不能负责任地唯一归因到一个PID。

## Ticket恢复结果与下一步

| 对象 | 当前恢复状态 | 已保留成果与恢复动作 |
|---|---|---|
| ALVA-053 | pending：诊断收尾待恢复 | 完整报告/证据在干净分支88506f2；确认剩余路由和生产样本关联，再复核/集成；不再显示正在执行 |
| ALVA-056 | pending：主线集成待恢复 | 最新个人提交0d7ea5f；已有真实MiMo可解析返回但确认拓扑失败；8个原暂存文件+2份原未提交文档保留；先复核差异与离线证据，再独立完成集成；不再误报仅有鉴权失败 |
| ALVA-028 | pending：用户此前暂停，尚未开工 | 释放当前执行占用，保留历史负责人和f3aedbb工作区；只有新开工指令才继续；前置ALVA-015已done，后继仍未解锁 |
| structured-output-preview | 未编号的未集成工作现场 | 5个原修改文件保留，当前未发现对应进程；不能擅自当作完成或擅自分配正式票号 |

现役44票看板仅接受 ready-for-agent/in-progress/blocked/done 四个Status。为避免写入未知状态令线上看板返回500、又不因文档整理重启服务，ALVA-028的**Status恢复为ready-for-agent，Execution state明确pending**，清空NextTask当前署名后回到现有可认领/待办列；“定义就绪”不是“用户允许自动开工”。两张额外维护票不在44票数据源内，单票Status直接pending，并列在NextTask的Pending恢复队列。未新增假的完成状态，也未把全部产品票退回。

## 取证时服务器状态与保护

2 CPU、3.7 GiB内存、Swap=0；磁盘约77G、剩余44G。alva与两个Tunnel以及MCP均active；本地/公网healthz均返回alva/ok。主要进程是生产api/server.ts；当前一个Codex resume位于归档目录，未证明它在执行本次三张票，未读取其会话、未终止它。028/053/056及preview各工作区的/proc cwd匹配检查为空；这不是从进程名猜任务归属，也不能证明远端worker不存在。

所有21个Worktree保留；main原8个暂存文件不纳入本次文档恢复提交，原2份文档改动保留在工作树。preview的5个文件记录前后SHA256。私有原始补丁及基线位于 `.runtime/20260925T034733Z-server-recovery-2cae71/`；公开脱敏取证目录 `evidence/20260925T034733Z-server-recovery-2cae71/` 含采集命令、退出码与SHA256 manifest。回滚只针对本轮提交/增量，不得git reset --hard或覆盖用户原补丁。

## 下次重任务开始前的措施（待实施，不宣称已经配置）

先限制测试/构建的并发，一次只运行一个重任务，重试前确认上一进程及浏览器已退出；把生产、MCP控制进程和验收子任务的资源预算分开，给OS/SSH留余量。今日读取的alva/MCP CPUQuota、MemoryHigh、MemoryMax均无上限；应在独立维护范围中配置可回滚的任务级cgroup CPU/内存上限，而非直接压低共享MCP或SSH上限。补每进程RSS/CPU与PSI的持久采样，关联ticket/run/PID，才能在下次事故中确定具体程序；是否增设Swap和硬件容量要结合实测工作集，不把Swap当并行无限开的许可。本轮未更改上述运行配置、未购买或升级机器。

本次验证只覆盖状态/文档/看板与低负载离线证据，不执行全量构建、真实模型调用、Chromium回归、生产登录/数据写入或部署。具体退出码与保护校验见取证目录 `evidence/20260925T034733Z-server-recovery-2cae71/validation.json`。资源预防配置仍pending；生成记忆与云端审计out-of-scope。

## 机制参考（非本机证据）

- Linux Kernel：PSI / resource contention，https://docs.kernel.org/accounting/psi.html
- OpenSSH：sshd_config / MaxStartups，https://man.openbsd.org/sshd_config
- systemd资源限制入口（AWS示例），https://docs.aws.amazon.com/zh_tw/linux/al2023/ug/resource-limiting-systemd.html


## 本轮验证结果

2026-09-25：看板定向回归3/3、MiMo离线探针5/5均通过，exit0、0失败、0跳过；未调用模型。公网和本地看板一致为44票、150条验收、12已完成、7待办、25等待依赖、0进行中；两端healthz均alva/ok。原8个暂存文件、2份文档原正文、21个Worktree及preview5个文件保护检查通过；4个现役服务MainPID未变、NRestarts=0。新增文档链接7项通过。详细结构化结果及限制见 `evidence/20260925T034733Z-server-recovery-2cae71/validation.json`。
