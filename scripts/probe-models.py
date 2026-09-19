"""Real provider probes; consumes environment credentials, never logs keys."""
import os,json,urllib.request,urllib.error,base64,pathlib,datetime,uuid,subprocess
root=pathlib.Path(__file__).resolve().parents[1]
run=root/'evidence'/(datetime.datetime.now(datetime.timezone.utc).strftime('%Y%m%dT%H%M%SZ')+'-'+uuid.uuid4().hex[:8]);run.mkdir()
base=os.environ['OPENAI_BASE_URL'].rstrip('/')
key=os.environ['OPENAI_API_KEY']
def req(path,body=None):
 r=urllib.request.Request(base+path,data=None if body is None else json.dumps(body).encode(),headers={'Authorization':'Bearer '+key,'Content-Type':'application/json'})
 try:
  with urllib.request.urlopen(r,timeout=50) as f:return json.load(f)
 except urllib.error.HTTPError as e:return {'error_status':e.code}
 except Exception as e:return {'error_type':type(e).__name__}
def probe(name,model,content):
 result=req('/chat/completions',{'model':model,'messages':[{'role':'user','content':content}],'max_tokens':1024})
 text=result.get('choices',[{}])[0].get('message',{}).get('content')
 evidence={'probe':name,'model':model,'response':text,'error_status':result.get('error_status'),'error_type':result.get('error_type')}
 (run/(name+'.json')).write_text(json.dumps(evidence,ensure_ascii=False,indent=2)+'\n')
 print(json.dumps(evidence,ensure_ascii=False),flush=True)
 return evidence
models=req('/models');(run/'models.json').write_text(json.dumps(models,ensure_ascii=False,indent=2)+'\n')
probe('text','gpt-5.5','Reply with exactly ALVA_OK.')
image=base64.b64encode((root/'references/room-study-handoff/public/floorplan.png').read_bytes()).decode()
probe('vision','gpt-5.5',[{'type':'text','text':'Describe the attached floorplan in Chinese. Identify visible rooms and openings. Do not invent measured dimensions. This is an image reading probe, not construction advice.'},{'type':'image_url','image_url':{'url':'data:image/png;base64,'+image}}])
audio=base64.b64encode((root/'.runtime/fixtures/public-speech.wav').read_bytes()).decode()
probe('audio','gemini-3-flash',[{'type':'text','text':'Transcribe this audio verbatim in its original language. Return only the transcript.'},{'type':'input_audio','input_audio':{'data':audio,'format':'wav'}}])
(run/'provenance.txt').write_text('Image: supplied room-study-handoff/public/floorplan.png. Audio: Google public speech fixture; not a physical microphone test. CLI adapter not covered by these API probes.\n')
print('Evidence: '+str(run),flush=True)
