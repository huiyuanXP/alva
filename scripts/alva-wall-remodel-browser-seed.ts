import {mkdir,rm,writeFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import {randomUUID} from 'node:crypto';
import {AlvaStore} from '../api/store.js';
import {createTopologyVersion} from '../api/topology/calibration.js';
import type {SceneData} from '../api/model.js';

const code=process.env.ALVA033_CODE; if(!code||code.length<16) throw new Error("ALVA033_CODE must be provided");
const run=process.env.ALVA033_RUN||`alva033-${Date.now()}`,root=resolve('.runtime',run),port=Number(process.env.ALVA033_PORT||43143);
if(!code||code.length<16) throw new Error("ALVA033_CODE must be provided");
const scene:SceneData={walls:[
 {id:'bottom-left',a:{x:0,y:0},b:{x:3,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'bottom-right',a:{x:3,y:0},b:{x:6,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'right',a:{x:6,y:0},b:{x:6,y:4},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'top-right',a:{x:6,y:4},b:{x:3,y:4},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'top-left',a:{x:3,y:4},b:{x:0,y:4},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'left',a:{x:0,y:4},b:{x:0,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},
 {id:'divider',a:{x:3,y:0},b:{x:3,y:4},thickness:.15,height:2.8,structural:'nonloadbearing',evidence:['professional-classification:seed-033']},
],rooms:[{id:'left-room',name:'客厅',purpose:'生活',polygon:[{x:0,y:0},{x:3,y:0},{x:3,y:4},{x:0,y:4}],locked:false},{id:'right-room',name:'书房',purpose:'工作',polygon:[{x:3,y:0},{x:6,y:0},{x:6,y:4},{x:3,y:4}],locked:false}],openings:[{id:'door-033',wallId:'divider',kind:'door',offset:.5,width:.9,height:2,sill:0}],items:[],calibration:{wallId:'bottom-left',length:3,source:'现场测量',confirmed:true},geography:{latitude:31,north:0,assumption:'图上方为北'}};
await rm(root,{recursive:true,force:true});await mkdir(root,{recursive:true,mode:0o700});process.env.ALVA_ACCESS_CODE=code;process.env.ALVA_DATA_DIR=root;
const store=new AlvaStore(resolve(root,'db'));await store.init();const created=await store.create('ALVA-033 浏览器验收');await store.ensureAccessCode(created.project.id);await store.mutate(created.project.id,randomUUID(),0,'seed',{},p=>{const topology=createTopologyVersion(p,scene);p.scene=structuredClone(scene);p.confirmedTopology=topology;p.topologyVersions=[topology];p.dirty=true});const grant=await store.grantProfessional(created.project.id,'engineer-browser-033','注册结构工程师·墙体分类','浏览器验收：结构图 R21 + 现场复核','browser-acceptance');const invite=await store.invite(created.project.id,'designer');await writeFile(resolve(root,'access.json'),JSON.stringify({run,root,port,code,projectId:created.project.id,professionalInviteToken:grant.token,designerInviteToken:invite.token},null,2),{mode:0o600});await store.close();console.log(JSON.stringify({run,root,port,code,projectId:created.project.id,professionalInviteToken:grant.token},null,2));
