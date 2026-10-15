import { prisma } from '../config/db.js';

export const RefreshTokenModel = {
  create(data: { userId: string; tokenHash: string; family: string; expiresAt: Date }) {
    return prisma.refreshToken.create({ data, select: { id: true } });
  },

  findByHash(tokenHash: string) {
    return prisma.refreshToken.findUnique({
      where: { tokenHash },
      select: { id: true, userId: true, family: true, expiresAt: true, revokedAt: true },
    });
  },

  revoke(id: string) {
    return prisma.refreshToken.update({ where: { id }, data: { revokedAt: new Date() } });
  },

  /** Revokes every token in a rotation chain (used when a stolen token is replayed). */
  revokeFamily(family: string) {
    return prisma.refreshToken.updateMany({ where: { family, revokedAt: null }, data: { revokedAt: new Date() } });
  },

  revokeAllForUser(userId: string) {
    return prisma.refreshToken.updateMany({ where: { userId, revokedAt: null }, data: { revokedAt: new Date() } });
  },
};
