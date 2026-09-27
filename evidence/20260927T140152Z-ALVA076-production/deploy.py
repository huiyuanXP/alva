from pathlib import Path
import subprocess,fcntl,datetime,json,shutil,os,time,urllib.request,tarfile,hashlib
root=Path('/home/ubuntu/Alva');os.chdir(root)
source=Path('/home/ubuntu/Alva-worktrees/ALVA-076-codex-stage-unblock')
run=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-ALVA076-production'
b=root/'.runtime'/run;e=root/'evidence'/run;b.mkdir(mode=0o700);e.mkdir()
def cmd(*a):return subprocess.run(a,check=True,stdout=subprocess.DEVNULL)
def health():
 for _ in range(30):
  try:
   with urllib.request.urlopen('http://127.0.0.1:4173/healthz',timeout=2) as r:
    if r.status==200:return True
  except Exception:pass
  time.sleep(1)
 return False
with (root/'.git/alva-production.lock').open('a') as lock,(root/'.git/alva-coordination.lock').open('a') as coordination:
 fcntl.flock(lock,fcntl.LOCK_EX|fcntl.LOCK_NB);fcntl.flock(coordination,fcntl.LOCK_EX|fcntl.LOCK_NB)
 assert not subprocess.check_output(['git','status','--porcelain','--untracked-files=no'],text=True).strip()
 sha=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip();assert subprocess.check_output(['git','log','-1','--format=%s'],text=True).strip().startswith('fix(ALVA-076)')
 manifest=json.loads((source/'evidence/20260927T135515Z-ALVA066-alva076-final-v2-390661/source-manifest.json').read_text())
 checked=0
 for name,digest in manifest.items():
  if name.startswith(('api/','web/src/','packages/')) or name in ['package.json','package-lock.json','tsconfig.json']:
   assert hashlib.sha256((root/name).read_bytes()).hexdigest()==digest,name
   assert (root/name).read_bytes()==(source/name).read_bytes(),name
   checked+=1
 release=b/'release';release.mkdir();cmd('git','archive','--format=tar','-o',str(b/'source.tar'),sha)
 with tarfile.open(b/'source.tar') as t:t.extractall(release,filter='data')
 for name in ['.scratch','NextTask.md','SPEC.md']:
  target=release/name
  if target.is_dir():shutil.rmtree(target)
  else:target.unlink()
  target.symlink_to(root/name,target_is_directory=(root/name).is_dir())
 (release/'node_modules').symlink_to(root/'node_modules',target_is_directory=True)
 (release/'.runtime').symlink_to(root/'.runtime',target_is_directory=True)
 shutil.copytree(source/'web/dist',release/'web/dist',dirs_exist_ok=True)
 shutil.copy2(root/'.runtime/alva-prod.env',b/'alva-prod.env')
 cmd('sudo','-n','cp','-a','/etc/systemd/system/alva.service.d',str(b/'previous-service-dropins'))
 drop=Path('/etc/systemd/system/alva.service.d/ALVA076-release.conf');assert not drop.exists()
 rollback=f'''#!/usr/bin/env bash
set -euo pipefail
sudo -n systemctl stop alva.service
sudo -n python3 -c "from pathlib import Path; Path('{drop}').unlink(missing_ok=True)"
sudo -n systemctl daemon-reload
sudo -n systemctl start alva.service
curl --max-time 30 --retry 10 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:4173/healthz
'''
 (b/'rollback.sh').write_text(rollback);(b/'rollback.sh').chmod(0o700);cmd('bash','-n',str(b/'rollback.sh'))
 (b/'release.conf').write_text(f'[Service]\nWorkingDirectory={release}\nExecStart=\nExecStart=/home/ubuntu/.nvm/versions/node/v24.21.0/bin/node {root}/node_modules/tsx/dist/cli.mjs {release}/api/server.ts\nEnvironment=PLAYWRIGHT_CHROMIUM_EXECUTABLE=/home/ubuntu/.cache/ms-playwright/chromium-1243/chrome-linux64/chrome\n')
 record={'run':run,'candidate':sha,'verifiedSourceFiles':checked,'backup':str(b),'status':'prepared','rollback':str(b/'rollback.sh'),'assets':{p.name:hashlib.sha256(p.read_bytes()).hexdigest() for p in (release/'web/dist/assets').iterdir() if p.is_file()}}
 stopped=False
 try:
  cmd('sudo','-n','systemctl','stop','alva.service');stopped=True
  cmd('tar','-czf',str(b/'data.tar.gz'),'-C',str(root/'.runtime'),'alva-data','alva-uploads');cmd('tar','-tzf',str(b/'data.tar.gz'))
  cmd('sudo','-n','install','-m','0644',str(b/'release.conf'),str(drop));cmd('sudo','-n','systemctl','daemon-reload');cmd('sudo','-n','systemctl','start','alva.service')
  if not health():raise RuntimeError('New backend did not become healthy')
  actual=subprocess.check_output(['systemctl','show','alva.service','--value','-p','WorkingDirectory'],text=True).strip();assert actual==str(release),actual
  record.update(status='deployed',localHealth=200,publishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourcePinned=True)
 except Exception as ex:
  record.update(status='failed',error=str(ex))
  if stopped:cmd('bash',str(b/'rollback.sh'));record['autoRollback']=True
  raise
 finally:
  (e/'result.json').write_text(json.dumps(record,indent=2)+'\n');(root/'.runtime/alva076-deploy/latest').write_text(str(b)+'\n')
print(json.dumps(record))
