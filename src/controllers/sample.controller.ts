import { type FastifyRequest, type FastifyReply } from 'fastify'
import { type FetchSampleInput } from '../schemas/sample.schema.js'
import { prisma } from '../config/prisma.js'

export const fetchHandler = async (request: FastifyRequest<{ Params: FetchSampleInput}>, reply: FastifyReply) => {
  const { id } = request.params

  const sample = await prisma.sample.findUnique({
    where: {
      id: id
    },
    include: {
      data: true
    }
  })

  return reply.status(200).send(sample)
}