import {mkdir} from 'node:fs/promises';
import {resolve} from 'node:path';
import {AlvaStore} from './store.js';
import {buildAlva} from './api.js';
const dir=resolve(process.env.ALVA_DATA_DIR||'.runtime/alva-data');await mkdir(dir,{recursive:true,mode:0o700});
const store=new AlvaStore(resolve(dir,'db'));await store.init();
const count=(await store.db.query<{count:number}>('SELECT COUNT(*)::int AS count FROM alva_projects')).rows[0].count;
let projectId:string;
if(!count){projectId=(await store.create('我们的家')).project.id}else{projectId=(await store.db.query<{id:string}>('SELECT id FROM alva_projects ORDER BY id LIMIT 1')).rows[0].id}
await store.ensureAccessCode(projectId);
const app=await buildAlva(store);await app.listen({host:'127.0.0.1',port:Number(process.env.ALVA_PORT||4180)});console.log('alva listening on loopback');
for(const sig of ['SIGINT','SIGTERM'])process.on(sig,async()=>{await app.close();await store.close();process.exit(0)});
