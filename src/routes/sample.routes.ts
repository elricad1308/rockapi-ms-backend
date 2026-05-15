import { type FastifyInstance } from 'fastify'
import { type ZodTypeProvider } from 'fastify-type-provider-zod'
import { fetchHandler } from '../controllers/sample.controller.js'
import { fetchSampleZodSchema } from '../schemas/sample.schema.js'

export async function sampleRoutes(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'get',
    url: '/:id',
    schema: fetchSampleZodSchema,
    handler: fetchHandler,
    onRequest: fastify.authenticate
  })
}
