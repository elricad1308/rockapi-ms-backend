import { type FastifyInstance } from 'fastify';
import { ping } from '../controllers/test.controller.js'

export async function testRoutes(fastify: FastifyInstance) {
  fastify.get('/ping', ping);

  fastify.log.info('test routes registered')
}
