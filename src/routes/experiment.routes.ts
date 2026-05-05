import { type FastifyInstance } from 'fastify'
import { saveHandler } from '../controllers/experiment.controller.js'

export async function experimentRoutes(fastify: FastifyInstance) {
  fastify.post('/save', saveHandler)
}