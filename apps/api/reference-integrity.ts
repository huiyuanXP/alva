import type { NativeScene, ProjectData } from '../../packages/contracts/index.js';

type Furniture = NativeScene['floors'][number]['furniture'][number];

/** Confirmation stores physical dimensions; independent scale factors are unsupported. */
export function hasUnitScale(item: Furniture): boolean {
  return item.scale.x === 1 && item.scale.y === 1 && item.scale.z === 1;
}

/**
 * Validate the final transaction state, not a browser-provided scope.
 * Pending references may remain out of bounds for diagnosis, but an accepted
 * reference cannot silently move its existing confirmed requirement to a room
 * or floor that the owner did not confirm.
 */
export function acceptedReferenceIssue(p: ProjectData): string | undefined {
  for (const floor of p.scene.floors) {
    for (const item of floor.furniture) {
      if (!item.suggestion_id || item.reference_status !== 'accepted') continue;
      if (!hasUnitScale(item)) {
        return '已采用参考家具不支持独立缩放，请使用家具属性编辑器修改实际尺寸。';
      }
      if (['width', 'depth', 'height'].some(key => typeof item[key] !== 'number' || !Number.isFinite(item[key]) || Number(item[key]) <= 0)) {
        return '已采用参考家具必须保留明确的宽度、进深与高度，不能用目录默认值替换确认记录。';
      }
      const room = p.rooms.find(r => r.id === item.room_id);
      const containing = p.rooms.filter(r => r.floor_id === floor.id &&
        item.position.x >= r.bounds.x && item.position.x < r.bounds.x + r.bounds.width &&
        item.position.y >= r.bounds.y && item.position.y < r.bounds.y + r.bounds.depth);
      if (!room || room.floor_id !== floor.id || containing.length !== 1 || containing[0].id !== room.id) {
        return '已采用参考家具不能跨房间或楼层移动；需要单独确认转移，当前操作未保存。';
      }
      const requirements = p.requirements.filter(r => r.field_key === `furniture:${item.id}`);
      if (requirements.length !== 1 || requirements[0].room_id !== room.id) {
        return '参考家具与已确认房间需求不一致，当前操作未保存，请重新核对。';
      }
    }
  }
  return undefined;
}
