import 'dotenv/config';
import cors from '@fastify/cors'
import Fastify, { type FastifyInstance, type RouteShorthandOptions, type FastifyRequest, type FastifyReply } from 'fastify';
import { serializerCompiler, validatorCompiler } from 'fastify-type-provider-zod'
import fjwt, { type FastifyJWT } from '@fastify/jwt'
import multipart from '@fastify/multipart'
import { userRoutes } from './routes/user.routes.js'
import { experimentRoutes } from './routes/experiment.routes.js'
import { sampleRoutes } from './routes/sample.routes.js'
import fastifySSE from '@fastify/sse'


const server: FastifyInstance = Fastify({ 
  logger: {
    level: 'debug',
    transport: {
      target: 'pino-pretty',
      options: {
        translateTime: 'HH:MM:ss Z',
        ignore: 'pid,hostname',
        colorize: true
      }
    }
  } 
});
const port: number = parseInt(process.env.APP_PORT ?? '3000');
const jwt_secret: string = process.env.JWT_SECRET ?? ''

// cors
server.register(cors)

// support for sse (server side events)
await server.register(fastifySSE.default)

// multipart (for file uploads)
await server.register(multipart, {
  limits: {
    fileSize: 10 * 1024 * 1024
  }
})

// jwt
server.register(fjwt, { secret: jwt_secret })
server.addHook('preHandler', (request, response, next) => {
  request.jwt = server.jwt
  return next()
})

// authentication decorator
server.decorate('authenticate', async (request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify()
  } catch (err) {
    reply.status(401).send('Inicio de sesión requerido')
  }
})

// Zod schema validators
server.setValidatorCompiler(validatorCompiler)
server.setSerializerCompiler(serializerCompiler)

// routes
server.register(userRoutes, { prefix: '/user' })
server.register(experimentRoutes, { prefix: '/experiment' })
server.register(sampleRoutes, { prefix: '/sample' })

// Gracefully shutdowns server to avoid data corruption
const listeners = ['SIGINT', 'SIGTERM']
listeners.forEach((signal) => {
  process.on(signal, async () => {
    await server.close()
    process.exit(0)
  })
})

server.listen({ port: port }, (err, address) => {
  if (err) {
    server.log.error(err);
    process.exit(1);
  }

  server.log.info(`rockapi-ms-backend listening at ${address}`);
});
