import test from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, mkdirSync, rmSync, symlinkSync } from 'node:fs';
import { resolve } from 'node:path';
import { evidencePath } from './browser/evidence.js';

test('delegated evidence is isolated and rejects private/traversal/symlink paths', () => {
  const old = process.env.RENOVATION_ACCEPTANCE_DIR;
  const base = resolve('.runtime/codex-runs');
  mkdirSync(base, {recursive: true});
  const run = mkdtempSync(resolve(base, 'path-unit-'));
  try {
    process.env.RENOVATION_ACCEPTANCE_DIR = `${run}/evidence`;
    assert.equal(evidencePath('test.json'), `${run}/evidence/test.json`);
    assert.throws(() => evidencePath('../report.json'));
    process.env.RENOVATION_ACCEPTANCE_DIR = '.data';
    assert.throws(() => evidencePath('test.json'));
    process.env.RENOVATION_ACCEPTANCE_DIR = '.runtime/codex-runs/../elsewhere';
    assert.throws(() => evidencePath('test.json'));
    symlinkSync(resolve('docs/evidence/week1'), `${run}/linked`, 'dir');
    process.env.RENOVATION_ACCEPTANCE_DIR = `${run}/linked/evidence`;
    assert.throws(() => evidencePath('test.json'));
  } finally {
    if (old === undefined) delete process.env.RENOVATION_ACCEPTANCE_DIR;
    else process.env.RENOVATION_ACCEPTANCE_DIR = old;
    rmSync(run, {recursive: true, force: true});
  }
});
