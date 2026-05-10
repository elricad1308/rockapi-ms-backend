import { type FastifyInstance } from 'fastify'
import { fetchExperimentZodSchema } from '../schemas/experiment.schema.js'
import { fetchHandler, listHandler, saveHandler } from '../controllers/experiment.controller.js'
import { type ZodTypeProvider } from 'fastify-type-provider-zod'

export async function experimentRoutes(fastify: FastifyInstance) {
  fastify.get('/', listHandler)
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'get',
    url: '/:id',
    schema: fetchExperimentZodSchema,
    handler: fetchHandler
  })
  fastify.post('/save', saveHandler)
}

