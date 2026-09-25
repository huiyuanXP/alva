---
name: alva-floorplan-self-review
description: Review an Alva floor-plan candidate by comparing its rendered 2D plan with the source image in the same model conversation after generation. Use only when a prompt explicitly invokes this project workflow.
---

# Alva 户型平面自查

在已生成候选的同一个模型 thread 中，接收原始户型图与该候选的**平面区域截图**，逐项对照外墙轮廓、内墙分隔、房间数量与用途、门窗位置和开口方向。只依据两张图指出可见差异；看不清的地方标为待人工核对，不猜测真实尺寸。

输出简洁 JSON：`overall`（`match` / `mismatch` / `uncertain`）、`findings`（每项含 `area`、`observed`、`expected`、`confidence`）、`needsHumanReview`。自查是诊断，不自动改写候选、确认拓扑或宣称设计准确。结构/几何检查结果只能作为旁证。

调用方须保留生成和自查在同一 thread 的记录，并保存原图哈希、候选哈希、平面截图、自查原文与摘要。若生成会话已结束，重新生成并在新 thread 内完成自查；不能把新会话说成旧会话的续接。流程停在自查报告，是否按建议修图由用户决定。
