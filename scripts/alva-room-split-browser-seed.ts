import {mkdir,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {createTopologyVersion} from '../api/topology/calibration.js';
import type {SceneData} from '../api/model.js';

const code=process.env.ALVA035_CODE;
if(!code||code.length<16)throw new Error('ALVA035_CODE must be provided');
const run=process.env.ALVA035_RUN||`alva035-${Date.now()}`;
const root=resolve('.runtime',run);
const port=Number(process.env.ALVA035_PORT||43145);
const scene:SceneData={walls:[
 {id:'south-035',a:{x:0,y:0},b:{x:6,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'east-035',a:{x:6,y:0},b:{x:6,y:4},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'north-035',a:{x:6,y:4},b:{x:0,y:4},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'west-035',a:{x:0,y:4},b:{x:0,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
],rooms:[{id:'studio',name:'一体工作室',purpose:'工作与储物',polygon:[{x:0,y:0},{x:6,y:0},{x:6,y:4},{x:0,y:4}],locked:false}],openings:[{id:'window-035',wallId:'north-035',kind:'window',offset:.35,width:1.2,height:1.4,sill:.9}],items:[
 {id:'desk-035',name:'工作桌',assetId:'alva-table',roomId:'studio',x:1.5,y:1.5,width:1.4,depth:.7,height:.75,rotation:0,color:'#b49a75',material:'wood',clearance:0,locked:false,sourceId:'browser-seed'},
 {id:'cabinet-035',name:'锁定柜',assetId:'alva-cabinet',roomId:'studio',x:4.5,y:2.5,width:1,depth:.5,height:1.8,rotation:0,color:'#bca68a',material:'wood',clearance:0,locked:true,sourceId:'browser-seed'},
],calibration:{wallId:'south-035',length:6,source:'现场测量',confirmed:true},geography:{latitude:31,north:0,assumption:'图上方为北'}};
await rm(root,{recursive:true,force:true});await mkdir(root,{recursive:true,mode:0o700});
process.env.ALVA_ACCESS_CODE=code;process.env.ALVA_DATA_DIR=root;
const store=new AlvaStore(resolve(root,'db'));await store.init();
const created=await store.create('ALVA-035 浏览器验收');await store.ensureAccessCode(created.project.id);
await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{const topology=createTopologyVersion(p,scene);p.scene=structuredClone(scene);p.confirmedTopology=topology;p.topologyVersions=[topology];p.answers=[{questionId:'use',roomId:'studio',text:'需要工作区和储物区',state:'answered',locked:false,confirmed:true,evidenceId:'evidence-035'}];p.evidence=[{id:'evidence-035',quote:'工作室需要同时容纳工作和收纳',source:'manual',roomId:'studio',createdAt:new Date().toISOString()}];p.dirty=true});
await writeFile(resolve(root,'access.json'),JSON.stringify({run,root,port,code,projectId:created.project.id},null,2),{mode:0o600});await store.close();
console.log(JSON.stringify({run,root,port,code,projectId:created.project.id},null,2));
