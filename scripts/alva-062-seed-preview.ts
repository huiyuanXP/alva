import {randomUUID} from 'node:crypto';
import {readFile,mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {AlvaStore} from '../api/store.js';
import {validateScene} from '../api/model.js';

const candidatePath=process.argv[2];
const dataDir=process.argv[3];
if(!candidatePath||!dataDir)throw new Error('usage: alva-062-seed-preview.ts <candidate.json> <data-dir>');
const scene=validateScene(JSON.parse(await readFile(candidatePath,'utf8')));
const image=await readFile('references/room-study-handoff/public/floorplan.png');
await mkdir(dataDir,{recursive:true,mode:0o700});
const store=new AlvaStore(resolve(dataDir,'db'));
try{
 await store.init();
 const count=(await store.db.query<{count:number}>('SELECT COUNT(*)::int AS count FROM alva_projects')).rows[0].count;
 if(count)throw new Error('preview data directory must be empty');
 const {project}=await store.create('Gemini 3.8 户型识别预览');
 await store.ensureAccessCode(project.id);
 const now=new Date().toISOString();
 await store.mutate(project.id,randomUUID(),project.revision,'gemini-preview-seed',{source:'floorplan.png',model:'gemini-3.8-flash-high'},p=>{
  p.candidate=scene;
  p.sourceImage={mime:'image/png',data:image.toString('base64'),originalMime:'image/png',filename:'floorplan.png'};
  p.importState={status:'succeeded',message:'Gemini 3.8 已生成待人工校核的户型候选。',requestId:randomUUID(),sourceMime:'image/png',filename:'floorplan.png',provider:'codex',model:'gemini-3.8-flash-high',startedAt:now,finishedAt:now};
  p.dirty=true;
 });
 console.log(JSON.stringify({projectId:project.id,walls:scene.walls.length,rooms:scene.rooms.length,openings:scene.openings.length,dataDir}));
}finally{await store.close()}
