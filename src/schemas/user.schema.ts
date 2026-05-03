import { z } from 'zod'

const createUserSchema = z.object({
  email: z.email(),
  password: z.string().min(6),
  name: z.string()
})

const createUserResponseSchema = z.object({
  id: z.string(),
  email: z.string(),
  name: z.string()
})

const loginSchema = z.object({
  email: z.email('El correo es necesario'),
  password: z.string().min(6)
})

const loginResponseSchema = z.object({
  token: z.string()
})

export type CreateUserInput = z.infer<typeof createUserSchema>

export type LoginInput = z.infer<typeof loginSchema>

export const createUserZodSchema = {
  body: createUserSchema,
  response: {
    200: createUserResponseSchema
  }
}

export const loginZodSchema = {
  body: loginSchema,
  response: {
    200: loginResponseSchema
  }
}
