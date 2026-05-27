import { type FastifyInstance } from 'fastify'
import { type ZodTypeProvider } from 'fastify-type-provider-zod'
import { createUserZodSchema, loginZodSchema } from '../schemas/user.schema.js'
import { createUserHandler, loginHandler, validateHandler } from '../controllers/user.controller.js'

export async function userRoutes(fastify: FastifyInstance) {
  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'post',
    url: '/login',
    schema: loginZodSchema,    
    handler: loginHandler
  })

  fastify.withTypeProvider<ZodTypeProvider>().route({
    method: 'post',
    url: '/create',
    //onRequest: [ fastify.authenticate ],
    schema: createUserZodSchema,
    handler: createUserHandler
  })

  fastify.get('/validate', validateHandler)
}