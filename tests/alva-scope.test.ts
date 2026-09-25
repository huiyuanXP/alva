import test from 'node:test';
import assert from 'node:assert/strict';
import {emptyProject,type SceneData} from '../api/model.js';
import {assertProposalScope,cancelScope,confirmScope,createScopeRequest} from '../api/scope.js';

const scene:SceneData={walls:[{id:'w',a:{x:0,y:0},b:{x:8,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[
 {id:'open',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:4,y:0},{x:4,y:4},{x:0,y:4}],locked:false},
 {id:'locked-room',name:'锁定卧室',purpose:'休息',polygon:[{x:4,y:0},{x:8,y:0},{x:8,y:4},{x:4,y:4}],locked:true}
],openings:[],items:[
 {id:'sofa',assetId:'alva-sofa',roomId:'open',name:'沙发',x:2,y:2,width:2.1,depth:.9,height:.8,rotation:0,color:'#9da991',material:'fabric',clearance:0,locked:false},
 {id:'locked-item',assetId:'alva-bed',roomId:'locked-room',name:'锁定床',x:6,y:2,width:1.8,depth:2,height:.55,rotation:0,color:'#c8baa8',material:'fabric',clearance:0,locked:false}
],calibration:null,geography:{latitude:1.3,north:0,assumption:'synthetic'}};

test('ALVA-020 scope cancellation preserves design and does not create a snapshot',()=>{
 const project=emptyProject('scope');project.scene=structuredClone(scene);
 const request=createScopeRequest(project,{roomIds:['open'],itemIds:['sofa'],reason:'先确认客厅范围'});
 project.scopeRequests=[request];const before=JSON.stringify(project.scene),saved=project.savedVersion;
 cancelScope(project,request.id);
 assert.equal(JSON.stringify(project.scene),before);assert.equal(project.savedVersion,saved);assert.equal(project.scopeRequests[0].status,'cancelled');
});

test('ALVA-020 confirms only unlocked in-range targets and binds proposals',()=>{
 const project=emptyProject('scope');project.scene=structuredClone(scene);
 assert.throws(()=>createScopeRequest(project,{roomIds:['locked-room'],itemIds:[],reason:'越界'}),/锁定/);
 const request=createScopeRequest(project,{roomIds:['open'],itemIds:['sofa'],reason:'只处理客厅'});
 project.scopeRequests=[request];confirmScope(project,request.id,['open'],['sofa']);
 const proposal={id:'p',title:'调整客厅',rationale:'',evidenceIds:[],baseRevision:project.revision,changes:[{action:'update' as const,targetId:'sofa',values:{width:2}}],status:'proposed' as const,scopeId:request.id,scopeRequired:true};
 assert.doesNotThrow(()=>assertProposalScope(project.scene!,proposal,project.scopeRequests!));
 const outside={...proposal,changes:[{action:'purpose' as const,targetId:'locked-room',values:{purpose:'不应修改'}}]};
 assert.throws(()=>assertProposalScope(project.scene!,outside,project.scopeRequests!),/超出/);
 assert.equal(project.dirty,false);
});
