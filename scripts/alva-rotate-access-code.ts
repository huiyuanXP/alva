import {resolve} from 'node:path';
import {AlvaStore} from '../api/store.js';

const dir=resolve(process.env.ALVA_DATA_DIR||'.runtime/alva-data');
const store=new AlvaStore(resolve(dir,'db'));
await store.init();
try{
 const code=await store.rotateAccessCode(process.argv[2]);
 process.stdout.write(`${code}\n`);
}finally{await store.close()}
