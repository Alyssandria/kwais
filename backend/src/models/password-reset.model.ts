import { prisma } from '../config/db.js';

export const PasswordResetModel = {
  create(data: { userId: string; tokenHash: string; expiresAt: Date }) {
    return prisma.passwordReset.create({ data, select: { id: true } });
  },

  findByHash(tokenHash: string) {
    return prisma.passwordReset.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, expiresAt: true, usedAt: true },
    });
  },

  markUsed(id: string) {
    return prisma.passwordReset.update({ where: { id }, data: { usedAt: new Date() } });
  },

  invalidateAllForUser(userId: string) {
    return prisma.passwordReset.updateMany({ where: { userId, usedAt: null }, data: { usedAt: new Date() } });
  },
};
