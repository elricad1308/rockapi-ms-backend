import { z } from 'zod'
import { Decimal } from 'decimal.js'

const fetchExperimentSchema = z.object({
  id: z.string()
})

export type FetchExperimentInput = z.infer<typeof fetchExperimentSchema>

const fetchExperimentResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  createdAt: z.date(),  
  samples: z.array(z.object({
    id: z.number(),
    name: z.string(),
    sourcefile: z.string()    
  }))
})

export const fetchExperimentZodSchema = {
  params: fetchExperimentSchema,
  response: {
    200: fetchExperimentResponseSchema
  }
}

const createExperimentSchema = z.object({
  name: z.object({
    value: z.string()
  }),
  file: z.object({
    type: z.literal('file'),
    fieldname: z.string(),
    filename: z.string().endsWith('.csv'),
    mimetype: z.literal('text/csv'),
    file: z.any()
  })
  // file: z.file().mime('text/csv').max(10 * 1024 * 1024) // 10 MB
})

const createExperimentResponseSchema = z.object({
  message: z.string()
})

export type CreateExperimentInput = z.infer<typeof createExperimentSchema>

export const createExperimentZodSchema = {
  body: createExperimentSchema,
  response: {
    200: createExperimentResponseSchema
  }
}

export const listExperimentZodSchema = {
  response: {
    200: z.array(z.object({
      id: z.number(),
      name: z.string(),
      createdAt: z.date()
    }))
  }
}