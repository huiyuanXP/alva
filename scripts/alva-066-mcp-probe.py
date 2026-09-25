"""Isolated real Codex HTTP MCP/stage/resume probe; no production data."""
import datetime, http.server, json, os, queue, secrets, subprocess, threading, time, urllib.request
from pathlib import Path

ROOT=Path(__file__).resolve().parents[1]
RUN=datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-ALVA066-mcp-'+secrets.token_hex(3)
PRIVATE=ROOT/'.runtime'/RUN
EVIDENCE=ROOT/'evidence'/RUN
PRIVATE.mkdir(parents=True,mode=0o700); EVIDENCE.mkdir(parents=True)
TOKEN=secrets.token_urlsafe(24)
BRIDGE=os.environ.get('ALVA_PROBE_BRIDGE')=='1'
CALLS=[]
NAMES={'floorplan':'inspect_floorplan_probe','living':'inspect_living_probe'}
NONCES={s:secrets.token_hex(12) for s in NAMES}
class Handler(http.server.BaseHTTPRequestHandler):
 def log_message(self,*args):pass
 def do_GET(self):self.send_error(405)
 def do_DELETE(self):self.send_response(204);self.end_headers()
 def do_POST(self):
  if self.headers.get('Authorization')!='Bearer '+TOKEN:self.send_error(401);return
  stage=self.path.strip('/')
  if stage not in NAMES:self.send_error(404);return
  req=json.loads(self.rfile.read(int(self.headers.get('Content-Length',0))))
  method=req.get('method');ident=req.get('id')
  if ident is None:self.send_response(202);self.end_headers();return
  error=None
  if method=='initialize':result={'protocolVersion':req['params']['protocolVersion'],'capabilities':{'tools':{}},'serverInfo':{'name':'alva-'+stage+'-probe','version':'1.0'}}
  elif method=='ping':result={}
  elif method=='tools/list':result={'tools':[{'name':NAMES[stage],'description':'Return the actual isolated project stage and verification nonce. Call this to obtain the nonce; never guess.','inputSchema':{'type':'object','properties':{},'additionalProperties':False}}]}
  elif method=='tools/call':
   name=req['params']['name'];CALLS.append({'stage':stage,'name':name,'allowed':name==NAMES[stage]})
   if name!=NAMES[stage]:result={'isError':True,'content':[{'type':'text','text':json.dumps({'code':'WRONG_STAGE','message':'Tool not available in this stage','retryable':False,'repairActions':['Switch to the corresponding stage']})}]}
   else:result={'content':[{'type':'text','text':json.dumps({'stage':stage,'nonce':NONCES[stage]})}]}
  else:result=None;error={'code':-32601,'message':'Unknown method'}
  body=json.dumps({'jsonrpc':'2.0','id':ident,**({'error':error} if error else {'result':result})}).encode()
  self.send_response(200);self.send_header('Content-Type','application/json');self.send_header('Content-Length',str(len(body)));self.end_headers();self.wfile.write(body)
server=http.server.ThreadingHTTPServer(('127.0.0.1',0),Handler)
threading.Thread(target=server.serve_forever,daemon=True).start()

def turn(stage,resume=None):
 work=PRIVATE/stage;home=work/'config';home.mkdir(parents=True,exist_ok=True)
 config={'model_provider':'alva','model_providers.alva.name':'Alva','model_providers.alva.base_url':os.environ.get('OPENAI_BASE_URL','https://chat.huiyuanxp.com/v1'),'model_providers.alva.env_key':'OPENAI_API_KEY','model_providers.alva.wire_api':'responses','project_doc_max_bytes':0,'features.shell_tool':False,'features.apply_patch_freeform':False,'features.multi_agent':False,'web_search':'disabled','mcp_servers.alva.url':f'http://127.0.0.1:{server.server_port}/{stage}','mcp_servers.alva.bearer_token_env_var':'ALVA_MCP_TOKEN','mcp_servers.alva.required':True,'mcp_servers.alva.enabled_tools':[NAMES[stage]]}
 if BRIDGE:config={k:v for k,v in config.items() if not k.startswith('mcp_servers.')}
 args=['codex','app-server','--listen','stdio://']
 for k,v in config.items():args+=['-c',k+'='+json.dumps(v)]
 env={k:v for k,v in os.environ.items() if k in ['PATH','HOME','LANG']}
 env.update(CODEX_HOME=str(home),OPENAI_API_KEY=os.environ.get('OPENAI_API_KEY') or os.environ['NEWAPI_KEY'],ALVA_MCP_TOKEN=TOKEN)
 child=subprocess.Popen(args,cwd=work,env=env,stdin=subprocess.PIPE,stdout=subprocess.PIPE,stderr=subprocess.DEVNULL,text=True)
 events=queue.Queue();threading.Thread(target=lambda:[events.put(json.loads(l)) for l in child.stdout],daemon=True).start()
 deadline=time.monotonic()+120;seq=0;methods=[];status={};final=''
 def send(packet):child.stdin.write(json.dumps(packet)+'\n');child.stdin.flush()
 def mcp(method,params):
  request=urllib.request.Request(f'http://127.0.0.1:{server.server_port}/{stage}',data=json.dumps({'jsonrpc':'2.0','id':1,'method':method,'params':params}).encode(),headers={'Content-Type':'application/json','Authorization':'Bearer '+TOKEN})
  with urllib.request.urlopen(request,timeout=10) as response:return json.load(response)['result']
 def receive():
  event=events.get(timeout=max(.1,deadline-time.monotonic()))
  if 'method' in event:methods.append(event['method'])
  if 'method' in event and 'id' in event:
   if BRIDGE and event['method']=='item/tool/call':
    p=event['params'];result=mcp('tools/call',{'name':p['tool'],'arguments':p['arguments']})
    send({'id':event['id'],'result':{'success':not result.get('isError',False),'contentItems':[{'type':'inputText','text':i['text']} for i in result['content']]}})
   else:send({'id':event['id'],'error':{'code':-32601,'message':'Unexpected server request'}})
  return event
 def rpc(method,params):
  nonlocal seq
  seq+=1;ident=seq;send({'id':ident,'method':method,'params':params})
  while True:
   e=receive()
   if e.get('id')==ident and 'method' not in e:
    if 'error' in e:raise RuntimeError(json.dumps(e['error']))
    return e.get('result')
 try:
  rpc('initialize',{'clientInfo':{'name':'alva-mcp-probe','version':'1'},'capabilities':{'experimentalApi':True}});send({'method':'initialized','params':{}})
  params={'model':'gemini-3.1-flash-lite','modelProvider':'alva','cwd':str(work),'approvalPolicy':'never','sandbox':'read-only','baseInstructions':'Use the supplied MCP tool to get the nonce. Do not guess it. Never execute shell commands.'}
  if resume:params['threadId']=resume
  else:
   params['ephemeral']=False
   if BRIDGE:params['dynamicTools']=[{'type':'function',**tool} for tool in mcp('tools/list',{})['tools']]
  started=rpc('thread/resume' if resume else 'thread/start',params);tid=started['thread']['id']
  status=rpc('mcpServerStatus/list',{'threadId':tid})
  rpc('turn/start',{'threadId':tid,'input':[{'type':'text','text':f'Call {NAMES[stage]} once now and return its nonce verbatim.'}]})
  while True:
   e=receive();p=e.get('params',{})
   if e.get('method')=='item/completed' and p.get('item',{}).get('type')=='agentMessage':final=p['item']['text']
   if e.get('method')=='turn/completed':
    if p['turn']['status']!='completed':raise RuntimeError(json.dumps(p['turn'].get('error')))
    break
  # Store names only; never headers/config/provider diagnostics.
  names=[]
  for item in status.get('data',[]):names.extend(item.get('tools',{}).keys())
  if BRIDGE:names=[tool['name'] for tool in mcp('tools/list',{})['tools']]
  return {'stage':stage,'resumed':bool(resume),'threadId':tid,'sameThread':not resume or tid==resume,'toolNames':names,'nonceReturned':NONCES[stage] in final,'reply':final,'methods':sorted(set(methods))}
 finally:
  child.terminate()
  try:child.wait(timeout=5)
  except subprocess.TimeoutExpired:child.kill();child.wait()

report={'run':RUN,'transport':'dynamicTools-to-HTTP-MCP' if BRIDGE else 'native-HTTP-MCP','version':subprocess.check_output(['codex','--version'],text=True).strip(),'model':'gemini-3.1-flash-lite','results':[],'pass':False}
try:
 for stage in ['floorplan','living']:report['results'].append(turn(stage))
 report['results'].append(turn('floorplan',report['results'][0]['threadId']))
 report['calls']=CALLS
 report['pass']=all(r['nonceReturned'] and r['sameThread'] and len(r['toolNames'])==1 and NAMES[r['stage']] in r['toolNames'][0] for r in report['results']) and len(CALLS)>=3 and all(c['allowed'] for c in CALLS)
except Exception as e:
 message=str(e)
 for secret in [TOKEN,os.environ.get('NEWAPI_KEY',''),os.environ.get('OPENAI_API_KEY','')]:
  if secret:message=message.replace(secret,'[REDACTED]')
 report['error']=type(e).__name__+': '+message[:1500];report['calls']=CALLS
finally:
 server.shutdown();server.server_close()
 (EVIDENCE/'result.json').write_text(json.dumps(report,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(report,ensure_ascii=False,indent=2))
raise SystemExit(0 if report['pass'] else 1)
