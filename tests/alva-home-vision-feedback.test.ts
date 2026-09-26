import test from 'node:test';
import assert from 'node:assert/strict';
import {activeAnswers,flags,options,path,items,type Answers} from '../packages/contracts/alva/home-vision/flow.js';

test('retiring location keeps historical answers but shows a usable general home type',()=>{
 const fresh:Answers={};
 assert.deepEqual(path(fresh).filter(c=>c.stage==='S1').map(c=>c.card),['Q01','Q03','Q04','Q05']);
 assert.ok(flags(fresh).has('MARKET_OTHER'));
 const type=items.find(i=>i.id==='Q03a')!;
 assert.ok(options(type,fresh).some(o=>o.id==='Q03a.apartment'));
 const old:Answers={Q02a:{state:'answered',value:{country:'Singapore',city:'Singapore'}}};
 assert.ok(flags(old).has('MARKET_SG'));
 assert.equal(activeAnswers(old).Q02a,undefined);
 assert.deepEqual(old.Q02a.value,{country:'Singapore',city:'Singapore'});
});
