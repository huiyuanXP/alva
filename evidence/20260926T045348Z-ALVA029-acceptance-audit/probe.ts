import Fastify from 'fastify';
import {randomUUID} from 'node:crypto';
import {writeFileSync} from 'node:fs';
import {execFileSync} from 'node:child_process';
import {registerSnapshots} from '../../api/snapshots/routes.js';
import {emptyProject} from '../../api/model.js';
import {seedSnapshotProject} from '../../tests/fixtures/alva/snapshot.js';
const project=emptyProject('ALVA-029 synthetic route probe');
seedSnapshotProject(project);
const app=Fastify(); let enteredSave=false;
// Isolate the real HTTP route and validation callback; storage is deliberately a test double.
const store={mutate:async(_id:any,_req:any,_rev:any,_op:any,_body:any,fn:any)=>{enteredSave=true;await fn(project);return project},saveReceipt:async()=>null};
registerSnapshots(app,store as any,()=>({role:'owner',projectId:project.id}) as any);
const response=await app.inject({method:'POST',url:'/api/save',payload:{requestId:randomUUID(),expectedRevision:0,confirmed:true}});
const result={ticket:'ALVA-029',candidate:execFileSync('git',['rev-parse','HEAD'],{encoding:'utf8'}).trim(),probe:'real Fastify save route with synthetic confirmed layout and test-double store',httpStatus:response.statusCode,enteredSave,hasReview:'layoutReview' in project,hasAdoption:'layoutReviewAdoption' in project,acceptancePassed:false,limitation:'No real database write, browser or production call; this isolates the missing route gate.'};
writeFileSync(new URL('./result.json',import.meta.url),JSON.stringify(result,null,2)+'\n');
console.log(JSON.stringify(result));await app.close();
