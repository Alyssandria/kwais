import type { DataRequestType } from '@prisma/client';
import { prisma } from '../config/db.js';

export const PrivacyModel = {
  accountForExport(userId: string) {
    return prisma.user.findUnique({
      where: { id: userId },
      select: {
        id: true,
        email: true,
        role: true,
        status: true,
        createdAt: true,
        lastLoginAt: true,
        patientProfile: {
          select: {
            id: true,
            patientCode: true,
            firstName: true,
            lastName: true,
            birthYear: true,
            sex: true,
            dietaryPreferences: true,
            allergies: true,
            restrictions: true,
            ckdStage: true,
            ckdStageSource: true,
            dialysisStatus: true,
            reminderTime: true,
            timezone: true,
            onboardingDoneAt: true,
            createdAt: true,
            updatedAt: true,
            targets: { orderBy: [{ nutrient: 'asc' }, { effectiveFrom: 'asc' }], omit: { patientId: true } },
            meals: {
              orderBy: { eatenAt: 'asc' },
              omit: { patientId: true },
              include: {
                condiments: { omit: { mealId: true } },
                items: { omit: { mealId: true } },
                analyses: { orderBy: { version: 'asc' }, omit: { mealId: true, patientId: true } },
              },
            },
          },
        },
        doctorProfile: { omit: { id: true, userId: true } },
        consents: { orderBy: { createdAt: 'asc' }, omit: { userId: true } },
        notifications: { orderBy: { createdAt: 'asc' }, omit: { userId: true } },
        dataRequests: { orderBy: { createdAt: 'asc' }, omit: { userId: true } },
      },
    });
  },

  recordRequest(userId: string, type: DataRequestType) {
    return prisma.dataRequest.create({
      data: { userId, type, status: 'completed', handledAt: new Date() },
      select: { id: true, type: true, status: true, createdAt: true, handledAt: true },
    });
  },

  activity(userId: string, patientId: string | null, limit: number) {
    return prisma.auditLog.findMany({
      where: { OR: [{ actorId: userId }, ...(patientId ? [{ patientId }] : [])] },
      orderBy: { at: 'desc' },
      take: limit,
      select: { id: true, actorId: true, actorRole: true, action: true, resourceType: true, userAgent: true, at: true },
    });
  },

  deleteUser(userId: string) {
    return prisma.user.delete({ where: { id: userId }, select: { id: true } });
  },

  purgeDeletedMeals(before: Date) {
    return prisma.meal.deleteMany({ where: { deletedAt: { lt: before } } });
  },

  purgeAuditBefore(before: Date) {
    return prisma.auditLog.deleteMany({ where: { at: { lt: before } } });
  },

  async purgeSpentTokens(before: Date) {
    const [refresh, resets] = await prisma.$transaction([
      prisma.refreshToken.deleteMany({ where: { expiresAt: { lt: before } } }),
      prisma.passwordReset.deleteMany({ where: { expiresAt: { lt: before } } }),
    ]);
    return refresh.count + resets.count;
  },
};
