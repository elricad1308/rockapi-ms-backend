import { type FastifyInstance } from 'fastify'
import { fetchExperimentZodSchema, listExperimentZodSchema } from '../schemas/experiment.schema.js'
import { fetchHandler, listHandler, saveHandler, processFilesHandler } from '../controllers/experiment.controller.js'
import { type ZodTypeProvider } from 'fastify-type-provider-zod'

export async function experimentRoutes(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'get',
    url: '/',
    schema: listExperimentZodSchema,
    handler: listHandler,
    onRequest: fastify.authenticate
  })

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'get',
    url: '/:id',
    schema: fetchExperimentZodSchema,
    handler: fetchHandler,
    onRequest: fastify.authenticate
  })

  fastify.route({
    method: 'post',
    url: '/save',
    handler: saveHandler,
    onRequest: fastify.authenticate
  })

  fastify.route({
    method: 'get',
    url: '/process/:id',
    sse: true,
    handler: processFilesHandler
  })
}

