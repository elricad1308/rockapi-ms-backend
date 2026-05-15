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
      samples: true
    }
  })

  return reply.status(200).send(experiment)
}

export const listHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const experiments = await prisma.experiment.findMany({
    include: {
      samples: false
    }
  })

  reply.log.debug(experiments)

  return reply.status(200).send(experiments)
}

// Handler for experiment upload /experiment/upload
export const saveHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const parts = request.parts()
  let results: Array<Row> = []
  let fileStream: Array<NodeJS.ReadableStream | null> = []
  let experimentName: string | null = null
  let fileName: Array<string | null> = []
  let recordsStored: number = 0

  // Extract fields and files from multipart
  for await (const part of parts) {
    request.log.debug(` ======= part: type: ${part.type} \t name: ${part.fieldname}`)

    if (part.type === 'field' && part.fieldname === 'name') {
      experimentName = (part.value as any)
    } else if (part.type === 'file' && part.fieldname === 'file') {
      fileStream.push(part.file)
      fileName.push(part.filename)
    }
  }

  if (fileStream.length === 0 || !experimentName) {
    return reply.status(400).send({ 
      message: 'Missing file or name',
      status: 400
    })
  }

  try {
    await prisma.$transaction(async (tx) => {
      // Saves experiment
      const experiment = await tx.experiment.create({
        data: {
          name: experimentName
        }
      })

      // Save each uploaded file
      for (let i = 0; i < fileStream.length; i++) {
        results = await _processFile(fileStream[i]!)

        // Saves sample
        const sample = await tx.sample.create({
          data: {
            name: `${fileName[i]}`,
            sourcefile: fileName[i]!,
            experimentId: experiment.id
          }
        })

        // Saves sample data
        const sampleData = results.map((element: Row) => {      
          return { 
            sampleId: sample.id,
            strain: new Decimal(element.Strain ?? ''),
            stress: new Decimal(element.Stress ?? '')
          }
        })

        const newData = await tx.sampleData.createMany({
          data: sampleData
        })

        recordsStored += newData.count
      } // for - files

      // Commits transaction

    }, { timeout: 10000 }) // prisma.$transaction
    
    return reply.status(200).send({ 
      message: `${ recordsStored } records stored`,
      status: 200
    })
  } catch (error) {
    request.log.error(error)
    return reply.status(500).send({ 
      message: String(error),
      status: 500
    })
  }
}

// Consumes a file stream reading the contents and storing them in an array
async function _processFile(fileStream: NodeJS.ReadableStream): Promise<Row[]>  {
  const results: Array<Row> = []

  return new Promise((resolve, reject) => {
    pipeline(
      fileStream!,
      csv(),
      (err) => {
        if (err) {
          reject(`CSV pipeline failed: ${err}`)            
        } else {
          resolve(results)
        }
      } 
    ).on('data', (row: Row) => {
      results.push(row)
    })
  })
}