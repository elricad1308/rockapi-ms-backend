import { type FastifyReply, type FastifyRequest } from 'fastify';
import { type Multipart } from '@fastify/multipart';
import csv from 'csv-parser';

export const save = async (request: FastifyRequest, reply: FastifyReply) => {
  const data = await request.file();
  const results = []

  if (!data) {
    return { message: 'missing file' }
  }

  data.file
    .pipe(csv())
    .on('data', (row) => results.push(row))
    .on('end', () => {
      console.debug(`${results.length} rows read`)

      reply.send({ message: 'CSV parsed'})
    })
}