import {execFileSync} from 'node:child_process';

export interface MiMoProfileMetadata {
 profile:string;home:string;model:string;provider:string;endpoint:string;
 envKey:string;credentialPresent:boolean;requiresOpenAIAuth:boolean;
 catalogModels:{id:string;inputModalities:string[]}[];
 fingerprints:Record<string,string>;hookEvents:string[];mcpServers:string[];
}

/** Reads configuration/catalog metadata only; never login files or key values. */
export function readMiMoProfile(profile='mimo'):MiMoProfileMetadata {
 if(!/^[a-z0-9_-]+$/i.test(profile))throw new Error('Invalid Codex profile name');
 const code=String.raw`import os,sys,pathlib,tomllib,json,hashlib,urllib.parse
home=pathlib.Path(os.environ.get('CODEX_HOME',str(pathlib.Path.home()/'.codex')))
name=sys.argv[1];base=home/'config.toml';profile=home/(name+'.config.toml')
if not profile.is_file():raise SystemExit('PROFILE_UNAVAILABLE: selected CODEX_HOME has no '+name+'.config.toml; use the configured normal user session')
def load(p):return tomllib.loads(p.read_text()) if p.is_file() else {}
def merge(a,b):
 for k,v in b.items():
  if isinstance(v,dict) and isinstance(a.get(k),dict):merge(a[k],v)
  else:a[k]=v
 return a
d=merge(load(base),load(profile));provider=d.get('model_provider','');pd=d.get('model_providers',{}).get(provider,{})
cat=d.get('model_catalog_json')
if not cat:raise SystemExit('PROFILE_UNAVAILABLE: profile model catalog missing')
catalog=pathlib.Path(cat);catalog=catalog if catalog.is_absolute() else home/catalog
data=json.loads(catalog.read_text());rows=data if isinstance(data,list) else data.get('models',[])
url=urllib.parse.urlsplit(pd.get('base_url',''));endpoint=urllib.parse.urlunsplit((url.scheme,url.hostname or '',url.path,'',''))
envkey=pd.get('env_key','')
print(json.dumps({'profile':name,'home':str(home),'model':d.get('model',''),'provider':provider,'endpoint':endpoint,'envKey':envkey,'credentialPresent':bool(envkey and os.environ.get(envkey)),'requiresOpenAIAuth':bool(pd.get('requires_openai_auth',False)),'catalogModels':[{'id':m.get('slug',m.get('id','')),'inputModalities':m.get('input_modalities',[])} for m in rows],'fingerprints':{str(p):hashlib.sha256(p.read_bytes()).hexdigest() for p in [base,profile,catalog] if p.is_file()},'hookEvents':[k for k,v in d.get('hooks',{}).items() if isinstance(v,list)],'mcpServers':list(d.get('mcp_servers',{}))}))`;
 return JSON.parse(execFileSync('python3',['-c',code,profile],{encoding:'utf8',timeout:5000,stdio:['ignore','pipe','pipe']}));
}

export function selectMiMoModel(metadata:MiMoProfileMetadata,override?:string):string {
 const model=override||metadata.model;
 if(!/^mimo-[a-z0-9.-]+$/i.test(model))throw new Error('Profile must select a MiMo model');
 if(!metadata.catalogModels.length||metadata.catalogModels.some(m=>!/^mimo-/i.test(m.id)))throw new Error('MiMo-only model catalog required');
 const selected=metadata.catalogModels.find(m=>m.id===model);
 if(!selected)throw new Error('Requested model is outside the selected profile catalog');
 if(!selected.inputModalities.includes('image'))throw new Error('Selected model catalog does not advertise image input');
 if(metadata.requiresOpenAIAuth||!metadata.envKey||!metadata.credentialPresent)throw new Error('Missing environment variable for selected MiMo provider; use its normal authenticated user session');
 return model;
}

export function probeTimeoutMs(value?:string):number {
 const n=value===undefined?600_000:Number(value);
 if(!Number.isSafeInteger(n)||n<1000||n>600_000)throw new Error('Probe timeout must be an integer from 1000 to 600000ms');
 return n;
}

export function buildMiMoArgs(options:{metadata:MiMoProfileMetadata;modelOverride?:string;privateDir:string;imagePath:string;lastMessage:string;schemaPath:string;outputMode:'json-schema'|'schema-in-prompt'}):string[]{
 const {metadata:m,modelOverride,privateDir,imagePath,lastMessage,schemaPath,outputMode}=options;
 selectMiMoModel(m,modelOverride);
 const args=['exec','--profile',m.profile,'--strict-config','--ephemeral','--skip-git-repo-check','--json','--color','never','--sandbox','read-only','-C',privateDir,'--image',imagePath,'--output-last-message',lastMessage];
 if(modelOverride)args.push('--model',modelOverride);
 for(const value of ['project_doc_max_bytes=0','features.hooks=false','features.shell_tool=false','features.shell_snapshot=false','features.apply_patch_freeform=false','features.multi_agent=false','web_search="disabled"','mcp_servers={}','hooks={}'])args.push('-c',value);
 for(const name of m.mcpServers)args.push('-c',`mcp_servers.${JSON.stringify(name)}.enabled=false`);
 for(const event of m.hookEvents){if(event==='state')continue;if(!/^[A-Z][A-Za-z]+$/.test(event))throw new Error('Unrecognized hook event');args.push('-c',`hooks.${event}=[]`)}
 if(outputMode==='json-schema')args.push('--output-schema',schemaPath);
 args.push('-');return args;
}
