from pathlib import Path
p=Path('apps/web/src/RequirementsPanel.tsx');s=p.read_text();s=s.replace("current?current.source==='accepted'?'已采用':", "current?current.confirmation_state==='pending'?'原话提取 · 待核对':current.source==='accepted'?'已采用':");p.write_text(s)
p=Path('apps/web/src/BriefPanel.tsx');s=p.read_text();s=s.replace("r.confirmation_state==='confirmed'?'已采用':'业主填写'", "r.confirmation_state==='pending'?'原话提取 · 待核对':r.confirmation_state==='confirmed'?'已采用':'业主填写'");s=s.replace("${show(r)}（来源", "${show(r)}（${r.confirmation_state==='pending'?'待核对提取；':''}来源");s=s.replace("${show(r)}；${r.professional_status", "${show(r)}；${r.confirmation_state==='pending'?'待核对提取；':''}${r.professional_status");p.write_text(s)
p=Path('apps/api/review.ts');s=p.read_text().replace("r.field_key===key&&r.answer_state==='answered'", "r.field_key===key&&r.answer_state==='answered'&&r.confirmation_state!=='pending'");p.write_text(s)
p=Path('apps/api/chat.ts');s=p.read_text().replace('最多三轮工具循环','最多四轮工具循环');p.write_text(s)
p=Path('scripts/week1-walkthrough.ts');s=p.read_text().replace('receipt.proposals=p.suggestions.length;', 'receipt.proposals=p.suggestions.length;receipt.proposal_fields=p.suggestions.map(s=>s.field_key);');p.write_text(s)
print('Pending extraction stays distinct from owner confirmation in the form and exported brief.')
