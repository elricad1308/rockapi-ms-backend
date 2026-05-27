import csv from 'csv-parser'
import { pipeline } from 'node:stream'
import { type FastifyReply, type FastifyRequest } from 'fastify';
import { z } from 'zod'
import fs from 'node:fs'
import { prisma } from '../config/prisma.js'
import { Decimal } from 'decimal.js'
import { type FetchExperimentInput } from '../schemas/experiment.schema.js';
import { analyzeData, type Analysis } from '../services/sample.service.js';
import { Queue, Worker, Job } from 'bullmq'
import { Redis } from 'ioredis'
import { join, dirname } from 'node:path'
import { fileURLToPath } from 'node:url'
import { getTimestamp } from '../services/helper.service.js'

// Schema used for the CSV file rows to be stored as sample data
const row = z.object({
  sampleId: z.number(),
  strain: z.string().transform(val => new Decimal(val)),
  stress: z.string().transform(val => new Decimal(val))
})

// Gets the root dir of the project
function getRootDir () {
  const __filename = fileURLToPath(import.meta.url)
  const __my_dirname = dirname(__filename).replace(`src/controllers`, '')

  return __my_dirname
}

/**
 * Handler used to fetch a single experiment, with all it samples
 */
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

/**
 * Handler used to list experiments stored in the database
 */
export const listHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const experiments = await prisma.experiment.findMany({
    include: {
      _count: {
        select: { samples: true }
      }
    }
  })

  return reply.status(200).send(experiments)
}

/**
 * Handler that stores files uploaded at the moment a new experiment
 * is created.
 */
export const saveHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  // Files are uploaded with a Form Data, which is processed by the
  // @fastify/multipart plugin
  const parts = request.parts()

  // The upload time is used to create the dir that stores the files
  const uploadTime = new Date()
  
  const sourceDir: string = getTimestamp(uploadTime)
  let experiment = { id: 0, name: '', createdAt: uploadTime }
  let samples = []

  // Creates the dir to store the files
  fs.mkdirSync(join(getRootDir(), 'uploads', sourceDir))

  try {
    for await (const part of parts) {
      // Prepare the experiment data for the database
      if (part.type === 'field' && part.fieldname === 'name') {
        experiment.name = part.value as string    
      // Sample processing
      } else if (part.type === 'file' && part.fieldname === 'file') {
        // Filename of the source data
        const filename = join(getRootDir(), 'uploads', sourceDir, part.filename)
      
        // Prepares sample data to store in database
        samples.push({
          name: part.filename.replace('.csv', ''),
          sourcefile: filename,
          experimentId: 0
        })

        // Stores the uploaded file in disk
        const storedFile = fs.createWriteStream(filename)
        await new Promise((resolve, reject) => {
          pipeline(
            part.file, 
            storedFile, 
            (err) => {
              if (err) reject(`Error: ${err}`)
              else resolve(0)
            })
        })
      }
    }

    // Stores the data in the database using a single transaction
    await prisma.$transaction(async (tx) => {
      // Save experiment in the database
      experiment = await tx.experiment.create({
        data: {
          name: experiment.name,
          createdAt: experiment.createdAt
        }
      })

      // Add the experiment ID to each sample
      samples.forEach(element => {
        element.experimentId = experiment.id
      })

      // Stores the samples in the database
      await tx.sample.createMany({ data: samples })


    }) // transaction

    return reply.status(200).send({
      id: experiment.id,
      message: `${samples.length} archivos guardados correctamente`,
      statusCode: 200
    })
  } catch (err) {
    reply.log.error(`ExperimentController.save: Fatal error\n${String(err)}`)

    // Delete any uploaded files
    fs.rmSync(sourceDir)

    return reply.status(500).send({
      statusCode: 500,
      message: `server error: ${String(err)}`
    })
  }
}

/**
 * Handler that looks up for any unprocessed sample in the database,
 * gets their content, perform the analysis on them, and stores
 * the data and the analysis result in the database.
 */
export const processFilesHandler = async (request: FastifyRequest<{ Params: FetchExperimentInput }>, reply: FastifyReply) => {
  // IMPORTANT: prevents the handler for throwing due to a closed connection!
  reply.sse.keepAlive()

  const id = parseInt(request.params.id)
  let fileContents: Array<Row> = []

  // Gets the unprocessed samples for the experiment
  const samples = await prisma.sample.findMany({
    where: {
      experimentId: id,
      processed: false
    }
  })

  // Create the job to start processing the files
  const samplesQueue = new Queue(`exp${id}`)
  for (let sample of samples) {
    // The second argument object is the data that the job will receive
    // once the worker starts with it.
    await samplesQueue.add('sampleUpload', {
      id: sample.id,
      sourcefile: sample.sourcefile
    })
  }

  // Creates the worker to perform the jobs
  const connection = new Redis({ maxRetriesPerRequest: null })
  const worker = new Worker(
    // This is the name of the queue from which the worker will take
    // the jobs
    `exp${id}`,

    // This is the job to perform: open the file, read its contents,
    // analyze them and store in the database
    async job => {
      // Gets the file
      const fileStream = fs.createReadStream(job.data.sourcefile)

      // Gets the content of the file, and add the sample ID
      fileContents = await _getFileContents(fileStream)

      // Transforms the raw string data into Decimal instances, used
      // to perform precise calculations
      fileContents.forEach(element => {
        element.sampleId = job.data.id
        element.strain = new Decimal(element.strain)
        element.stress = new Decimal(element.stress)
      })

      // Analyze the data
      let analysis: Analysis = analyzeData(fileContents)

      // Store the sample data in the database
      await prisma.sampleData.createMany({
        data: fileContents
      })

      // Once a job completes, it will return the analysis performed
      return analysis
    },
    // This is the Redis connection the worker will use to keep track
    // of jobs statuses
    { connection }
  )
  
  // This object will be sent to the front to create the progress bar
  // animation
  const progress = {
    successful: 0,
    failed: 0,
    total: samples.length,
    drained: false,
    completed: false
  }

  // Return a promise that resolves when processing is complete
  // This also is important to prevent the handler for throwing due
  // to closed connections
  return new Promise<void>((resolve) => {
    // Listener called every time A JOB completes
    worker.on('completed', async (job: Job, returnValue: Analysis) => {
      progress.successful += 1

      // Marks the sample as processed, so it is not processed again
      // and stores the analysis result
      const { id } = job.data
      await prisma.sample.update({
        where: {
          id: id
        },
        data: {
          ...returnValue,
          processed: true
        }
      })

      // Check if all jobs have finished
      progress.completed = progress.successful === progress.total

      // Notify user that a file has been processed
      await reply.sse.send({
        event: 'fileProcessed',
        data: progress
      })
    })

    // Listener called when A JOB fails
    worker.on('failed', async (jobId, failedReason) => {
      request.log.warn(`job ${jobId} failed: ${failedReason}`)
      progress.failed += 1

      // Notify user that a file failed processing
      await reply.sse.send({
        event: 'fileProcessed',
        data: progress
      })
    })

    // Called when there are no more jobs left
    worker.on('drained', async () => {
      // No more jobs on the queue BUT there may be currently active
      progress.drained = true 

      // Notify the user the state of the operation
      await reply.sse.send({
        event: 'processingComplete',
        data: progress
      })
    })

    // Listens to the close event, when the user ends the connection
    // This will prevent the handler from throwing
    request.raw.on('close', async () => {
      reply.log.debug('SSE connection closed')

      // Clean up resources
      if (worker) {
        await worker.close()
      }

      if (connection) {
        connection.disconnect()
      }

      // Resolve the promise to end the request
      resolve()
    }) // Request.on-close
  }) // Promise
}

/**
 * @deprecated 
 */
export const __saveHandler = async (request: FastifyRequest, reply: FastifyReply) => {
  const parts = request.parts()
  let results: Array<Row> = []
  let fileStream: Array<NodeJS.ReadableStream | null> = []
  let experimentName: string | null = null
  let fileName: Array<string | null> = []
  let recordsStored: number = 0

  // Extract fields and files from multipart
  for await (const part of parts) {
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
    // Saves experiment
    const experiment = await prisma.experiment.create({
      data: {
        name: experimentName
      }
    })

    // Save each uploaded file
    for (let i = 0; i < fileStream.length; i++) {
      results = await _getFileContents(fileStream[i]!)

      // Analyze the raw data
      let analysis = analyzeData(results)

      // Saves sample
      const sample = await prisma.sample.create({
        data: {
          name: `${fileName[i]}`,
          sourcefile: fileName[i]!,
          experimentId: experiment.id,
          ...analysis
        }
      })

      // Saves sample data
      results.forEach(element => {
        element.sampleId = sample.id
      })
      
      const newData = await prisma.sampleData.createMany({
        data: results
      })

      recordsStored += newData.count

      await reply.sse.send({
        event: 'saveFile',
        data: { total: fileStream.length, completed: (i + 1) },
        retry: 1000
      })
    } // for - files

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
async function _getFileContents(fileStream: NodeJS.ReadableStream): Promise<Row[]>  {
  const fileContents: Array<Row> = []

  return new Promise((resolve, reject) => {
    pipeline(
      fileStream!,
      csv(),
      (err) => {
        if (err) {
          reject(`CSV pipeline failed: ${err}`)            
        } else {
          resolve(fileContents)
        }
      } 
    ).on('data', (row: Row) => {
      row.sampleId = 0
      fileContents.push(row)
    })
  })
}

export type Row = z.infer<typeof row>