import pathlib,subprocess,json,datetime,uuid,os
root=pathlib.Path(__file__).resolve().parents[1]
run=root/'evidence'/(datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8]);run.mkdir()
env=dict(os.environ,RENOVATION_MEDIA_FIXTURES=str(root/'.runtime/fixtures'))
results=[]
for path in sorted((root/'tests').glob('*.test.ts')):
 cmd=[str(root/'node_modules/.bin/tsx'),'--test',str(path)]
 with (run/(path.stem+'.log')).open('w') as log:
  try: r=subprocess.run(cmd,cwd=root,env=env,stdout=log,stderr=subprocess.STDOUT,timeout=100);code=r.returncode
  except subprocess.TimeoutExpired:code=124
 results.append({'file':str(path.relative_to(root)),'command':cmd,'exit_code':code})
 (run/'results.json').write_text(json.dumps(results,indent=2)+'\n')
 print(path.name,code,flush=True)
print('Evidence:',run,flush=True)
raise SystemExit(0 if all(x['exit_code']==0 for x in results) else 1)
