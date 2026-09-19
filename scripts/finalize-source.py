"""Apply reviewed source-only fixes after PostgreSQL JSON-order testing."""
from pathlib import Path
p=Path('apps/web/src/main.tsx')
s=p.read_text()
start=s.index('function LegacyWorkbench(')
end=s.index('function App()',start)
s=s[:start]+s[end:]
s=s.replace('useCallback','').replace('useEffect,  }','useEffect }')
s=s.replace("import { useBridge } from './bridge.js';\n",'')
p.write_text(s)
p=Path('apps/web/src/Workbench.tsx');s=p.read_text();s=s.replace("import { api } from './api.js';","import { api } from './api.js';\nimport { canonical } from '../../../packages/contracts/canonical.js';")
s=s.replace('JSON.stringify(initial.scene)','canonical(initial.scene)').replace('JSON.stringify(current.current.scene)','canonical(current.current.scene)').replace('JSON.stringify(project.scene)','canonical(project.scene)').replace('JSON.stringify(p.scene)','canonical(p.scene)');p.write_text(s)
p=Path('apps/api/store.ts');s=p.read_text();s=s.replace("import { sampleProject } from './sample.js';","import { sampleProject } from './sample.js';\nimport { canonical } from '../../packages/contracts/canonical.js';")
s=s.replace('JSON.stringify({kind,input})','canonical({kind,input})');p.write_text(s)
p=Path('tests/business.test.ts');s=p.read_text();s=s.replace('const original=JSON.stringify(f.p.scene);','const original=structuredClone(f.p.scene);').replace('assert.equal(JSON.stringify(f.p.scene),original)','assert.deepEqual(f.p.scene,original)')
s=s.replace('source=JSON.stringify(f.p.evidence)','source=structuredClone(f.p.evidence)').replace('assert.equal(JSON.stringify(report.evidence_snapshot),source)','assert.deepEqual(report.evidence_snapshot,source)').replace('assert.equal(JSON.stringify(f.p.reports[0].evidence_snapshot),source)','assert.deepEqual(f.p.reports[0].evidence_snapshot,source)');p.write_text(s)
print('Removed unused scaffold and fixed order-independent JSON comparisons; no data files touched.')
