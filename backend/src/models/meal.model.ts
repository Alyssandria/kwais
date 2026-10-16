import { Prisma, type AiStatus, type CondimentAmount, type MealCategory, type MealStatus } from '@prisma/client';
import { prisma } from '../config/db.js';

const analysisSelect = {
  id: true,
  version: true,
  engineVersion: true,
  promptVersion: true,
  model: true,
  totals: true,
  itemBreakdown: true,
  score: true,
  scoreBand: true,
  aiOutput: true,
  aiStatus: true,
  createdAt: true,
} satisfies Prisma.MealAnalysisSelect;

const mealSelect = {
  id: true,
  eatenAt: true,
  category: true,
  rawText: true,
  drinks: true,
  cookingMethods: true,
  notes: true,
  status: true,
  createdAt: true,
  updatedAt: true,
  condiments: { select: { name: true, amount: true }, orderBy: { name: 'asc' } },
  analyses: { select: analysisSelect, orderBy: { version: 'desc' }, take: 1 },
} satisfies Prisma.MealSelect;

export type MealRecord = Prisma.MealGetPayload<{ select: typeof mealSelect }>;
export type AnalysisRecord = Prisma.MealAnalysisGetPayload<{ select: typeof analysisSelect }>;

export interface MealData {
  category: MealCategory;
  eatenAt: Date;
  rawText: string;
  drinks: string[];
  cookingMethods: string[];
  notes: string | null;
  status: MealStatus;
}

export interface CondimentData {
  name: string;
  amount: CondimentAmount;
}

export interface MealItemData {
  foodItemId: string | null;
  label: string;
  quantity: number;
  unit: string;
  grams: number | null;
  preparation: string | null;
  matchConfidence: number | null;
  amountGuessed: boolean;
}

export interface AnalysisData {
  engineVersion: string;
  promptVersion: string | null;
  model: string | null;
  totals: Prisma.InputJsonValue;
  itemBreakdown: Prisma.InputJsonValue;
  inputsSnapshot: Prisma.InputJsonValue;
  score: number | null;
  scoreBand: string | null;
  aiOutput: Prisma.InputJsonValue | null;
  aiStatus: AiStatus;
}

const live = { deletedAt: null } as const;
const dec = (n: number | null) => (n == null ? null : new Prisma.Decimal(n));

export const MealModel = {
  create(patientId: string, meal: MealData, condiments: CondimentData[]): Promise<MealRecord> {
    return prisma.meal.create({
      data: { ...meal, patientId, condiments: { create: condiments } },
      select: mealSelect,
    });
  },

  /** Scoped by patient, and deleted meals are never found. */
  findOwned(patientId: string, id: string): Promise<MealRecord | null> {
    return prisma.meal.findFirst({ where: { id, patientId, ...live }, select: mealSelect });
  },

  /** Newest first. `before` pages through older meals by eaten time. */
  list(patientId: string, opts: { status?: MealStatus; limit: number; before?: Date }): Promise<MealRecord[]> {
    return prisma.meal.findMany({
      where: {
        patientId,
        ...live,
        ...(opts.status ? { status: opts.status } : {}),
        ...(opts.before ? { eatenAt: { lt: opts.before } } : {}),
      },
      orderBy: [{ eatenAt: 'desc' }, { createdAt: 'desc' }],
      take: opts.limit,
      select: mealSelect,
    });
  },

  /** Recently saved meals (not drafts), newest first, for "Log it again". */
  recentSaved(patientId: string, take: number): Promise<MealRecord[]> {
    return prisma.meal.findMany({
      where: { patientId, ...live, status: { in: ['saved', 'analysed'] } },
      orderBy: [{ eatenAt: 'desc' }, { createdAt: 'desc' }],
      take,
      select: mealSelect,
    });
  },

  /** Updates a meal; when `condiments` is given, it replaces the whole list. */
  update(id: string, meal: Partial<MealData>, condiments?: CondimentData[]): Promise<MealRecord> {
    return prisma.$transaction(async (tx) => {
      if (condiments) {
        await tx.mealCondiment.deleteMany({ where: { mealId: id } });
        if (condiments.length) await tx.mealCondiment.createMany({ data: condiments.map((c) => ({ ...c, mealId: id })) });
      }
      return tx.meal.update({ where: { id }, data: meal, select: mealSelect });
    });
  },

  /** Hidden from the patient straight away; removed for good by the deletion-request job (Section 9). */
  async softDelete(id: string): Promise<void> {
    await prisma.meal.update({ where: { id }, data: { deletedAt: new Date() }, select: { id: true } });
  },

  /**
   * Stores a new analysis version with the items it was built from, and marks the meal analysed.
   * Earlier versions are kept unchanged; only the meal's current items are replaced.
   */
  saveAnalysis(mealId: string, patientId: string, analysis: AnalysisData, items: MealItemData[]): Promise<AnalysisRecord> {
    return prisma.$transaction(async (tx) => {
      const last = await tx.mealAnalysis.aggregate({ where: { mealId }, _max: { version: true } });
      const version = (last._max.version ?? 0) + 1;

      await tx.mealItem.deleteMany({ where: { mealId } });
      if (items.length) {
        await tx.mealItem.createMany({
          data: items.map((i) => ({
            mealId,
            foodItemId: i.foodItemId,
            label: i.label,
            quantity: new Prisma.Decimal(i.quantity),
            unit: i.unit,
            grams: dec(i.grams),
            preparation: i.preparation,
            matchConfidence: dec(i.matchConfidence),
            amountGuessed: i.amountGuessed,
          })),
        });
      }

      const created = await tx.mealAnalysis.create({
        data: {
          mealId,
          patientId,
          version,
          engineVersion: analysis.engineVersion,
          promptVersion: analysis.promptVersion,
          model: analysis.model,
          totals: analysis.totals,
          itemBreakdown: analysis.itemBreakdown,
          inputsSnapshot: analysis.inputsSnapshot,
          score: analysis.score,
          scoreBand: analysis.scoreBand,
          aiOutput: analysis.aiOutput ?? Prisma.JsonNull,
          aiStatus: analysis.aiStatus,
        },
        select: analysisSelect,
      });
      await tx.meal.update({ where: { id: mealId }, data: { status: 'analysed' }, select: { id: true } });
      return created;
    });
  },
};
