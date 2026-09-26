import {mkdir,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {createTopologyVersion} from '../api/topology/calibration.js';
import type {SceneData} from '../api/model.js';

const code=process.env.ALVA045_CODE;if(!code||code.length<16)throw new Error('ALVA045_CODE must be provided');
const run=process.env.ALVA045_RUN||`alva045-${Date.now()}`,root=resolve('.runtime',run),port=Number(process.env.ALVA045_PORT||43147);
const png='iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mNk+A8AAQUBAScY42YAAAAASUVORK5CYII=';
const scene:SceneData={walls:[
 {id:'south-045',a:{x:0,y:0},b:{x:6,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'east-045',a:{x:6,y:0},b:{x:6,y:4},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'north-045',a:{x:6,y:4},b:{x:0,y:4},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'west-045',a:{x:0,y:4},b:{x:0,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
],rooms:[{id:'living-045',name:'客餐厅',purpose:'阅读与会客',polygon:[{x:0,y:0},{x:6,y:0},{x:6,y:4},{x:0,y:4}],locked:false}],openings:[{id:'window-045',wallId:'north-045',kind:'window',offset:.35,width:1.2,height:1.4,sill:.9}],items:[
 {id:'desk-045',name:'工作桌',assetId:'alva-table',roomId:'living-045',x:1.5,y:1.5,width:1.4,depth:.65,height:.75,rotation:0,color:'#b49a75',material:'wood',clearance:0,locked:false,sourceId:'browser-seed'},
],calibration:{wallId:'south-045',length:6,source:'现场测量',confirmed:true},geography:{latitude:31,north:0,assumption:'图上方为北'}};
await rm(root,{recursive:true,force:true});await mkdir(root,{recursive:true,mode:0o700});process.env.ALVA_ACCESS_CODE=code;process.env.ALVA_DATA_DIR=root;
const store=new AlvaStore(resolve(root,'db'));await store.init();const created=await store.create('ALVA-045 完整交付包验收');await store.ensureAccessCode(created.project.id);
const seeded=await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{const topology=createTopologyVersion(p,scene);p.scene=structuredClone(scene);p.confirmedTopology=topology;p.topologyVersions=[topology];p.sourceImage={mime:'image/png',originalMime:'image/png',data:png,filename:'参考户型图.png'};p.roomMergeHistory=[{id:'merge-045',mergedRoomId:'living-045',sourceRoomIds:['old-a','old-b'],sourceRoomNames:['旧客厅','旧餐区'],name:'客餐厅',purpose:'阅读与会客',createdAt:new Date().toISOString()}];p.roomSplitHistory=[{id:'split-045',sourceRoomId:'living-045',sourceRoomName:'客厅',childRoomIds:['reading-045','meeting-045'],childRoomNames:['阅读区','会客区'],splitLine:{a:{x:3,y:0},b:{x:3,y:4}},itemAssignments:[{itemId:'desk-045',childRoomId:'reading-045'}],openingAssignments:[{openingId:'window-045',childRoomId:'reading-045'}],requirementAssignments:[{kind:'answer',id:'answer-045',childRoomId:'reading-045'}],createdAt:new Date().toISOString()}];p.archivedFurniture=[{id:'retired-045',item:structuredClone(scene.items[0]),removedAt:new Date().toISOString(),reason:'移回家具库'}];p.evidence=[{id:'evidence-045',quote:'希望客餐厅保留阅读位和采光',source:'manual',roomId:'living-045',createdAt:new Date().toISOString()}];p.dirty=true});
const saved=await store.mutate(created.project.id,randomUUID(),seeded.revision,'save',{},()=>{});await writeFile(resolve(root,'access.json'),JSON.stringify({run,root,port,code,projectId:created.project.id,version:saved.savedVersion},null,2),{mode:0o600});await store.close();console.log(JSON.stringify({run,root,port,code,projectId:created.project.id,version:saved.savedVersion},null,2));
