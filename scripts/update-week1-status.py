"""Publish only verified acceptance receipts to the existing read-only task board."""
from pathlib import Path
import re
root=Path('.')
receipts={
'01':('OpenPlan3D pin + native iframe bridge + React workbench + PostgreSQL scene/auth implementation.', ['锁定上游commit、许可证与样例素材来源','基础项目访问控制拒绝未授权读取']),
'02':('Room/project forms, collapsible panel, cm geometry versus target meters, nullable budget/currency/scope. API persistence and isolation pass; browser behavior pending.', []),
'03':('Real Pi streaming/provider/tool probe passed. Chat evidence, cancellation/error retention, room-bound tools and SSE replay implemented; browser keyboard/draft/reconnect acceptance pending.', ['真实provider完成流式文本与一次工具调用探针','响应与当前项目/房间绑定']),
'04':('Five sourced, explicitly unvalidated question groups; original-quote extraction pending confirmation; field/group adoption with idempotency and stale/manual edit protection. No fabricated designer validation.', ['题库包含五组基础字段与场景分支，记录资料/访谈验证状态','原话、建议、确认状态可追溯','expected_version冲突及重复request_id不会覆盖手填值或重复采纳']),
'05':('Five-part brief UI/export; actual independent Pi review of frozen original evidence; retained versioned reports; unknown-budget/scope/survey rules; synthetic walkthrough passed. Designer interview outline is a plan, not a conducted interview.', ['审查输入包含原始证据和固定版本而非仅主Agent总结','预算口径未知、尺寸待测量能被准确列出'])
}
for n,(summary,verified) in receipts.items():
 p=root/'.scratch/openplan3d-consultation/issues'/f'{n}.md'
 if '### Week 1 implementation receipt — 2026-09-11' in p.read_text():
  continue
 s=p.read_text();s=re.sub(r'\*\*Status:\*\*[^\n]*','**Status:** blocked',s,count=1)
 for text in verified:
  old='- [ ] '+text
  if old not in s: raise RuntimeError(f'Acceptance wording changed: {n}: {text}')
  s=s.replace(old,'- [x] '+text,1)
 s+='\n### Week 1 implementation receipt — 2026-09-11\n'
 s+='- Implementation: '+summary+'\n'
 s+='- Evidence: `docs/handoffs/WEEK-1.md`, `docs/ENGINE.md`, `docs/evidence/week1/unit-tests.log`, `provider-probe.json`, `walkthrough.json`, `http-smoke.json`. Test fixtures are synthetic; secrets and customer data are not published.\n'
 s+='- Gate: ticket 01 browser/WebGL and responsive acceptance remains blocked by the execution environment. Related UI criteria and dependent tickets are NOT accepted merely because code exists.\n'
 s+='- Deployment: existing 4173 taskboard and tunnel unchanged; safe PID verification and cutover remain open. Preview startup: `bash scripts/run-workbench.sh` (4174).\n'
 s+='- Rollback: no public service was replaced. Preserve original untracked files and owner `.data`; do not reset/clean.\n'
 p.write_text(s)
print('Updated tickets 01–05 with verified partial receipts; release gates remain blocked.')
