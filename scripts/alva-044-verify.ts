import assert from 'node:assert/strict';
import {randomUUID} from 'node:crypto';
import {unzipSync,strFromU8} from 'fflate';
import {getDocument} from 'pdfjs-dist/legacy/build/pdf.mjs';
import {AlvaStore} from '../api/store.js';
import {buildAlva} from '../api/api.js';
import {createDeliveryArchive} from '../api/export.js';

const port=42944,origin=`http://127.0.0.1:${port}`,priorCode=process.env.ALVA_ACCESS_CODE,priorPort=process.env.ALVA_PORT;
process.env.ALVA_ACCESS_CODE='alva044-lexie-verification-code';process.env.ALVA_PORT=String(port);
const store=new AlvaStore();await store.init();const {project}=await store.create('ALVA-044 E2E');await store.ensureAccessCode(project.id);
let p=await store.mutate(project.id,randomUUID(),0,'seed',{},current=>{
 current.scene={walls:[{id:'w1',a:{x:0,y:0},b:{x:4,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]},{id:'w2',a:{x:4,y:0},b:{x:4,y:3},thickness:.15,height:2.8,structural:'unknown',evidence:[]},{id:'w3',a:{x:4,y:3},b:{x:0,y:3},thickness:.15,height:2.8,structural:'unknown',evidence:[]},{id:'w4',a:{x:0,y:3},b:{x:0,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'living',name:'客厅',purpose:'阅读与会客',polygon:[{x:0,y:0},{x:4,y:0},{x:4,y:3},{x:0,y:3}],locked:false}],openings:[],items:[{id:'desk',assetId:'alva-table',roomId:'living',name:'书桌',x:2,y:1.5,width:1.4,depth:.65,height:.75,rotation:0,color:'#b49a75',material:'wood',clearance:0,locked:false}],calibration:{wallId:'w1',length:4,source:'业主现场尺量',confirmed:true},geography:{latitude:1.3,north:0,assumption:'synthetic'}};
 current.answers=[{questionId:'Q18',roomId:null,text:'采光和阅读区不能牺牲',state:'answered',locked:true,confirmed:true,evidenceId:'e1'}];
 current.evidence=[{id:'e1',quote:'采光和阅读区不能牺牲',source:'questionnaire',createdAt:new Date().toISOString()},{id:'e2',quote:'我的预算是五万',source:'chat',createdAt:new Date().toISOString()}];
 current.findings=[{id:'pro',kind:'professional',title:'材料支撑待专业核实',reason:'缺少重量与支撑资料，无法判断承载是否成立。',suggestion:'由相应专业人员补齐资料。',objectIds:['desk'],roomIds:['living'],evidenceIds:[],confidence:'low',status:'acknowledged',stage:'review'}];
 current.messages=[{id:'m1',role:'assistant',status:'completed',createdAt:new Date().toISOString(),text:'资料事实 [BG01 · references/02_intake_form.html#Q10]；基于当前信息建议比较工作位。'}];
 current.proposals=[{id:'p1',title:'保留阅读区',rationale:'采光不可牺牲',evidenceIds:['e1'],baseRevision:0,changes:[],status:'accepted'},{id:'p2',title:'预算优先方案',rationale:'预算五万',evidenceIds:['e2'],baseRevision:0,changes:[],status:'rejected'}];
});
p=await store.mutate(project.id,randomUUID(),p.revision,'save',{confirmed:true},()=>{});assert.equal(p.savedVersion,1);
const app=await buildAlva(store,{assets:true,origin});await app.listen({host:'127.0.0.1',port});
try{
 const archive=await createDeliveryArchive(store,project.id,1),files=unzipSync(new Uint8Array(archive));
 for(const name of ['designer.docx','owner.pdf','floorplan.svg','floorplan.png','whole-home.png','room-living.png','scene.json','sidecar.json','manifest.json'])assert.ok(files[name],name);
 const docxFiles=unzipSync(files['designer.docx']),docXml=strFromU8(docxFiles['word/document.xml']);for(const id of ['D01','D02','D03','D04','D05','D06','D07','D08','D09','D10'])assert.match(docXml,new RegExp(id));assert.match(docXml,/alva v1设计师任务书/);assert.match(docXml,/BG01 · references\/02_intake_form.html#Q10/);
 const pdf=await getDocument({data:files['owner.pdf']}).promise;let pdfText='';for(let i=1;i<=pdf.numPages;i++){const page=await pdf.getPage(i),content=await page.getTextContent();pdfText+=content.items.map((x:any)=>x.str||'').join(' ')+'\n'}for(const id of ['U01','U02','U03','U04','U05'])assert.match(pdfText,new RegExp(id));assert.match(pdfText,/alva v1/);assert.match(pdfText,/专业待核实/);
 const sidecar=JSON.parse(strFromU8(files['sidecar.json'])),manifest=JSON.parse(strFromU8(files['manifest.json']));assert.equal(sidecar.documentSourceVersion,1);assert.equal(sidecar.version,1);assert.equal(sidecar.deliverySections.designer.length,10);assert.equal(sidecar.deliverySections.owner.length,5);assert.ok(manifest.files['designer.docx']);assert.ok(manifest.files['owner.pdf']);
 const human=docXml+'\n'+pdfText+'\n'+strFromU8(files['sidecar.json']);assert.equal(/预算|报价|费用|金额|budget|price|pricing|cost\b/i.test(human),false);
 console.log(JSON.stringify({ok:true,version:1,designerSections:10,ownerSections:5,pdfPages:pdf.numPages,files:Object.keys(files).sort()},null,2));
}finally{await app.close();await store.close();if(priorCode===undefined)delete process.env.ALVA_ACCESS_CODE;else process.env.ALVA_ACCESS_CODE=priorCode;if(priorPort===undefined)delete process.env.ALVA_PORT;else process.env.ALVA_PORT=priorPort}
