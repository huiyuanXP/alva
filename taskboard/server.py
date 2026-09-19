#!/usr/bin/env python3
import json,re,hashlib
from pathlib import Path
from datetime import datetime,timezone
from http.server import ThreadingHTTPServer,BaseHTTPRequestHandler
ROOT=Path(__file__).resolve().parents[1]
PLAN=ROOT/'.scratch/openplan3d-consultation'
def payload():
    tickets=[]
    for p in sorted((PLAN/'issues').glob('[0-9][0-9].md')):
        raw=p.read_text()
        def field(name):
            m=re.search(r'\*\*'+re.escape(name)+r':\*\*\s*([^\n]+)',raw)
            return m.group(1) if m else ''
        deps=re.findall(r'(?:^|;\s*)(\d{2})\s*[—-]',field('Blocked by'))
        checks=re.findall(r'^- \[([ xX])\]',raw,re.M)
        tickets.append(dict(id=p.stem,title=raw.splitlines()[0].lstrip('# ').split(' — ',1)[-1],raw=raw,
           status=field('Status'),phase=field('Phase'),owner=field('建议负责人'),estimate=field('粗估'),
           summary=field('What to build'),deps=deps,checks=len(checks),checked=sum(x.lower()=='x' for x in checks)))
    done={t['id'] for t in tickets if t['status']=='done'}
    for t in tickets:
        t['waiting']=[d for d in t['deps'] if d not in done]
        t['column']='done' if t['status']=='done' else 'progress' if t['status']=='in-progress' else 'blocked' if t['waiting'] or t['status']=='blocked' else 'ready'
    data=dict(spec=(PLAN/'spec.md').read_text(),plan=(PLAN/'PLAN.md').read_text(),tickets=tickets,
              updated=datetime.now(timezone.utc).isoformat())
    data['revision']=hashlib.sha256(json.dumps({k:v for k,v in data.items() if k!='updated'},ensure_ascii=False).encode()).hexdigest()[:12]
    return data
class Handler(BaseHTTPRequestHandler):
    def do_GET(self):
        path=self.path.split('?')[0]
        if path in ('/','/todo','/todo/'):
            body=(ROOT/'taskboard/index.html').read_bytes();kind='text/html; charset=utf-8'
        elif path=='/todo/api/board':
            body=json.dumps(payload(),ensure_ascii=False).encode();kind='application/json; charset=utf-8'
        elif path=='/healthz':
            body=b'{"ok":true,"service":"renovation-taskboard"}';kind='application/json'
        else:
            self.send_error(404);return
        self.send_response(200)
        self.send_header('Content-Type',kind)
        self.send_header('Cache-Control','no-store')
        self.send_header('X-Content-Type-Options','nosniff')
        self.send_header('Referrer-Policy','same-origin')
        self.send_header('Content-Security-Policy',"default-src 'self'; script-src 'self' 'unsafe-inline'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; frame-ancestors 'none'")
        self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
if __name__=='__main__':
    ThreadingHTTPServer(('127.0.0.1',4173),Handler).serve_forever()
