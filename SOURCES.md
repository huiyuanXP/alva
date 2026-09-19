# 来源与变更

旧库只读 HEAD：2825f36d7777d2219c6b007ea43735d90ec042ad，读取时工作树干净。复制 664 个 Git 跟踪源码、资产和合成测试文件，未复制旧凭据、客户数据、runtime、旧部署配置与旧 .scratch 票。

源文件清单与 SHA-256：evidence/20260919T102353Z-a74a0cf5/source-manifest.json。可复现源码快照 baseline-source.tar SHA-256：f152b82a1231071961a69be359672db2394c8a70040091965295ddc4d4e71fe2。该快照只作基线，非完整迁移验收。

| 任务书名称 | 本轮实际来源 |
|---|---|
| 项目定位、提议审批、00/01/02 HTML | references/ 同名文件 |
| design.md | references/room-study-handoff/references/assistant-ui-design.md |
| Roomscape HTML | 用户提供 ZIP 的 room-study-standalone.html，属于不同版本原型 |
| engine/model/main.js | ZIP 的 src/math.js、model.js、renderer.js、app.js，按实际结构复核 |
| 原户型图 | ZIP 的 public/floorplan.png |

本轮浏览器计数：50 objects、6 rooms、40 colliders；不得使用初始任务书的 25/61/95136 作为本包实测。原型为硬编码 WebGL2 视觉参考，不承担动态识图、编辑和后端。

Codex 接口依据：本机 codex-cli 0.155.1 `exec --help` 与 https://learn.chatgpt.com/docs/non-interactive-mode 、https://learn.chatgpt.com/docs/config-file/config-reference 。实际 Responses 文字探针见 evidence/20260919T102845Z-c28b0add。
