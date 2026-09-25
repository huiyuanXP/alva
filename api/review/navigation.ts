import type {SceneData, XY} from '../model.js';
import {boundaryDistance, footprintDistance, inside, openingPosition, segmentDistance, solidWalls} from './geometry.js';

export const navigationAssumptions = {passageWidthMetres: 0.6, navigationGridMetres: 0.15, maximumRoomCells: 6400};
type Route = {roomId: string; openingIds: string[]; points: XY[]; blockerIds: string[]};
export type NavigationResult = {blocked: Route[]; checkedPairs: number; limitations: string[]};

/** Bounded grid comparison, not a building-code or accessibility compliance calculation. */
export function checkRoomRoutes(scene: SceneData): NavigationResult {
  const result: NavigationResult = {blocked: [], checkedPairs: 0, limitations: []};
  const radius = navigationAssumptions.passageWidthMetres / 2;
  const walls = solidWalls(scene);
  for (const room of scene.rooms) {
    const entries = scene.openings.filter(o => o.kind === 'door').flatMap(opening => {
      const {center, normal, wall} = openingPosition(scene, opening), offset = wall.thickness / 2 + radius + 0.15;
      const positions = [-1, 1].map(sign => ({x: center.x + sign * normal.x * offset, y: center.y + sign * normal.y * offset}));
      return positions.filter(point => inside(point, room.polygon)).slice(0, 1).map(point => ({id: opening.id, point}));
    });
    if (entries.length < 2) { result.limitations.push(`${room.id}：少于两个已定义门洞，只检查门口占用，不宣称全屋路线已连通。`); continue; }
    if (entries.length > 12) { result.limitations.push(`${room.id}：门洞过多，门间路径分析需单独指定路线。`); continue; }
    const minX = Math.min(...room.polygon.map(p => p.x)), maxX = Math.max(...room.polygon.map(p => p.x));
    const minY = Math.min(...room.polygon.map(p => p.y)), maxY = Math.max(...room.polygon.map(p => p.y));
    const step = navigationAssumptions.navigationGridMetres;
    const width = Math.ceil((maxX - minX) / step), height = Math.ceil((maxY - minY) / step), count = width * height;
    if (count > navigationAssumptions.maximumRoomCells) { result.limitations.push(`${room.id}：超出精细路径网格上限，未执行门间路径分析。`); continue; }
    const point = (i: number): XY => ({x: minX + (i % width + 0.5) * step, y: minY + (Math.floor(i / width) + 0.5) * step});
    const baseline = new Uint8Array(count), current = new Uint8Array(count);
    const items = scene.items.filter(item => item.height > 0.1);
    for (let i = 0; i < count; i++) {
      const p = point(i);
      const free = inside(p, room.polygon) && boundaryDistance(p, room.polygon) >= radius &&
        !walls.some(w => segmentDistance(p, w.a, w.b) < radius + w.thickness / 2);
      baseline[i] = free ? 1 : 0;
      current[i] = free && !items.some(item => footprintDistance(p, item) < radius) ? 1 : 0;
    }
    function nearest(p: XY) {
      let best = -1, distance = 0.55;
      for (let i = 0; i < count; i++) {
        if (!baseline[i]) continue;
        const q = point(i), d = Math.hypot(q.x - p.x, q.y - p.y);
        if (d < distance) { distance = d; best = i; }
      }
      return best;
    }
    function route(grid: Uint8Array, start: number, end: number): XY[] | null {
      if (start < 0 || end < 0 || !grid[start] || !grid[end]) return null;
      const previous = new Int32Array(count).fill(-1), queue = new Int32Array(count);
      let head = 0, tail = 1; queue[0] = start; previous[start] = start;
      while (head < tail) {
        const index = queue[head++];
        if (index === end) {
          const path = []; let cursor = end;
          while (cursor !== start) { path.push(point(cursor)); cursor = previous[cursor]; }
          path.push(point(start)); return path.reverse();
        }
        const x = index % width, y = Math.floor(index / width);
        for (const [nx, ny] of [[x + 1, y], [x - 1, y], [x, y + 1], [x, y - 1]]) {
          if (nx < 0 || nx >= width || ny < 0 || ny >= height) continue;
          const next = ny * width + nx;
          if (!grid[next] || previous[next] !== -1) continue;
          previous[next] = index; queue[tail++] = next;
        }
      }
      return null;
    }
    for (let i = 0; i < entries.length; i++) for (let j = i + 1; j < entries.length; j++) {
      const start = nearest(entries[i].point), end = nearest(entries[j].point);
      const before = route(baseline, start, end);
      if (!before) { result.limitations.push(`${room.id}/${entries[i].id}/${entries[j].id}：空房基线未找到通道，需先核对门洞/边界，不归因于家具。`); continue; }
      result.checkedPairs++;
      if (route(current, start, end)) continue;
      const blockerIds = items.filter(item => before.some(p => footprintDistance(p, item) < radius)).map(item => item.id).sort();
      // Keep the actual obstructed baseline route, compressing only collinear steps.
      const points = before.filter((p, k) => k === 0 || k === before.length - 1 ||
        Math.abs((p.x - before[k - 1].x) * (before[k + 1].y - p.y) - (p.y - before[k - 1].y) * (before[k + 1].x - p.x)) > 1e-8);
      result.blocked.push({roomId: room.id, openingIds: [entries[i].id, entries[j].id], points, blockerIds});
    }
  }
  return result;
}
