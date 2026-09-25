/** Same PDF assertions as ALVA-009, in a separate test process to release
 * PDF/canvas memory before the PGlite API regressions. No assertion removed. */
import test from 'node:test';
import assert from 'node:assert/strict';
import {readFile} from 'node:fs/promises';
import {imageData} from '../api/api.js';

test('ALVA-009 preserves PDF origin and discloses the rendered page',async()=>{const pdf=await readFile('evidence/20260919T111534041Z-3aa1dd71/owner.pdf');const source=await imageData('application/pdf',pdf.toString('base64'),'owner.pdf');assert.equal(source.mime,'image/png');assert.equal(source.originalMime,'application/pdf');assert.equal(source.filename,'owner.pdf');assert.equal(source.page,1);assert.ok((source.pages||0)>=1);assert.equal(source.originalData,pdf.toString('base64'));});
