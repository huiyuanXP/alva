from pathlib import Path
import subprocess,fcntl,datetime,json,shutil,os,time,urllib.request,tarfile
root=Path('/home/ubuntu/Alva');os.chdir(root)
run=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-ALVA066-production'
b=root/'.runtime'/run;e=root/'evidence'/run
b.mkdir(mode=0o700);e.mkdir(); rollback=b/'rollback';rollback.mkdir()
source=Path('/home/ubuntu/Alva-worktrees/ALVA-066-codex-stage-mcp/web/dist')
def cmd(*a):return subprocess.run(a,check=True,stdout=subprocess.DEVNULL)
def health():
 for _ in range(30):
  try:
   with urllib.request.urlopen('http://127.0.0.1:4173/healthz',timeout=2) as r:
    if r.status==200:return True
  except Exception:pass
  time.sleep(1)
 return False
with (root/'.git/alva-production.lock').open('a') as production,(root/'.git/alva-coordination.lock').open('a') as coordination:
 fcntl.flock(production,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(coordination,fcntl.LOCK_EX|fcntl.LOCK_NB)
 assert not subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],text=True).strip()
 assert not subprocess.check_output(['git','diff','c53d3ac','HEAD','--','api','web/src','packages','package.json','package-lock.json'],text=True).strip()
 sha=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
 cmd('git','archive','--format=tar','-o',str(b/'old-source.tar'),'189fa20')
 with tarfile.open(b/'old-source.tar') as t:t.extractall(rollback,filter='data')
 (rollback/'node_modules').symlink_to(root/'node_modules',target_is_directory=True)
 (rollback/'.runtime').symlink_to(root/'.runtime',target_is_directory=True)
 shutil.copytree(root/'web/dist',rollback/'web/dist',dirs_exist_ok=True)
 shutil.copy2(root/'.runtime/alva-prod.env',b/'alva-prod.env')
 data=root/'.runtime/alva-data'; stopped=False
 script=f'''#!/usr/bin/env bash
set -euo pipefail
sudo -n systemctl stop alva.service
sudo -n mkdir -p /etc/systemd/system/alva.service.d
printf '[Service]\\nWorkingDirectory={rollback}\\nExecStart=\\nExecStart=/home/ubuntu/.nvm/versions/node/v24.21.0/bin/node /home/ubuntu/Alva/node_modules/tsx/dist/cli.mjs {rollback}/api/server.ts\\n' | sudo -n tee /etc/systemd/system/alva.service.d/ALVA066-rollback.conf >/dev/null
sudo -n systemctl daemon-reload
sudo -n systemctl start alva.service
curl --max-time 30 --retry 10 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:4173/healthz
'''
 (b/'rollback.sh').write_text(script);(b/'rollback.sh').chmod(0o700)
 record={'run':run,'candidate':sha,'runtimeSource':'c53d3ac','previousRelease':'189fa20','backup':str(b),'status':'prepared','autoRollback':False}
 try:
  cmd('sudo','-n','systemctl','stop','alva.service');stopped=True
  cmd('tar','-czf',str(b/'data.tar.gz'),'-C',str(data.parent),data.name)
  cmd('tar','-tzf',str(b/'data.tar.gz'))
  assert (b/'data.tar.gz').stat().st_size>0
  # Preserve old asset URLs for already-open browsers. Index changes only after backend health.
  shutil.copytree(source/'assets',root/'web/dist/assets',dirs_exist_ok=True)
  cmd('sudo','-n','systemctl','start','alva.service')
  if not health():raise RuntimeError('New backend did not become healthy')
  shutil.copy2(source/'index.html',root/'web/dist/index.alva066.tmp');os.replace(root/'web/dist/index.alva066.tmp',root/'web/dist/index.html')
  record.update(status='deployed',localHealth=200,publishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat())
 except Exception as ex:
  record.update(status='failed',error=str(ex))
  if stopped:
   cmd('sudo','-n','systemctl','stop','alva.service')
   if (b/'data.tar.gz').exists():
    data.rename(b/'failed-data');cmd('tar','-xzf',str(b/'data.tar.gz'),'-C',str(data.parent))
   cmd('bash',str(b/'rollback.sh'));record['autoRollback']=True
  raise
 finally:
  (e/'result.json').write_text(json.dumps(record,indent=2)+'\n');(root/'.runtime/alva066-release/latest').write_text(str(b)+'\n')
print(json.dumps(record))
