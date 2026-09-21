import test from 'node:test';
import assert from 'node:assert/strict';
import {mkdtempSync, mkdirSync, writeFileSync, rmSync, readFileSync} from 'node:fs';
import {tmpdir} from 'node:os';
import {resolve} from 'node:path';
import Fastify from 'fastify';
import {boardPayload} from '../api/todo/board.js';
import {registerTodo} from '../api/todo/routes.js';

test('published tracker: all 44 IDs, 150 criteria, dependency frontier and stable revision', () => {
  const board = boardPayload();
  assert.deepEqual(board.tickets.map(t => t.id), Array.from({length:44}, (_,i)=>`ALVA-${String(i+8).padStart(3,'0')}`));
  assert.deepEqual(board.tickets.filter(t=>t.column==='ready').map(t=>t.id), ['ALVA-012','ALVA-015','ALVA-018','ALVA-019','ALVA-020','ALVA-023','ALVA-031','ALVA-036','ALVA-041','ALVA-043']);
  assert.equal(board.tickets.find(t=>t.id==='ALVA-008')!.column,'done');
  assert.deepEqual(board.tickets.filter(t=>t.owner).map(t=>t.id),[]);
  assert.equal(board.tickets.filter(t=>t.column==='blocked').length,28);
  assert.equal(board.tickets.reduce((n,t)=>n+t.checks,0),150);
  assert.deepEqual(board.tickets.filter(t=>t.checked).map(t=>t.id),['ALVA-008','ALVA-009','ALVA-010','ALVA-011','ALVA-014','ALVA-017']);
  assert.equal(board.revision,boardPayload().revision);
  assert.deepEqual(board.tickets.find(t=>t.id==='ALVA-021')!.deps,['ALVA-020','ALVA-013']);
});

test('source changes drive unlock, claim, errors and revision without a copied database', () => {
  const root=mkdtempSync(resolve(tmpdir(),'alva-todo-test-'));
  try {
    const dir=resolve(root,'.scratch/alva-completion/issues');mkdirSync(dir,{recursive:true});
    writeFileSync(resolve(root,'SPEC.md'),'test');writeFileSync(resolve(root,'NextTask.md'),'');
    writeFileSync(resolve(dir,'../README.md'),'test');
    const ticket=(id:string,dep:string,status='ready-for-agent')=>`# 01: Test\n\n**ID:** ${id}\n\n**Status:** ${status}\n\n**Blocked by:** ${dep}\n\n- [ ] Accept\n`;
    const a=resolve(dir,'01-a.md'),b=resolve(dir,'02-b.md');
    writeFileSync(a,ticket('ALVA-008','None'));writeFileSync(b,ticket('ALVA-009','01：A'));
    const before=boardPayload(root);assert.equal(before.tickets[1].column,'blocked');
    writeFileSync(a,ticket('ALVA-008','None','done'));
    const unlocked=boardPayload(root);assert.equal(unlocked.tickets[1].column,'ready');assert.notEqual(before.revision,unlocked.revision);
    writeFileSync(resolve(root,'NextTask.md'),'| [ALVA-009](x.md) | B | import | Alice | task/branch | active |');
    const claimed=boardPayload(root);assert.equal(claimed.tickets[1].owner,'Alice');assert.equal(claimed.tickets[1].column,'progress');assert.notEqual(unlocked.revision,claimed.revision);
    writeFileSync(a,ticket('ALVA-008','[ALVA-009](02-b.md)'));assert.throws(()=>boardPayload(root),/cycle/);
    writeFileSync(a,ticket('ALVA-008','[ALVA-999](99-missing.md)'));assert.throws(()=>boardPayload(root),/Unresolved/);
    writeFileSync(a,ticket('ALVA-008','None','invalid'));assert.throws(()=>boardPayload(root),/status/);
    writeFileSync(a,ticket('ALVA-009','None'));assert.throws(()=>boardPayload(root),/Duplicate/);
  } finally {rmSync(root,{recursive:true,force:true});}
});

test('read-only board HTTP routes, real source, no-store and unknown-path handling', async () => {
  const app=Fastify();registerTodo(app);
  try {
    for(const url of ['/todo','/todo/']) {const r=await app.inject(url);assert.equal(r.statusCode,200);assert.match(r.body,/alva 工作空间/);assert.equal(r.headers['cache-control'],'no-store');}
    const r=await app.inject('/todo/api/board');assert.equal(r.statusCode,200);assert.equal(r.json().tickets.length,44);assert.equal(r.headers['cache-control'],'no-store');
    assert.equal((await app.inject('/todo/api/missing')).statusCode,404);
    assert.equal((await app.inject({method:'POST',url:'/todo/api/board',payload:{status:'done'}})).statusCode,404);
  } finally {await app.close();}
});
