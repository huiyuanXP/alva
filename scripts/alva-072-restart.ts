import {readFile} from 'node:fs/promises';
import {resolve} from 'node:path';
import assert from 'node:assert/strict';
import {AlvaStore} from '../api/store.js';
import {listProjects} from '../api/projects/service.js';
const root=resolve(process.argv[2]),expected=JSON.parse(await readFile(resolve(root,'restart.json'),'utf8'));
const store=new AlvaStore(resolve(root,'db'));await store.init();try{await store.ensureAccessCode(expected.projectId);const session=await store.session(expected.session);assert.equal(session.projectId,expected.projectId);assert.equal((await listProjects(store,session)).length,2);assert.ok((await store.get(expected.secondId)).messages.length);assert.equal((await store.chatState(expected.projectId)).threads.floorplan.threadId,expected.threadId);console.log('ALVA-072 persisted project list, current session, separate histories and original Chat thread verified in fresh process')}finally{await store.close()}
