import type {Project, SceneData} from '../../../api/model.js';
import type {BuildingSceneData} from '../../../api/building/types.js';

export function snapshotScene(): SceneData {
  const points = [{x: 0, y: 0}, {x: 5, y: 0}, {x: 5, y: 4}, {x: 0, y: 4}];
  return {
    walls: points.map((a, i) => ({id: `wall-${i}`, a, b: points[(i + 1) % 4], thickness: .15, height: 2.8,
      structural: 'unknown', evidence: []})),
    rooms: [{id: 'room', name: '合成验收客厅', purpose: '阅读与休息', polygon: points, locked: false}],
    openings: [{id: 'door', wallId: 'wall-2', kind: 'door', offset: .5, width: .9, height: 2.1, sill: 0}],
    items: [{id: 'table', assetId: 'alva-table', roomId: 'room', name: '阅读桌', x: 2, y: 2, width: 1.4,
      depth: .65, height: .75, rotation: 0, color: '#b49a75', material: 'wood', clearance: 0, locked: false}],
    calibration: {wallId: 'wall-0', length: 5, source: 'ALVA-036 合成测量，非客户户型', confirmed: true},
    geography: {latitude: 31, north: 0, assumption: '合成验收地理假设'},
  };
}

/** Entirely synthetic. This fixture tests persistence, not model generation quality. */
export function seedSnapshotProject(p: Project): void {
  const scene = snapshotScene(), fingerprint = 'a'.repeat(64), time = '2026-09-25T00:00:00.000Z';
  const building: BuildingSceneData = {units: 'meters', topologyVersion: 1, topologyFingerprint: fingerprint,
    camera: {position: {x: 9, y: 10, z: 9}, target: {x: 2.5, y: 0, z: 2}},
    components: [
      {id: 'floor', kind: 'floor', topologyId: 'room', position: {x: 2.5, y: -.05, z: 2},
        size: {x: 5, y: .1, z: 4}, rotation: 0, material: 'floor', color: '#e5dfcf'},
      ...scene.walls.map(w => ({id: `3d-${w.id}`, kind: 'wall' as const, topologyId: w.id,
        position: {x: (w.a.x + w.b.x) / 2, y: w.height / 2, z: (w.a.y + w.b.y) / 2},
        size: {x: Math.hypot(w.b.x - w.a.x, w.b.y - w.a.y), y: w.height, z: w.thickness},
        rotation: Math.atan2(w.b.y - w.a.y, w.b.x - w.a.x), material: 'plaster' as const, color: '#ccccbb'})),
      {id: '3d-door', kind: 'door-frame', topologyId: 'door', position: {x: 2.5, y: 1.05, z: 4},
        size: {x: .9, y: 2.1, z: .15}, rotation: Math.PI, material: 'wood', color: '#b49a75'},
    ]};
  p.scene = scene;
  p.confirmedTopology = {id: 'topology', version: 1, sourceFingerprint: fingerprint, scene: structuredClone(scene),
    calibration: scene.calibration!, assumptions: ['合成保存测试'], confirmedAt: time};
  p.topologyVersions = [structuredClone(p.confirmedTopology)];
  p.confirmedBuilding = building;
  p.buildingCandidate = structuredClone(building);
  p.buildingState = {status: 'confirmed', attempts: 1, topologyVersion: 1, topologyFingerprint: fingerprint, updatedAt: time};
  p.answers = [{questionId: 'Q01', roomId: null, text: '希望安静阅读', state: 'answered', locked: true, confirmed: true, evidenceId: 'quote'},
    {questionId: 'Q25', roomId: 'room', text: '', state: 'unknown', locked: false, confirmed: true, evidenceId: 'unknown-quote'}];
  p.evidence = [{id: 'quote', quote: '我希望有一个安静阅读的角落。', source: 'questionnaire', createdAt: time},
    {id: 'unknown-quote', quote: '暂时不确定客厅还有什么用途。', source: 'chat', roomId: 'room', createdAt: time}];
  p.messages = [{id: 'message', role: 'user', text: p.evidence[0].quote, status: 'completed', createdAt: time}];
  p.findings = [{id: 'choice', kind: 'requirement', title: '已确认的取舍', reason: '优先保留阅读角', suggestion: '继续核实尺寸',
    objectIds: ['table'], roomIds: ['room'], evidenceIds: ['quote'], confidence: 'high', status: 'acknowledged', stage: 'review'},
    {id: 'professional', kind: 'professional', title: '材料资料待核实', reason: '未提供专业资料', suggestion: '交给设计师核实',
      objectIds: [], roomIds: ['room'], evidenceIds: [], confidence: 'low', status: 'pending', stage: 'review'}];
  p.proposals = [{id: 'proposal', title: '保留阅读角', rationale: '按业主原话', evidenceIds: ['quote'], baseRevision: p.revision + 1,
    changes: [{action: 'purpose', targetId: 'room', values: {purpose: '阅读室'}}], status: 'proposed'}];
  p.changes = [{id: 'decision', description: '保留阅读角的取舍依据', evidenceIds: ['quote'], context: ['业主确认'], createdAt: time}];
  p.intakeProgress = {drafts: [{questionId: 'Q02', roomId: null, text: '尚未确认的问卷草稿', state: 'answered'}],
    cursor: {questionId: 'Q02', roomId: null}, updatedAt: time};
  p.roomLabelPositions = {room: {x: 2.5, y: 2}};
  p.lastAnalysisEvidence = 1;
  Object.assign(p, {pendingAnswers: [{id: 'pending', questionId: 'Q03', roomId: null, text: '待确认', quote: '待确认原话'}],
    questionCards: [{questionId: 'Q04', roomId: null, reason: '待追问'}], referencePreferences: [{id: 'reference', status: 'pending'}]});
}
