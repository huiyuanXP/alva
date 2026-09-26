import {saveProjectWithReview} from './service.js';
import type {FastifyInstance} from 'fastify';
import {z} from 'zod';
import {DomainError, validateScene} from '../model.js';
import type {AlvaStore, Session} from '../store.js';

const Save = z.object({
  requestId: z.string().uuid(),
  expectedRevision: z.number().int().min(0),
  confirmed: z.literal(true),
}).strict();

export function registerSnapshots(app: FastifyInstance, store: AlvaStore, session: (req: object) => Session) {
  app.post('/api/save', async req => {
    const owner = session(req);
    if (owner.role !== 'owner') throw new DomainError(403, '仅业主可保存全局快照');
    const command = Save.parse(req.body);
    const project=await saveProjectWithReview(store,owner.projectId,command.requestId,command.expectedRevision,command);
    const saveReceipt = await store.saveReceipt(owner.projectId, command.requestId);
    return {...project, saveReceipt};
  });
}
