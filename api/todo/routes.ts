import type {FastifyInstance} from 'fastify';
import {readFileSync} from 'node:fs';
import {resolve} from 'node:path';
import {boardPayload} from './board.js';
export function registerTodo(app: FastifyInstance, root = process.cwd()) {
  app.get('/todo/api/board', async (_req, reply) => {
    reply.header('Cache-Control', 'no-store');
    return boardPayload(root);
  });
  for (const url of ['/todo', '/todo/']) app.get(url, async (_req, reply) => reply
    .header('Cache-Control', 'no-store')
    .header('Content-Security-Policy', "default-src 'self'; script-src 'self' 'unsafe-inline' https://static.cloudflareinsights.com; connect-src 'self' https://cloudflareinsights.com; style-src 'self' 'unsafe-inline'; frame-ancestors 'none'")
    .type('text/html; charset=utf-8').send(readFileSync(resolve(root, 'web/todo/index.html'))));
  app.get('/todo/*', async (_req, reply) => reply.code(404).send({error: '看板地址不存在'}));
}
