import { prisma } from '../config/db.js';

/**
 * Model layer: data access only. Talks to PostgreSQL through Prisma and
 * returns plain values — no HTTP, no business rules.
 */
export const HealthModel = {
  async ping(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  },
};
