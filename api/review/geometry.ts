import {pointInPolygon, type ItemData, type SceneData, type XY} from '../model.js';

export type Footprint = Pick<ItemData, 'x' | 'y' | 'width' | 'depth' | 'rotation'>;
const epsilon = 1e-7;
export function segmentDistance(point: XY, a: XY, b: XY) {
  const dx = b.x - a.x, dy = b.y - a.y, size = dx * dx + dy * dy;
  const t = size ? Math.max(0, Math.min(1, ((point.x - a.x) * dx + (point.y - a.y) * dy) / size)) : 0;
  return Math.hypot(point.x - a.x - t * dx, point.y - a.y - t * dy);
}
export const boundaryDistance = (point: XY, polygon: XY[]) => Math.min(...polygon.map((a, index) =>
  segmentDistance(point, a, polygon[(index + 1) % polygon.length])));
export const inside = (point: XY, polygon: XY[]) => pointInPolygon(point, polygon) || boundaryDistance(point, polygon) < epsilon;
export function corners(item: Footprint): XY[] {
  const radians = item.rotation * Math.PI / 180, cos = Math.cos(radians), sin = Math.sin(radians);
  return [[-1, -1], [1, -1], [1, 1], [-1, 1]].map(([x, y]) => ({
    x: item.x + x * item.width / 2 * cos - y * item.depth / 2 * sin,
    y: item.y + x * item.width / 2 * sin + y * item.depth / 2 * cos,
  }));
}
const cross = (a: XY, b: XY, c: XY) => (b.x - a.x) * (c.y - a.y) - (b.y - a.y) * (c.x - a.x);
function crosses(a: XY, b: XY, c: XY, d: XY) {
  return cross(a, b, c) * cross(a, b, d) < -epsilon && cross(c, d, a) * cross(c, d, b) < -epsilon;
}
export function footprintInRoom(item: Footprint, polygon: XY[]) {
  const points = corners(item);
  if (!points.every(point => inside(point, polygon))) return false;
  // Corner-only checks miss a rectangular footprint bridging the notch of a concave room.
  return points.every((a, index) => {
    const b = points[(index + 1) % points.length];
    if (!inside({x: (a.x + b.x) / 2, y: (a.y + b.y) / 2}, polygon)) return false;
    return !polygon.some((c, j) => crosses(a, b, c, polygon[(j + 1) % polygon.length]));
  });
}
export function overlaps(a: Footprint, b: Footprint, tolerance = 0.01) {
  const A = corners(a), B = corners(b);
  for (const item of [a, b]) {
    const radians = item.rotation * Math.PI / 180;
    for (const axis of [{x: Math.cos(radians), y: Math.sin(radians)}, {x: -Math.sin(radians), y: Math.cos(radians)}]) {
      const ap = A.map(p => p.x * axis.x + p.y * axis.y), bp = B.map(p => p.x * axis.x + p.y * axis.y);
      if (Math.min(Math.max(...ap), Math.max(...bp)) - Math.max(Math.min(...ap), Math.min(...bp)) <= tolerance) return false;
    }
  }
  return true;
}
export function footprintDistance(point: XY, item: Footprint) {
  const angle = -item.rotation * Math.PI / 180;
  const x = (point.x - item.x) * Math.cos(angle) - (point.y - item.y) * Math.sin(angle);
  const y = (point.x - item.x) * Math.sin(angle) + (point.y - item.y) * Math.cos(angle);
  return Math.hypot(Math.max(0, Math.abs(x) - item.width / 2), Math.max(0, Math.abs(y) - item.depth / 2));
}
export function openingPosition(scene: SceneData, opening: SceneData['openings'][number]) {
  const wall = scene.walls.find(w => w.id === opening.wallId)!;
  const length = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y);
  const tangent = {x: (wall.b.x - wall.a.x) / length, y: (wall.b.y - wall.a.y) / length};
  return {wall, tangent, normal: {x: -tangent.y, y: tangent.x}, center: {
    x: wall.a.x + (wall.b.x - wall.a.x) * opening.offset,
    y: wall.a.y + (wall.b.y - wall.a.y) * opening.offset,
  }};
}

/** Solid wall segments subtract actual door widths; windows remain impassable walls. */
export function solidWalls(scene: SceneData) {
  return scene.walls.flatMap(wall => {
    const length = Math.hypot(wall.b.x - wall.a.x, wall.b.y - wall.a.y);
    const doors = scene.openings.filter(o => o.wallId === wall.id && o.kind === 'door')
      .map(o => [Math.max(0, o.offset - o.width / 2 / length), Math.min(1, o.offset + o.width / 2 / length)])
      .sort((a, b) => a[0] - b[0]);
    const intervals: number[][] = []; let cursor = 0;
    for (const [start, end] of doors) { if (start > cursor) intervals.push([cursor, start]); cursor = Math.max(cursor, end); }
    if (cursor < 1) intervals.push([cursor, 1]);
    const point = (t: number) => ({x: wall.a.x + (wall.b.x - wall.a.x) * t, y: wall.a.y + (wall.b.y - wall.a.y) * t});
    return intervals.map(([start, end]) => ({id: wall.id, a: point(start), b: point(end), thickness: wall.thickness}));
  });
}
