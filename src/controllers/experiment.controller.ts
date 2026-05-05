import { type FastifyReply, type FastifyRequest } from 'fastify';
import { type CreateExperimentInput } from '../schemas/experiment.schema.js'
import csv from 'csv-parser'
import { pipeline } from 'node:stream'

export const saveHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const parts = request.parts()
  const results: Array<Array<string>> = []
  let fileStream: NodeJS.ReadableStream | null = null
  let experimentName: string | null = null

  // Extract fields and files from multipart
  for await (const part of parts) {
    reply.log.info('==== part ====')
    reply.log.info(part)
    if (part.type === 'field' && part.fieldname === 'name') {
      experimentName = (part.value as any)
    } else if (part.type === 'file' && part.fieldname === 'file') {
      fileStream = part.file
    }
  }

  if (!fileStream || !experimentName) {
    return reply.status(400).send({ message: 'Missing file or name' })
  }

  try {
    await new Promise((resolve, reject) => {
      pipeline(
        fileStream!,
        csv(),
        (err) => {
          if (err) {
            reply.log.error(`CSV pipeline failed: ${err}`)
            reject(err)
          } else {
            resolve(results)
          }
        } 
      ).on('data', (row: Array<string>) => {
        results.push(row)
      })
    })

    return reply.status(200).send({ message: `${results.length} records stored`})
  } catch (error) {
    request.log.error(error)
    return reply.status(500).send({ message: String(error) })
  }
  /*const data = request.body.file
  const results: Array<Array<string>> = []

  console.debug('=== body.file ==== ')
  console.debug(request.body.file.file)  

  if (!data) {
    return reply.status(400).send({ message: 'Missing file' })
  }

  try {
    await new Promise((resolve, reject) => {
      console.debug('=== entering pipeline ===')
      pipeline(
        data.file,
        csv(), 
        (err) => {
          if (err) {
            reply.log.error(`CSV pipeline failed: ${err}`)
            reject(err)
          }

          reply.log.info('==== pipeline finished ====')
          resolve(results)
      })
      .on('data', (row: Array<string>) => {
        reply.log.info('===== pushing data =====')
        results.push(row)
      })
      .on('end', () => {
        reply.log.info('==== ending file processing =====')
        resolve(results)
      })
    })

    return reply.status(200).send({ message: `${results.length} records stored`})
  } catch (error) {
    request.log.error(error)
    return reply.status(500).send({ message: error })
  }*/
}