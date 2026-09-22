import type {FastifyInstance} from 'fastify';
import {createHash} from 'node:crypto';
import type {AlvaStore,Session} from '../store.js';
import {analyzeTopology} from './diagnostics.js';
import type {TopologyDiagnosticsResponse} from '../../packages/contracts/alva/topology-diagnostics.js';

/** GET only: diagnostics never update a revision, calibration or snapshot. */
export function registerTopologyDiagnostics(app:FastifyInstance,store:AlvaStore,session:(req:object)=>Session){
 app.get('/api/topology/diagnostics',async (req):Promise<TopologyDiagnosticsResponse>=>{
  const p=await store.get(session(req).projectId),scene=p.candidate||p.scene;
  return {
   projectId:p.id,revision:p.revision,source:p.candidate?'candidate':p.scene?'scene':'none',
   sceneFingerprint:scene?createHash('sha256').update(JSON.stringify(scene)).digest('hex'):null,
   analysis:analyzeTopology(scene)
  };
 });
}
