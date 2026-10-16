import { Prisma, type Nutrient, type ValueSource } from '@prisma/client';
import { prisma } from '../config/db.js';

const targetSelect = {
  id: true,
  nutrient: true,
  dailyMax: true,
  dailyMin: true,
  unit: true,
  source: true,
  note: true,
  effectiveFrom: true,
  effectiveTo: true,
} satisfies Prisma.NutritionTargetSelect;

export type TargetRecord = Prisma.NutritionTargetGetPayload<{ select: typeof targetSelect }>;

export const TargetModel = {
  listActive(patientId: string, now = new Date()): Promise<TargetRecord[]> {
    return prisma.nutritionTarget.findMany({
      where: { patientId, effectiveFrom: { lte: now }, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
      orderBy: { effectiveFrom: 'desc' },
      select: targetSelect,
    });
  },

  replace(
    patientId: string,
    data: { nutrient: Nutrient; dailyMax: number; unit: string; source: ValueSource; note?: string | null },
    now = new Date(),
  ): Promise<TargetRecord> {
    return prisma.$transaction(async (tx) => {
      await tx.nutritionTarget.updateMany({
        where: { patientId, nutrient: data.nutrient, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
        data: { effectiveTo: now },
      });
      return tx.nutritionTarget.create({
        data: {
          patientId,
          nutrient: data.nutrient,
          dailyMax: new Prisma.Decimal(data.dailyMax),
          unit: data.unit,
          source: data.source,
          note: data.note ?? null,
          effectiveFrom: now,
        },
        select: targetSelect,
      });
    });
  },

  async end(patientId: string, nutrient: Nutrient, now = new Date()): Promise<number> {
    const r = await prisma.nutritionTarget.updateMany({
      where: { patientId, nutrient, OR: [{ effectiveTo: null }, { effectiveTo: { gt: now } }] },
      data: { effectiveTo: now },
    });
    return r.count;
  },
};
