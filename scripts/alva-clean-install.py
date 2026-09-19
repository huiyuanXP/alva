"""Reproduce install/typecheck/build/start from a credential-free source bundle."""
from pathlib import Path
import subprocess,datetime,uuid,os,hashlib,json,tarfile,io,urllib.request,time,shutil
root=Path(__file__).resolve().parents[1];rid=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8];out=root/'evidence'/rid;out.mkdir();work=root/'.runtime/clean-install'/rid;work.mkdir(parents=True)
names=set(subprocess.check_output(['git','ls-files','-co','--exclude-standard','-z'],cwd=root).decode().split('\0'));manifest={}
for name in sorted(names):
 if not name or name.startswith(('evidence/','references/')):continue
 p=root/name
 if not p.is_file() or p.is_symlink():continue
 data=p.read_bytes();dest=work/name;dest.parent.mkdir(parents=True,exist_ok=True);dest.write_bytes(data);manifest[name]=hashlib.sha256(data).hexdigest()
archive=out/'alva-source.tar.gz'
with tarfile.open(archive,'w:gz') as tar:
 for name in sorted(manifest):
  data=(work/name).read_bytes();info=tarfile.TarInfo(name);info.size=len(data);info.mtime=0;info.mode=0o644;tar.addfile(info,io.BytesIO(data))
(out/'source-manifest.json').write_text(json.dumps(manifest,indent=2)+'\n')
results=[];server=None;ok=False
try:
 for name,cmd in [('install',['npm','ci','--ignore-scripts']),('typecheck',['npm','run','check']),('build',['npm','run','build:alva'])]:
  with (out/(name+'.log')).open('w') as log:r=subprocess.run(cmd,cwd=work,stdout=log,stderr=subprocess.STDOUT,timeout=180)
  results.append({'command':cmd,'exit_code':r.returncode});print(name,r.returncode,flush=True)
  if r.returncode:raise RuntimeError(name+' failed')
 env={k:v for k,v in os.environ.items() if not any(x in k for x in ['OPENAI','CLOUDFLARE','CODEX'])};env.update(ALVA_PORT='4182',ALVA_ORIGIN='http://127.0.0.1:4182',ALVA_DATA_DIR=str(work/'.runtime/test-data'))
 with (out/'start.log').open('w') as log:
  server=subprocess.Popen(['node',str(work/'node_modules/tsx/dist/cli.mjs'),'apps/alva/server.ts'],cwd=work,env=env,stdout=log,stderr=subprocess.STDOUT)
  for _ in range(30):
   if server.poll() is not None:raise RuntimeError('server exited')
   try:
    with urllib.request.urlopen('http://127.0.0.1:4182/healthz',timeout=2) as r:health=json.load(r)
    break
   except OSError:time.sleep(.5)
  else:raise RuntimeError('health timeout')
  assert health=={'ok':True,'application':'alva'}
  try:urllib.request.urlopen('http://127.0.0.1:4182/api/project',timeout=2);raise RuntimeError('anonymous project was allowed')
  except urllib.error.HTTPError as e:assert e.code==401
  results.append({'command':['clean-start-health-and-auth'],'exit_code':0});ok=True
except Exception as e:results.append({'failure':str(e),'exit_code':1})
finally:
 if server is not None:
  server.terminate()
  try:server.wait(timeout=20)
  except subprocess.TimeoutExpired:server.kill();server.wait();ok=False
 (out/'result.json').write_text(json.dumps({'ok':ok,'checks':results,'archive':str(archive),'sha256':hashlib.sha256(archive.read_bytes()).hexdigest(),'scope':'Clean install/typecheck/build and anonymous-auth startup smoke, not full eight-group acceptance. Reference attachments and customer/runtime data excluded.'},indent=2)+'\n')
 if ok:shutil.rmtree(work)
 print('Evidence:',out,flush=True)
raise SystemExit(0 if ok else 1)
