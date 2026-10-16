import { Prisma, type FoodSource } from '@prisma/client';
import { prisma } from '../config/db.js';

const catalogSelect = {
  id: true,
  name: true,
  localNames: true,
  category: true,
  source: true,
  sourceRef: true,
  verified: true,
  sodiumMg: true,
  potassiumMg: true,
  phosphorusMg: true,
  proteinG: true,
  portions: { select: { unit: true, grams: true } },
  recipeComponents: { select: { ingredientId: true, gramsPer100gDish: true } },
} satisfies Prisma.FoodItemSelect;

export type FoodRow = Prisma.FoodItemGetPayload<{ select: typeof catalogSelect }>;

const searchSelect = {
  id: true,
  name: true,
  localNames: true,
  category: true,
  source: true,
  sourceRef: true,
  verified: true,
  sodiumMg: true,
  potassiumMg: true,
  phosphorusMg: true,
  proteinG: true,
  portions: { select: { unit: true, grams: true }, orderBy: { unit: 'asc' } },
} satisfies Prisma.FoodItemSelect;

export type FoodSearchRow = Prisma.FoodItemGetPayload<{ select: typeof searchSelect }>;

export interface FoodUpsert {
  name: string;
  localNames: string[];
  category: string | null;
  source: FoodSource;
  sourceRef: string;
  verified: boolean;
  sodiumMg: number | null;
  potassiumMg: number | null;
  phosphorusMg: number | null;
  proteinG: number | null;
  portions: { unit: string; grams: number }[];
}

const dec = (n: number | null) => (n == null ? null : new Prisma.Decimal(n));

export const FoodModel = {
  loadAll(): Promise<FoodRow[]> {
    return prisma.foodItem.findMany({ select: catalogSelect, orderBy: { name: 'asc' } });
  },

  search(q: string, limit: number): Promise<FoodSearchRow[]> {
    return prisma.foodItem.findMany({
      where: {
        OR: [{ name: { contains: q, mode: 'insensitive' } }, { localNames: { has: q.toLowerCase() } }],
      },
      select: searchSelect,
      orderBy: [{ verified: 'desc' }, { name: 'asc' }],
      take: limit,
    });
  },

  async upsert(f: FoodUpsert): Promise<string> {
    const data = {
      name: f.name,
      localNames: f.localNames,
      category: f.category,
      verified: f.verified,
      sodiumMg: dec(f.sodiumMg),
      potassiumMg: dec(f.potassiumMg),
      phosphorusMg: dec(f.phosphorusMg),
      proteinG: dec(f.proteinG),
    };
    return prisma.$transaction(async (tx) => {
      const row = await tx.foodItem.upsert({
        where: { source_sourceRef: { source: f.source, sourceRef: f.sourceRef } },
        create: { ...data, source: f.source, sourceRef: f.sourceRef },
        update: data,
        select: { id: true },
      });
      await tx.foodPortion.deleteMany({ where: { foodItemId: row.id } });
      if (f.portions.length) {
        await tx.foodPortion.createMany({
          data: f.portions.map((p) => ({ foodItemId: row.id, unit: p.unit, grams: new Prisma.Decimal(p.grams) })),
        });
      }
      return row.id;
    });
  },

  async setRecipe(recipeId: string, ingredients: { ingredientId: string; gramsPer100g: number }[]): Promise<void> {
    await prisma.$transaction([
      prisma.recipeIngredient.deleteMany({ where: { recipeId } }),
      prisma.recipeIngredient.createMany({
        data: ingredients.map((i) => ({ recipeId, ingredientId: i.ingredientId, gramsPer100gDish: new Prisma.Decimal(i.gramsPer100g) })),
      }),
    ]);
  },

  async findIdByRef(source: FoodSource, sourceRef: string): Promise<string | null> {
    const row = await prisma.foodItem.findUnique({ where: { source_sourceRef: { source, sourceRef } }, select: { id: true } });
    return row?.id ?? null;
  },
};
