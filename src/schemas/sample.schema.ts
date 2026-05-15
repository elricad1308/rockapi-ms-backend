import { z } from 'zod'
import { Decimal } from 'decimal.js'

const fetchSampleSchema = z.object({
  id: z.string().transform(val => parseInt(val))
})

const fetchSampleResponseSchema = z.object({
  id: z.number(),
  name: z.string(),
  sourcefile: z.string(),
  experimentId: z.number(),
  epsilon_25: z.number().nullable(),
  epsilon_50: z.number().nullable(),
  epsilon_max: z.number().nullable(),
  epsilon_u: z.number().nullable(),
  sigma_25: z.number().nullable(),
  sigma_50: z.number().nullable(),
  sigma_max: z.number().nullable(),
  sigma_u: z.number().nullable(),
  createdAt: z.date(),
  data: z.array(z.object({
    id: z.number(),
    strain: z.any().transform(val => new Decimal(val)),
    stress: z.any().transform(val => new Decimal(val))
  }))
})

export type FetchSampleInput = z.infer<typeof fetchSampleSchema>

export const fetchSampleZodSchema = {
  params: fetchSampleSchema,
  response: {
    200: fetchSampleResponseSchema
  }
}