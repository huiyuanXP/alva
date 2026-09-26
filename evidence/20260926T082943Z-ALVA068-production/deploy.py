from pathlib import Path
import subprocess,fcntl,datetime,json,shutil,os,time,urllib.request,tarfile
root=Path('/home/ubuntu/Alva');os.chdir(root)
source=Path('/home/ubuntu/Alva-worktrees/ALVA-068-codex-outcome-questions')
run=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-ALVA068-production'
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
 sha=subprocess.check_output(['git','rev-parse','HEAD'],text=True).strip()
 assert sha.startswith('6eef743')
 assert not subprocess.check_output(['git','diff','HEAD','task/ALVA-068-codex-outcome-questions','--','api','web/src','packages','package.json','package-lock.json'],text=True).strip()
 # Freeze the published source so later main edits cannot alter a running release.
 release=b/'release';release.mkdir();cmd('git','archive','--format=tar','-o',str(b/'source.tar'),sha)
 with tarfile.open(b/'source.tar') as t:t.extractall(release,filter='data')
 # The read-only task board continues reading canonical live coordination files.
 for name in ['.scratch','NextTask.md','SPEC.md']:
  target=release/name
  if target.is_dir():shutil.rmtree(target)
  else:target.unlink()
  target.symlink_to(root/name,target_is_directory=(root/name).is_dir())
 (release/'node_modules').symlink_to(root/'node_modules',target_is_directory=True)
 (release/'.runtime').symlink_to(root/'.runtime',target_is_directory=True)
 shutil.copytree(root/'web/dist',b/'previous-dist');shutil.copytree(root/'web/dist',release/'web/dist',dirs_exist_ok=True)
 shutil.copytree(source/'web/dist/assets',release/'web/dist/assets',dirs_exist_ok=True);shutil.copy2(source/'web/dist/index.html',release/'web/dist/index.html')
 shutil.copy2(root/'.runtime/alva-prod.env',b/'alva-prod.env')
 drop=Path('/etc/systemd/system/alva.service.d/ALVA068-release.conf');assert not drop.exists()
 script=f'''#!/usr/bin/env bash
set -euo pipefail
sudo -n systemctl stop alva.service
sudo -n rm -f {drop}
cp -a {b}/previous-dist/. {root}/web/dist/
sudo -n systemctl daemon-reload
sudo -n systemctl start alva.service
curl --max-time 30 --retry 10 --retry-connrefused --retry-delay 1 -fsS http://127.0.0.1:4173/healthz
'''
 (b/'rollback.sh').write_text(script);(b/'rollback.sh').chmod(0o700);cmd('bash','-n',str(b/'rollback.sh'))
 unit=f'[Service]\nWorkingDirectory={release}\nExecStart=\nExecStart=/home/ubuntu/.nvm/versions/node/v24.21.0/bin/node {root}/node_modules/tsx/dist/cli.mjs {release}/api/server.ts\n'
 (b/'release.conf').write_text(unit)
 record={'run':run,'candidate':sha,'backup':str(b),'status':'prepared','previousBackend':'main source at 08:16 start; matching current product source','rollback':str(b/'rollback.sh')}
 stopped=False
 try:
  cmd('sudo','-n','systemctl','stop','alva.service');stopped=True
  cmd('tar','-czf',str(b/'data.tar.gz'),'-C',str(root/'.runtime'),'alva-data');cmd('tar','-tzf',str(b/'data.tar.gz'))
  cmd('sudo','-n','mkdir','-p',str(drop.parent));cmd('sudo','-n','install','-m','0644',str(b/'release.conf'),str(drop))
  cmd('sudo','-n','systemctl','daemon-reload');cmd('sudo','-n','systemctl','start','alva.service')
  if not health():raise RuntimeError('New backend did not become healthy')
  record.update(status='deployed',localHealth=200,publishedAt=datetime.datetime.now(datetime.timezone.utc).isoformat(),sourcePinned=True)
 except Exception as ex:
  record.update(status='failed',error=str(ex))
  if stopped:cmd('bash',str(b/'rollback.sh'));record['autoRollback']=True
  raise
 finally:
  (e/'result.json').write_text(json.dumps(record,indent=2)+'\n');(root/'.runtime/alva068-release/latest').write_text(str(b)+'\n')
print(json.dumps(record))
