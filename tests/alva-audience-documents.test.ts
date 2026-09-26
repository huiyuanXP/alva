import test from 'node:test';
import assert from 'node:assert/strict';
import {unzipSync,strFromU8} from 'fflate';
import {emptyProject,type Project} from '../api/model.js';
import {sections,docx,ownerHtml,deliveryManifest} from '../api/export.js';
import {createHash} from 'node:crypto';
import {financialContentExcluded} from '../api/delivery-content.js';

function project():Project{
 const p=emptyProject('Lexie 的家');p.savedVersion=3;p.revision=18;
 p.scene={walls:[{id:'w1',a:{x:0,y:0},b:{x:4,y:0},thickness:.15,height:2.8,structural:'unknown',evidence:[]}],rooms:[{id:'living',name:'客厅',purpose:'阅读与会客',polygon:[{x:0,y:0},{x:4,y:0},{x:4,y:3},{x:0,y:3}],locked:false}],openings:[],items:[{id:'desk',assetId:'alva-table',roomId:'living',name:'书桌',x:2,y:1.5,width:1.4,depth:.65,height:.75,rotation:0,color:'#b49a75',material:'wood',clearance:0,locked:false}],calibration:{wallId:'w1',length:4,source:'业主现场尺量',confirmed:true},geography:{latitude:1.3,north:0,assumption:'test'}};
 p.answers=[{questionId:'Q18',roomId:null,text:'采光和阅读区不能牺牲',state:'answered',locked:true,confirmed:true,evidenceId:'e1'}];
 p.evidence=[{id:'e1',quote:'采光和阅读区不能牺牲',source:'questionnaire',createdAt:'2026-09-26T00:00:00Z'},{id:'e2',quote:'我喜欢低饱和木色',source:'chat',roomId:'living',createdAt:'2026-09-26T00:00:01Z'},{id:'financial',quote:'我的预算是五万',source:'chat',createdAt:'2026-09-26T00:00:02Z'}];
 p.userContextEntries=[{id:'ctx1',category:'preferences',text:'低饱和木色',quote:'我喜欢低饱和木色',sourceMessageIds:[],sourceEvidenceIds:['e2'],sourceQuestionIds:[],roomIds:['living'],objectIds:[],status:'confirmed',updatedAt:'2026-09-26T00:00:01Z'},{id:'ctx2',category:'unresolved',text:'窗边阅读灯位置还没确认',quote:'阅读灯我还没想好',sourceMessageIds:[],sourceEvidenceIds:[],sourceQuestionIds:[],roomIds:['living'],objectIds:[],status:'pending',updatedAt:'2026-09-26T00:00:03Z'}];
 p.findings=[{id:'pain1',kind:'behavior',title:'阅读位与眩光需比较',reason:'当前阅读位靠近窗边，下午可能有眩光。',suggestion:'比较侧向布置并保留遮光选择。',objectIds:['desk'],roomIds:['living'],evidenceIds:['e1'],confidence:'medium',status:'pending',stage:'intake'},{id:'pro1',kind:'professional',title:'材料支撑待专业核实',reason:'缺少重量与支撑资料，无法判断承载是否成立。',suggestion:'补齐产品资料并由相应专业人员核实。',objectIds:['desk'],roomIds:['living'],evidenceIds:[],confidence:'low',status:'acknowledged',stage:'review'}];
 p.proposals=[{id:'p1',title:'保留窗边阅读区',rationale:'用户明确把采光列为不可牺牲项',evidenceIds:['e1'],baseRevision:17,changes:[],status:'accepted'},{id:'p2',title:'预算优先方案',rationale:'预算五万',evidenceIds:['financial'],baseRevision:17,changes:[],status:'rejected'}];
 p.messages=[{id:'m1',role:'assistant',status:'completed',createdAt:'2026-09-26T00:01:00Z',text:'### 资料事实\n居家工作位应结合设备与使用方式讨论 [BG01 · references/02_intake_form.html#Q10]\n\n### 基于当前信息的推断/建议\n可比较窗边与侧向书桌。'}];
 p.roomStyles={living:{tags:['暖色','简洁'],wall:{color:'#ded6cb',material:'paint'},floor:{color:'#ad997c',material:'wood'}}};
 p.changes=[{id:'c1',description:'确认客厅用途为阅读与会客',evidenceIds:['e1'],context:[],createdAt:'2026-09-26T00:00:00Z'}];
 return p;
}

const forbidden=/预算|报价|费用|金额|budget|price|pricing|cost\b/i;

test('ALVA-044 maps complete D01-D10 and U01-U05 without financial chapters or leaked financial records',()=>{
 const p=project(),designer=sections(p,'designer'),owner=sections(p,'owner');
 assert.deepEqual(designer.map(([title])=>title.match(/^D\d+/)?.[0]),['D01','D02','D03','D04','D05','D06','D07','D08','D09','D10']);
 assert.deepEqual(owner.map(([title])=>title.match(/^U\d+/)?.[0]),['U01','U02','U03','U04','U05']);
 const all=JSON.stringify({designer,owner});assert.equal(forbidden.test(all),false,all);
 assert.match(all,/采光和阅读区不能牺牲/);assert.match(all,/低饱和木色/);assert.match(all,/阅读位与眩光需比较/);assert.match(all,/保留窗边阅读区/);
 assert.match((designer.find(([t])=>t.startsWith('D08'))![1]).join('\n'),/BG01 · references\/02_intake_form.html#Q10/);
 assert.match((designer.find(([t])=>t.startsWith('D09'))![1]).join('\n'),/专业待核实 \[材料支撑待专业核实\].*状态：未决/);
 assert.match((owner.find(([t])=>t.startsWith('U05'))![1]).join('\n'),/仍需专业核实：专业待核实/);
 assert.doesNotMatch(all,/预算优先方案|我的预算是五万/);
});

test('ALVA-044 designer DOCX contains editable body text and owner HTML carries the same saved version',()=>{
 const p=project(),designer=sections(p,'designer'),bytes=docx(`${p.name} · alva v${p.savedVersion}设计师任务书`,designer),zip=unzipSync(bytes),xml=strFromU8(zip['word/document.xml']);
 assert.match(xml,/<w:t[^>]*>Lexie 的家 · alva v3设计师任务书<\/w:t>/);assert.match(xml,/<w:t[^>]*>D01 项目摘要<\/w:t>/);assert.match(xml,/<w:t[^>]*>D10 交接、版本与权限<\/w:t>/);assert.match(xml,/采光和阅读区不能牺牲/);assert.ok(zip['word/styles.xml']);
 const html=ownerHtml(p,3,new Uint8Array([1,2,3]),'<svg></svg>');assert.match(html,/Lexie 的家 · alva v3/);for(const id of ['U01','U02','U03','U04','U05'])assert.match(html,new RegExp(id));assert.equal(forbidden.test(html),false);
});

test('ALVA-044 financial exclusion guard rejects records before sidecar projection',()=>{
 assert.equal(financialContentExcluded({title:'普通方案',reason:'采光'}),true);assert.equal(financialContentExcluded({title:'预算优先方案',reason:'五万'}),false);assert.equal(financialContentExcluded('报价 5000'),false);
});

test('ALVA-045 manifest binds every payload to the selected saved version and preserves topology relations',()=>{
 const p=project();p.roomMergeHistory=[{id:'merge-1',mergedRoomId:'living',sourceRoomIds:['old-a','old-b'],sourceRoomNames:['旧客厅','旧餐区'],name:'客餐厅',purpose:'会客',createdAt:'2026-09-26T00:02:00Z'}];p.roomSplitHistory=[{id:'split-1',sourceRoomId:'living',sourceRoomName:'客厅',childRoomIds:['living-a','living-b'],childRoomNames:['阅读区','会客区'],splitLine:{a:{x:2,y:0},b:{x:2,y:3}},itemAssignments:[{itemId:'desk',childRoomId:'living-a'}],openingAssignments:[],requirementAssignments:[{kind:'answer',id:'Q18',childRoomId:'living-a'}],createdAt:'2026-09-26T00:03:00Z'}];p.archivedFurniture=[{id:'retired-1',item:p.scene!.items[0],removedAt:'2026-09-26T00:04:00Z',reason:'移回家具库'}];
 const files={'scene.json':new TextEncoder().encode(JSON.stringify({version:3,snapshotFingerprint:'fp'})),'sidecar.json':new TextEncoder().encode(JSON.stringify({version:3})),'references.json':new TextEncoder().encode(JSON.stringify({version:3})),'floorplan.png':new Uint8Array([1,2,3]),'designer.docx':new Uint8Array([4]),'owner.pdf':new Uint8Array([5])};
 const manifest=deliveryManifest(p,3,'fp',files) as any;
 assert.equal(manifest.version,3);assert.equal(manifest.sourceSnapshot.version,3);assert.equal(manifest.sourceSnapshot.snapshotFingerprint,'fp');assert.equal(manifest.relations.roomMergeHistory[0].id,'merge-1');assert.equal(manifest.relations.roomSplitHistory[0].childRoomIds[1],'living-b');assert.equal(manifest.relations.retiredFurniture[0].id,'retired-1');assert.equal(manifest.manifestSelfChecksum.startsWith('excluded:'),true);
 for(const [name,data] of Object.entries(files)){assert.equal(manifest.files[name].bytes,data.length);assert.equal(manifest.files[name].sha256,createHash('sha256').update(data).digest('hex'));}
});
