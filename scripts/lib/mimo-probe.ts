/** Failure classification uses protocol errors, never model self-identification. */
export function classifyMiMoFailure(errors:string[],exitCode:number|null,timedOut=false,spawnError=''){
 if(timedOut)return 'timeout';
 if(spawnError)return 'process-start';
 const text=errors.join('\n');
 if(/refresh token.*revoked|token could not be refreshed|not logged in|sign in again/i.test(text))return 'codex-authentication-unavailable';
 if(/missing environment variable|environment variable.*(?:not set|not found)|MIMO_API_KEY.*(?:missing|not set)/i.test(text))return 'missing-provider-environment-credential';
 if(/invalid api key|incorrect api key|unauthorized|\b401\b/i.test(text))return 'provider-authentication-rejected';
 if(/responses_feature_not_supported|text\.format type 'json_schema' is not supported/i.test(text))return 'output-format-unsupported';
 if(/ChatGPT account|not supported|model.*not found|unknown provider/i.test(text))return 'model-route-unavailable';
 return exitCode!==0?'provider-or-codex-error':null;
}

export function redactProbeError(message:string,secrets:readonly string[]=[]){
 for(const secret of secrets)if(secret)message=message.replaceAll(secret,'[REDACTED]');
 return message.replace(/Bearer\s+\S+/gi,'Bearer [REDACTED]')
  .replace(/\b(?:sk|tp)-[A-Za-z0-9_-]{12,}\b/g,'[REDACTED]')
  .replace(/https?:\/\/[^\s"<>]+/g,'[endpoint omitted]');
}

/** Transport, output-contract and topology outcomes must not mask each other. */
export function summarizeMiMoOutcome(transportCompleted:boolean,transportFailure:string|null,phases:Record<string,any>,unexpectedTools=false){
 const outputContractPassed=!!(transportCompleted&&phases.content?.ok!==false&&phases.productionParser?.ok&&phases.schema?.ok&&phases.geometry?.ok);
 const warnings=Object.values(phases.diagnostics?.counts||{}).reduce<number>((sum,n)=>sum+Number(n),0);
 const requiresReview=phases.content?.ok===false||!phases.confirmationTopology?.ok||!phases.diagnostics?.ok||phases.diagnostics?.status!=='complete'||warnings>0;
 let failureClass=transportFailure;
 if(!failureClass&&!transportCompleted)failureClass='protocol-incomplete';
 if(!failureClass&&unexpectedTools)failureClass='unexpected-tool-execution';
 if(!failureClass&&phases.content?.ok===false)failureClass='empty-candidate';
 if(!failureClass&&!phases.productionParser?.ok)failureClass=phases.productionParser?.stage==='schema'?'schema-contract':phases.productionParser?.stage==='geometry'?'geometry-validation':'json-parse';
 if(!failureClass&&!phases.schema?.ok)failureClass='schema-contract';
 if(!failureClass&&!phases.geometry?.ok)failureClass='geometry-validation';
 if(!failureClass&&!phases.confirmationTopology?.ok)failureClass='confirmation-topology';
 if(!failureClass&&!phases.diagnostics?.ok)failureClass='topology-diagnostics';
 if(!failureClass&&requiresReview)failureClass='topology-warning-review';
 return {outputContractPassed,requiresReview,failureClass,validCandidate:failureClass===null&&outputContractPassed&&!requiresReview&&!unexpectedTools,humanReviewRequired:true,automaticConfirmationAllowed:false};
}

/** Fail closed when the active import prompt cannot be identified uniquely. */
export function freezeImportPrompt(source:string):string {
 const matches=[...source.matchAll(/(?:\brunCodex|\bcodex)\(\{text:`([\s\S]*?)`,images:/g)];
 if(matches.length!==1)throw new Error('Current import prompt cannot be frozen unambiguously');
 return matches[0][1];
}

/** A correction must reference one first attempt of this same image and schema. */
export function verifyMiMoRepairSource(previous:unknown,current:{runId:string;imageSha256:string;rawSha256:string;schemaSha256:string}):void {
 if(!previous||typeof previous!=='object')throw new Error('Repair provenance: prior report is missing');
 const p=previous as Record<string,any>;
 if(p.ticket!=='ALVA-056'||p.runId!==current.runId||p.attempts!==1||p.automaticRepair!==false)
  throw new Error('Repair provenance: expected a single ALVA-056 inference');
 if(p.repairSource||p.attemptKind&&p.attemptKind!=='first-attempt')
  throw new Error('Repair provenance: a correction cannot be corrected again');
 if(p.source?.sha256!==current.imageSha256)throw new Error('Repair provenance: original image differs from the first attempt');
 if(p.rawOutput?.sha256!==current.rawSha256)throw new Error('Repair provenance: raw response fingerprint differs from the first attempt');
 if(p.schemaSha256!==current.schemaSha256)throw new Error('Repair provenance: output schema differs from the first attempt');
}
