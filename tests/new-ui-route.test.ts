import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync,mkdirSync,writeFileSync,rmSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {join} from 'node:path';
import {buildApp} from '../apps/api/app.js';
import {Store} from '../apps/api/store.js';

test('New UI release can change its entry without changing the original route or asset protection',async()=>{
  const root=mkdtempSync(join(tmpdir(),'new-ui-routing-'));
  const previous={APP_WEB_DIST:process.env.APP_WEB_DIST,APP_NEW_UI_DIST:process.env.APP_NEW_UI_DIST,APP_ENGINE_DIR:process.env.APP_ENGINE_DIR};
  for(const dir of ['web','next','web/assets'])mkdirSync(join(root,dir),{recursive:true});
  writeFileSync(join(root,'web/index.html'),'original-entry');writeFileSync(join(root,'next/index.html'),'new-ui-entry');
  writeFileSync(join(root,'web/assets/new.js'),'new-asset');
  Object.assign(process.env,{APP_WEB_DIST:join(root,'web'),APP_NEW_UI_DIST:join(root,'next'),APP_ENGINE_DIR:join(root,'absent-engine')});
  const store=new Store();await store.init();const app=await buildApp(store,{accessCode:'synthetic-route-test'});
  try{
    for(const url of ['/new-ui','/new-ui/','/new-ui?project=synthetic'])assert.equal((await app.inject({url})).body,'new-ui-entry');
    for(const url of ['/','/?project=synthetic','/new-ui-other'])assert.equal((await app.inject({url})).body,'original-entry');
    assert.equal((await app.inject({url:'/assets/new.js'})).body,'new-asset');
    for(const url of ['/assets/missing.js','/.env'])assert.equal((await app.inject({url})).statusCode,404);
    for(const url of ['/api/projects','/api/not-a-route'])assert.equal((await app.inject({url})).statusCode,401);
  }finally{await app.close();await store.close();for(const [key,value]of Object.entries(previous)){if(value===undefined)delete process.env[key];else process.env[key]=value;}rmSync(root,{recursive:true,force:true});}
});
