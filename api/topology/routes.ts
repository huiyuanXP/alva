import type {FastifyInstance} from 'fastify';
import type {AlvaStore,Session} from '../store.js';
import {topologyDiagnosticsFor} from './inspection.js';
import type {TopologyDiagnosticsResponse} from '../../packages/contracts/alva/topology-diagnostics.js';

/** GET only: diagnostics never update a revision, calibration or snapshot. */
export function registerTopologyDiagnostics(app:FastifyInstance,store:AlvaStore,session:(req:object)=>Session){
 app.get('/api/topology/diagnostics',async (req):Promise<TopologyDiagnosticsResponse>=>{
  return topologyDiagnosticsFor(await store.get(session(req).projectId));
 });
}
