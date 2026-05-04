import bcrypt from 'bcrypt'
import { prisma } from '../config/prisma.js'
import { type FastifyRequest, type FastifyReply } from 'fastify'
import { type CreateUserInput, type LoginInput } from '../schemas/user.schema.js'

const SALT_ROUNDS = 10

export const loginHandler = async(request: FastifyRequest<{ Body: LoginInput }>, reply: FastifyReply) => {
  const { email, password } = request.body

  const user = await prisma.user.findUnique({ where: { email }})
  const isMatch = user && (await bcrypt.compare(password, user.password))

  if (!user || !isMatch) {
    return reply.code(401).send({
      message: 'Nombre de usuario o contraseña incorrecta'
    })
  }

  const payload = {
    id: user.id,
    email: user.email,
    name: user.name
  }
  const token = request.jwt.sign(payload)

  return reply.code(200).send({ token })
}

export const createUserHandler = async(request: FastifyRequest<{ Body: CreateUserInput }>, reply: FastifyReply) => {
  const { password, email, name } = request.body

  try {
    const hash = await bcrypt.hash(password, SALT_ROUNDS)
    const user = await prisma.user.create({
      data: {
        password: hash,
        email, 
        name
      }
    })

    const { id } = user

    return reply.code(201).send({ id, name, email })
  } catch (e) {
    return reply.code(500).send(e)
  }  
}

export const validateHandler = async(request: FastifyRequest, reply: FastifyReply) => {
  try {
    await request.jwtVerify()
    reply.status(200).send({ message: 'ok' })
  } catch (err) {
    reply.code(403).send(err)
  }
}
