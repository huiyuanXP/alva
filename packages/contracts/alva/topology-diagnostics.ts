/** Read-only findings referencing existing walls, openings and rooms. */
export type PlanPoint = { x: number; y: number };
export type TopologyWarningCode = 'internal_void' | 'unreasonable_skew' | 'isolated_component' | 'invalid_opening' | 'open_boundary' | 'invalid_geometry';
export type TopologyWarning = {
  id: string;
  code: TopologyWarningCode;
  severity: 'warning' | 'error';
  message: string;
  wallIds: string[];
  openingIds: string[];
  roomIds: string[];
  location: PlanPoint | null;
  bounds: { minX: number; minY: number; maxX: number; maxY: number } | null;
  rings?: PlanPoint[][];
  areaM2?: number;
  angleDegrees?: number;
  deviationDegrees?: number;
};
export type TopologyDiagnostics = {
  version: 'alva-topology-quality-v1';
  status: 'complete' | 'partial' | 'empty';
  issues: TopologyWarning[];
  checks: {
    internalVoid: 'complete' | 'partial' | 'unavailable';
    orientation: 'complete' | 'partial' | 'unavailable';
    connectivity: 'complete' | 'unavailable';
  };
  thresholds: { connectionM: number; minVoidM2: number; skewDegrees: number; minWallM: number };
  measurements: {
    enclosedAreaM2: number; undefinedAreaM2: number; wallComponents: number;
    dominantAngleDegrees: number | null; orientationSupport: number;
  };
  calibrated: boolean;
  notes: string[];
};
export type TopologyDiagnosticsResponse = {
  projectId: string; revision: number; source: 'candidate' | 'scene' | 'none';
  sceneFingerprint: string | null; analysis: TopologyDiagnostics;
};
