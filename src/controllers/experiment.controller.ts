import csv from 'csv-parser'
import { pipeline } from 'node:stream'
import { type FastifyReply, type FastifyRequest } from 'fastify';
import { prisma } from '../config/prisma.js'
import { Decimal } from 'decimal.js'
import { type FetchExperimentInput } from '../schemas/experiment.schema.js';

interface Row {
  Strain: string,
  Stress: string
}

export const fetchHandler = async (request: FastifyRequest<{ Params: FetchExperimentInput}>, reply: FastifyReply) => {
  const { id } = request.params
  const experiment = await prisma.experiment.findUnique({
    where: {
      id: parseInt(id)
    },
    include: {
      data: true
    }
  })

  return reply.status(200).send(experiment)
}

export const listHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const experiments = await prisma.experiment.findMany({
    include: {
      data: false
    }
  })

  const response = experiments.map(element => {
    return { id: element.id, name: element.name }
  })

  return reply.status(200).send(response)
}

// Handler for experiment upload /experiment/upload
export const saveHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const parts = request.parts()
  const results: Array<Row> = []
  let fileStream: NodeJS.ReadableStream | null = null
  let experimentName: string | null = null
  let fileName: string | null = null

  // Extract fields and files from multipart
  for await (const part of parts) {
    if (part.type === 'field' && part.fieldname === 'name') {
      experimentName = (part.value as any)
    } else if (part.type === 'file' && part.fieldname === 'file') {
      fileStream = part.file
      fileName = part.filename
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
      ).on('data', (row: Row) => {
        results.push(row)
      })
    })

    // Saves experiment
    const experiment = await prisma.experiment.create({
      data: {
        name: experimentName,
        sourcefile: fileName ?? 'data.csv',
        createdAt: new Date()
      }
    })
    
    const { id } = experiment

    // Saves experiment data
    const experimentData = results.map((element: Row) => {      
      return { 
        experimentId: id,
        strain: new Decimal(element.Strain ?? ''),
        stress: new Decimal(element.Stress ?? '')
      }
    })

    const newData = await prisma.experimentData.createMany({
      data: experimentData
    })

    return reply.status(200).send({ 
      message: `${ newData.count } records stored`
    })
  } catch (error) {
    request.log.error(error)
    return reply.status(500).send({ message: String(error) })
  }
}