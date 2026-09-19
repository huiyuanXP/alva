import os,pathlib,subprocess,datetime,uuid,json
root=pathlib.Path(__file__).resolve().parents[1]
run=root/'evidence'/(datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8]);run.mkdir()
work=root/'.runtime'/'codex-probe';work.mkdir(parents=True,exist_ok=True)
args=['codex','exec','--ignore-user-config','--ignore-rules','--ephemeral','--skip-git-repo-check','--json','--sandbox','read-only','-C',str(work),'-m','gpt-5.5','-c','model_provider="alva"','-c','model_providers.alva.name="Alva"','-c','model_providers.alva.base_url="https://chat.huiyuanxp.com/v1"','-c','model_providers.alva.env_key="OPENAI_API_KEY"','-c','model_providers.alva.wire_api="responses"','-c','project_doc_max_bytes=0','-c','features.shell_tool=false','-c','web_search="disabled"','Reply with exactly ALVA_CODEX_OK. Do not call tools.']
try:
 p=subprocess.run(args,capture_output=True,text=True,timeout=90)
 # The request contains only the probe prompt. Still remove the credential if an upstream error echoes it.
 key=os.environ['OPENAI_API_KEY']
 (run/'codex.jsonl').write_text(p.stdout.replace(key,'[REDACTED]'))
 (run/'codex-stderr.log').write_text(p.stderr.replace(key,'[REDACTED]'))
 result={'exit_code':p.returncode,'expected_response_present':'ALVA_CODEX_OK' in p.stdout,'command':args,'scope':'CLI text only; business-tool adapter not implemented'}
except subprocess.TimeoutExpired:
 result={'exit_code':124,'scope':'CLI text timed out; not accepted'}
(run/'codex-result.json').write_text(json.dumps(result,indent=2)+'\n')
print(json.dumps({'run':str(run),**result}));raise SystemExit(result['exit_code'])
