import { z } from 'zod'

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
