import {emptyProject, itemFromAsset, type SceneData} from '../../../api/model.js';
import type {UserContextProject} from '../../../api/user-context/index.js';
import type {UserContextCategory, UserContextEntry} from '../../../packages/contracts/alva/user-context.js';

/** Synthetic room and statements only; not production customer data or a measured floorplan. */
export function reviewProject(): UserContextProject {
  const p: UserContextProject = emptyProject('ALVA-029 合成验收项目');
  const wall = (id: string, ax: number, ay: number, bx: number, by: number): SceneData['walls'][number] => ({
    id, a: {x: ax, y: ay}, b: {x: bx, y: by}, thickness: 0.15, height: 2.8, structural: 'unknown', evidence: [],
  });
  p.scene = {walls: [wall('bottom', 0, 0, 6, 0), wall('right', 6, 0, 6, 6), wall('top', 6, 6, 0, 6), wall('left', 0, 6, 0, 0)],
    rooms: [{id: 'room-1', name: '合成客厅', purpose: '生活', polygon: [{x: 0, y: 0}, {x: 6, y: 0}, {x: 6, y: 6}, {x: 0, y: 6}], locked: false}],
    openings: [{id: 'door-left', wallId: 'left', kind: 'door', offset: 0.5, width: 1.2, height: 2.1, sill: 0},
      {id: 'door-right', wallId: 'right', kind: 'door', offset: 0.5, width: 1.2, height: 2.1, sill: 0},
      {id: 'window', wallId: 'bottom', kind: 'window', offset: 0.25, width: 1.2, height: 1.2, sill: 0.9}],
    items: [], calibration: null, geography: {latitude: 1.3, north: 0, assumption: 'ALVA-029 synthetic fixture'}};
  p.userContextEntries = [];
  return p;
}
export function painFurniture(p: UserContextProject) {
  const table = {...itemFromAsset('alva-table', 'room-1', 4.5, 4.5), id: 'table', width: 0.6};
  const sofa = {...itemFromAsset('alva-sofa', 'room-1', 2.5, 4.5), id: 'sofa', clearance: 0.1};
  const plant = {...itemFromAsset('alva-plant', 'room-1', 1.5, 0.4), id: 'plant', height: 1.8};
  p.scene!.items = [table, sofa, plant];
  return {table, sofa, plant};
}
export function contextEntry(p: UserContextProject, id: string, category: UserContextCategory, quote: string,
  extra: Partial<UserContextEntry> = {}): UserContextEntry {
  const createdAt = '2026-09-26T00:00:00.000Z', evidenceId = 'source-' + id;
  p.evidence.push({id: evidenceId, quote, source: 'chat', createdAt});
  const entry: UserContextEntry = {id, category, text: quote, quote, sourceMessageIds: [], sourceEvidenceIds: [evidenceId],
    sourceQuestionIds: [], roomIds: [], objectIds: [], status: 'confirmed', updatedAt: createdAt, ...extra};
  p.userContextEntries!.push(entry);
  return entry;
}
