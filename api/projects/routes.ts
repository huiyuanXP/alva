import type {FastifyInstance} from 'fastify';
import type {AlvaStore,Session} from '../store.js';
import {listProjects,navigateProject,prepareNavigation} from './service.js';
export function registerProjects(app:FastifyInstance,store:AlvaStore,session:(req:object)=>Session){
 app.get('/api/projects',async req=>({projects:await listProjects(store,session(req)),currentProjectId:session(req).projectId}));
 app.post('/api/projects/prepare',async req=>prepareNavigation(store,session(req),req.body));
 app.post('/api/projects/navigate',async req=>navigateProject(store,req.cookies.alva_session||'',session(req),req.body));
}
