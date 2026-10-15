import { PrismaClient } from '@prisma/client';
import { env } from './env.js';

/** One Prisma client per process. */
export const prisma = new PrismaClient({
  log: env.NODE_ENV === 'development' ? ['warn', 'error'] : ['error'],
});
