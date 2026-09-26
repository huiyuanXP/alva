import {validateScene, type Project, type ItemData} from '../model.js';
import type {UserContextEntry, UserContextReadResult} from '../../packages/contracts/alva/user-context.js';
import type {LayoutReviewFinding, LayoutReviewKind, LayoutReviewResult} from '../../packages/contracts/alva/layout-review.js';
import {assertUserContextCurrent, ContextProjectionError} from '../user-context/index.js';
import {fingerprint} from '../user-context/projection.js';
import {footprintInRoom, openingPosition, overlaps} from './geometry.js';
import {checkRoomRoutes, navigationAssumptions} from './navigation.js';

const kinds: LayoutReviewKind[] = ['geometry', 'navigation', 'behavior', 'requirement', 'furniture'];
const unique = (values: string[]) => [...new Set(values)].sort();
export const layoutSceneFingerprint = (project: Project) => fingerprint({scene: project.scene,
  roomStyles:project.roomStyles,
  assets: project.assets.map(asset => ({id: asset.id, license: asset.license}))});
const inScope = (entry: UserContextEntry, item: ItemData) =>
  (!entry.roomIds.length || entry.roomIds.includes(item.roomId)) && (!entry.objectIds.length || entry.objectIds.includes(item.id));
function positive(entries: UserContextEntry[], item: ItemData, yes: RegExp, no: RegExp) {
  // Match sourced user words, never a model summary that invents a habit absent from the quote.
  return entries.filter(entry => inScope(entry, item) && yes.test(entry.quote) && !no.test(entry.quote));
}

export function runLayoutReview(project: Project, context: UserContextReadResult): LayoutReviewResult {
  assertUserContextCurrent(project, context);
  if (!project.scene) throw new ContextProjectionError('REVIEW_SCENE_REQUIRED', '尚无当前布局，不能报告布局审查已通过。');
  let scene;
  try { scene = validateScene(project.scene); }
  catch { throw new ContextProjectionError('REVIEW_SCENE_INVALID', '当前布局的几何或对象引用无效，请先修复布局。'); }
  const entries = context.entries.filter(entry => entry.status === 'confirmed');
  const findings: LayoutReviewFinding[] = [];
  function add(ruleId: string, kind: LayoutReviewFinding['kind'], title: string, reason: string, suggestion: string,
    objectIds: string[], roomIds: string[], sources: UserContextEntry[] = [],
    confidence: LayoutReviewFinding['confidence'] = 'medium', path?: LayoutReviewFinding['path']) {
    const targetIds = unique(objectIds), rooms = unique(roomIds), contextIds = unique(sources.map(entry => entry.id));
    findings.push({id: 'review-' + fingerprint({ruleId, targetIds, rooms, contextIds, path}).slice(0, 24),
      ruleId, kind, title, reason, suggestion, objectIds: targetIds, roomIds: rooms, contextEntryIds: contextIds,
      evidenceIds: unique(sources.flatMap(entry => entry.sourceEvidenceIds)), confidence, status: 'pending', ...(path ? {path} : {})});
  }
  for (const item of scene.items) {
    const room = scene.rooms.find(room => room.id === item.roomId)!;
    if (!footprintInRoom(item, room.polygon)) add('footprint-outside-room', 'geometry', '家具占地超出所属房间',
      `${item.name}旋转后的完整占地超出${room.name}；家具中心位于室内也不能排除此问题。`,
      '移动、旋转或调整尺寸；确需移到其他房间时使用跨房间转移。', [item.id], [room.id], [], 'high');
    for (const other of scene.items) {
      if (item.id >= other.id || item.height <= 0.1 || other.height <= 0.1 || !overlaps(item, other)) continue;
      add('footprints-overlap', 'geometry', '家具二维占地重叠', `${item.name}与${other.name}的旋转占地相交；上下放置关系未建模。`,
        '调整摆放或补充上下放置依据，再检查实际使用空间。', [item.id, other.id], [item.roomId, other.roomId], [], 'high');
    }
    const coffee = positive(entries, item, /(?:喝|做|冲|煮|制作).{0,3}咖啡|每天(?:早晨|上午)?咖啡|咖啡(?:机|操作台)|(?:make|drink|daily).{0,8}coffee/i,
      /不喝咖啡|不需要咖啡|没有咖啡|不做咖啡|不再喝咖啡|no coffee|don't drink coffee/i);
    const pets = positive(entries, item, /(?:有|养|饲养).{0,4}(?:宠物|狗|猫)|(?:宠物|狗|猫).{0,6}玩具|(?:have|own|keep).{0,8}(?:pets?|dogs?|cats?)|(?:pets?|dogs?|cats?).{0,6}toys?/i,
      /不养|没有宠物|无宠物|不需要宠物|不再养|no pets|no dogs|no cats/i);
    const plants = positive(entries, item, /绿植|植物|采光|光照|plant|daylight/i, /不要绿植|不需要绿植|没有植物|不养植物|no plants/i);
    if (coffee.length && item.assetId === 'alva-table' && item.width < 0.8) add('coffee-worktop', 'furniture', '咖啡操作空间待补充',
      `当前台面宽${item.width.toFixed(2)}米；结合用户咖啡习惯，设备之外的磨粉、压粉和清洁区域尚未明确。0.8米只是本演示筛查值。`,
      '核对实际设备尺寸与操作顺序，补充侧方操作面。', [item.id], [room.id], coffee);
    if (pets.length && item.assetId === 'alva-sofa' && item.clearance >= 0.06 && item.clearance <= 0.22) add('pet-toy-clearance', 'behavior', '宠物玩具可能滚入沙发底',
      `沙发底部空隙约${item.clearance.toFixed(2)}米；若玩具更小，取回可能不便。未取得玩具尺寸，不断言必然发生。`,
      '确认玩具直径与清洁方式，比较贴地底座或可拆挡条。', [item.id], [room.id], pets);
    if (plants.length && item.assetId === 'alva-plant' && item.height > 1.4) {
      const near = scene.openings.filter(opening => opening.kind === 'window').filter(opening => {
        const {center} = openingPosition(scene!, opening); return Math.hypot(item.x - center.x, item.y - center.y) < 0.8;
      });
      if (near.length) add('plant-daylight', 'requirement', '高绿植可能与采光需求冲突',
        '高绿植接近窗洞；这只是空间筛查，未计算植物叶面积和真实光照，遮挡程度仍需核对。',
        '降低植物高度或移到窗侧，结合实际窗向和日照预览比较。', [item.id, ...near.map(o => o.id)], [room.id], plants);
    }
    const avoidedMaterial: Record<string, RegExp> = {
      glass: /(?:不要|不喜欢|避免|不用).{0,8}玻璃/,
      stone: /(?:不要|不喜欢|避免|不用).{0,8}(?:石材|大理石)/,
      metal: /(?:不要|不喜欢|避免|不用).{0,8}金属/,
      fabric: /(?:不要|不喜欢|避免|不用).{0,8}布艺/,
      wood: /(?:不要|不喜欢|避免|不用).{0,8}(?:木质|木材|实木)/,
    };
    const materialSources = entries.filter(entry => entry.category === 'preferences' && inScope(entry, item) && avoidedMaterial[item.material]?.test(entry.quote));
    if (materialSources.length) add('material-preference-conflict', 'behavior', '当前材质与已确认偏好不同',
      `${item.name}的材质标记为${item.material}，与此范围内用户明确表达的避用偏好不同；不推断材料真实性或性能。`,
      '让用户比较替代材质，明确保留或调整的取舍。', [item.id], [room.id], materialSources);
    if (item.material === 'stone' || item.material === 'glass') add('material-support-unknown', 'professional', '材料支撑待专业核实',
      '缺少重量、连接、安装与支撑资料，无法判断承载是否成立，也不能断言失效。',
      '由设计师或相关专业人员补齐材料和支撑依据；生活偏好取舍不能关闭此项。', [item.id], [room.id], [], 'low');
  }
  const avoidedSurface:Record<string,RegExp>={wood:/(?:不要|不喜欢|避免|不用).{0,8}(?:木质|木材|实木)/,stone:/(?:不要|不喜欢|避免|不用).{0,8}(?:石材|大理石)/,tile:/(?:不要|不喜欢|避免|不用).{0,8}(?:瓷砖|地砖)/,concrete:/(?:不要|不喜欢|避免|不用).{0,8}(?:水泥|混凝土)/};
  for(const [roomId,style] of Object.entries(project.roomStyles||{}))for(const surface of ['wall','floor'] as const){
   const sources=entries.filter(e=>e.category==='preferences'&&(!e.roomIds.length||e.roomIds.includes(roomId))&&avoidedSurface[style[surface].material]?.test(e.quote));
   if(sources.length)add('room-'+surface+'-material-preference','behavior','房间表面材质与已确认偏好不同',`${surface==='wall'?'墙面':'地面'}视觉材质标记为${style[surface].material}，与本房间的避用偏好不同。`,'比较其他表面候选或明确记录保留理由；不推断实际材料性能。',[],[roomId],sources);
  }
  // Only literal, confirmed functional requests with supported asset names are tested.
  const requiredAssets = [{pattern: /(?:需要|必须有|保留).{0,8}(?:书桌|工作台)/, asset: 'alva-table', label: '书桌/操作台'},
    {pattern: /(?:需要|必须有|保留).{0,8}收纳柜/, asset: 'alva-cabinet', label: '收纳柜'},
    {pattern: /(?:需要|必须有|保留).{0,8}咖啡机/, asset: 'alva-coffee', label: '咖啡机'}];
  for (const entry of entries.filter(entry => entry.category === 'requirements' && !entry.objectIds.length)) {
    for (const requirement of requiredAssets) {
      if (!requirement.pattern.test(entry.quote) || /(?:不需要|无需|不必)/.test(entry.quote)) continue;
      const rooms = entry.roomIds.length ? entry.roomIds : scene.rooms.map(room => room.id);
      if (!rooms.every(id => scene!.rooms.some(room => room.id === id))) continue;
      if (!scene.items.some(item => rooms.includes(item.roomId) && item.assetId === requirement.asset)) add('missing-' + requirement.asset,
        'requirement', `尚未表达${requirement.label}需求`, '已确认的使用需求在当前许可家具实例中尚未体现；这不等于必须自动添加家具。',
        '核对用户是否仍需要该功能，再展示候选并由用户确认。', [], rooms, [entry]);
    }
  }
  for (const door of scene.openings.filter(opening => opening.kind === 'door')) {
    const {center, wall, tangent} = openingPosition(scene, door);
    const passage = {x: center.x, y: center.y, width: door.width, depth: wall.thickness + navigationAssumptions.passageWidthMetres * 2,
      rotation: Math.atan2(tangent.y, tangent.x) * 180 / Math.PI};
    const near = scene.items.filter(item => item.height > 0.1 && overlaps(item, passage));
    if (near.length) add('doorway-encroachment', 'navigation', '门口通行区域与家具相交',
      '家具占地与门洞两侧的筛查区域相交；尚无门扇开启方向，不能据此断言开门必然受阻。',
      '定位门口家具，核对开门方向及实际通道后调整。', [door.id, ...near.map(item => item.id)], near.map(item => item.roomId), [], 'medium',
      {openingIds: [door.id], points: [center], clearanceMetres: navigationAssumptions.passageWidthMetres});
  }
  const navigation = checkRoomRoutes(scene);
  for (const route of navigation.blocked) add('door-route-blocked', 'navigation', '家具布局中未找到门间通路',
    '相同网格和通行宽度假设下，移除家具的基线可连接这两个门洞，当前家具布局未找到连接路径。不是法规合规结论。',
    '沿标出的基线路径检查阻挡家具，调整后重新复核；窄处仍需实测。', [...route.openingIds, ...route.blockerIds], [route.roomId], [], 'medium',
    {openingIds: route.openingIds, points: route.points, clearanceMetres: navigationAssumptions.passageWidthMetres});
  findings.sort((a, b) => a.id.localeCompare(b.id, 'en'));
  const sceneFingerprint = layoutSceneFingerprint(project), contextFingerprint = context.manifest.sourceFingerprint;
  const methods: Record<LayoutReviewKind, string> = {
    geometry: '旋转占地、凹多边形边界与分离轴重叠；未模拟三维上下关系。',
    navigation: `门洞矩形占用及门间网格连通；实际比较${navigation.checkedPairs}组门洞。`,
    behavior: '仅检查原话中明确的宠物行为及避用材质偏好；未建模的风格不推断。',
    requirement: '已确认采光偏好与近窗植物，以及明确的受支持功能需求。',
    furniture: '咖啡操作台筛查；真实设备尺寸、人体尺度和家具支撑仍待补充。',
  };
  const checks = Object.fromEntries(kinds.map(kind => [kind, {
    status: (kind === 'navigation' && navigation.limitations.length) ||
      (['behavior', 'requirement', 'furniture'].includes(kind) && !entries.length) ? 'needs_information' : 'checked',
    findingIds: findings.filter(f => f.kind === kind).map(f => f.id), method: methods[kind],
  }])) as LayoutReviewResult['checks'];
  return {schemaVersion: 1, algorithmVersion: 'alva-layout-review-v1', id: 'layout-review-' + fingerprint({projectId: project.id,
    projectRevision: project.revision, sceneFingerprint, contextFingerprint, findings}).slice(0, 24),
    projectId: project.id, projectRevision: project.revision, sceneFingerprint, contextFingerprint, findings, checks,
    decisions: [], assumptions: {...navigationAssumptions}, limitations: [
      '此审查为可解释的 Demo 筛查，不是施工、结构、无障碍或消防合规结论；零提示不代表设计安全。',
      '0.6米通行宽度、0.15米网格及咖啡/植物阈值为演示假设，必须结合现场尺寸核对。',
      '房间风格标签、门扇开启、家具上下放置、设备实测尺寸未全部建模，不据此声称全面评估。',
      ...navigation.limitations,
    ]};
}

/** A review-only commit or save may raise revision without changing its actual inputs. */
export function isLayoutReviewCurrent(project: Project, context: UserContextReadResult, review: LayoutReviewResult) {
  try { assertUserContextCurrent(project, context); } catch { return false; }
  return review.schemaVersion === 1 && review.algorithmVersion === 'alva-layout-review-v1' &&
    review.projectId === project.id && review.projectRevision <= project.revision && review.projectRevision >= 0 &&
    review.sceneFingerprint === layoutSceneFingerprint(project) && review.contextFingerprint === context.manifest.sourceFingerprint;
}
