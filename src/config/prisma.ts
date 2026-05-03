import 'dotenv/config';
import { PrismaMariaDb } from '@prisma/adapter-mariadb';
import { PrismaClient } from '../../generated/prisma/client.js';

const host: string = process.env.DATABASE_HOST ?? "";
const user: string = process.env.DATABASE_USER ?? "";
const pass: string = process.env.DATABASE_PASSWORD ?? "";
const name: string = process.env.DATABASE_NAME ?? "";

const adapter = new PrismaMariaDb({
  host: host,
  user: user,
  password: pass,
  database: name,
  connectionLimit: 5
});

const prisma = new PrismaClient({ adapter });

export { prisma };