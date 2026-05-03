import { type FastifyReply, type FastifyRequest } from 'fastify';

export const ping = async (request: FastifyRequest, reply: FastifyReply) => {
  return { pong: 'It worked!' };
}
