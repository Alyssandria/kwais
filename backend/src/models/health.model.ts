import { prisma } from '../config/db.js';

export const HealthModel = {
  async ping(): Promise<void> {
    await prisma.$queryRaw`SELECT 1`;
  },
};
