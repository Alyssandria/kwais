import type { Prisma } from '@prisma/client';
import { HttpError } from '../lib/http-error.js';
import { MealModel, type AnalysisRecord, type MealData, type MealRecord } from '../models/meal.model.js';
import type { MealCreate, MealListParams, MealUpdate } from '../schemas/meal.schemas.js';
import { AuditService, type RequestMeta } from './audit.service.js';
import { FoodService } from './food.service.js';
import { estimateMeal } from './nutrition/engine.js';
import { PARSER_VERSION } from './nutrition/text-parser.js';
import type { DataNote, ItemResult, MealInput, NutrientKey, NutrientTotal } from './nutrition/types.js';

export interface AnalysisView {
  id: string;
  version: number;
  engineVersion: string;
  createdAt: string;
  totals: Record<NutrientKey, NutrientTotal>;
  items: ItemResult[];
  notes: DataNote[];
  score: number | null;
  scoreBand: string | null;
  ai: { status: 'ok' | 'unavailable' | 'mock'; output: unknown };
}

export interface MealView {
  id: string;
  category: MealRecord['category'];
  eatenAt: string;
  rawText: string;
  condiments: { name: string; amount: MealRecord['condiments'][number]['amount'] }[];
  drinks: string[];
  cookingMethods: string[];
  notes: string | null;
  status: MealRecord['status'];
  createdAt: string;
  updatedAt: string;
  analysis: AnalysisView | null;
}

export interface RecentMeal {
  mealId: string;
  category: MealRecord['category'];
  eatenAt: string;
  rawText: string;
  condiments: MealView['condiments'];
  drinks: string[];
  cookingMethods: string[];
}

interface StoredBreakdown {
  items: ItemResult[];
  notes: DataNote[];
}

function analysisView(a: AnalysisRecord): AnalysisView {
  const breakdown = a.itemBreakdown as unknown as StoredBreakdown;
  return {
    id: a.id,
    version: a.version,
    engineVersion: a.engineVersion,
    createdAt: a.createdAt.toISOString(),
    totals: a.totals as unknown as Record<NutrientKey, NutrientTotal>,
    items: breakdown.items ?? [],
    notes: breakdown.notes ?? [],
    score: a.score,
    scoreBand: a.scoreBand,
    ai: { status: a.aiStatus, output: a.aiOutput },
  };
}

export function toMealView(m: MealRecord): MealView {
  const latest = m.analyses[0];
  return {
    id: m.id,
    category: m.category,
    eatenAt: m.eatenAt.toISOString(),
    rawText: m.rawText,
    condiments: m.condiments.map((c) => ({ name: c.name, amount: c.amount })),
    drinks: m.drinks,
    cookingMethods: m.cookingMethods,
    notes: m.notes,
    status: m.status,
    createdAt: m.createdAt.toISOString(),
    updatedAt: m.updatedAt.toISOString(),
    analysis: latest ? analysisView(latest) : null,
  };
}

const json = (v: unknown) => v as Prisma.InputJsonValue;

async function analyse(meal: MealRecord, patientId: string): Promise<void> {
  const input: MealInput = {
    rawText: meal.rawText,
    condiments: meal.condiments,
    drinks: meal.drinks,
    cookingMethods: meal.cookingMethods,
  };
  const result = estimateMeal(input, await FoodService.catalog());
  const breakdown: StoredBreakdown = { items: result.items, notes: result.notes };

  await MealModel.saveAnalysis(
    meal.id,
    patientId,
    {
      engineVersion: result.engineVersion,
      promptVersion: null,
      model: null,
      totals: json(result.totals),
      itemBreakdown: json(breakdown),
      inputsSnapshot: json({ parser: PARSER_VERSION, meal: input, sentToAi: null }),
      score: null,
      scoreBand: null,
      aiOutput: null,
      aiStatus: 'unavailable',
    },
    result.items.map((i) => ({
      foodItemId: i.match?.foodId ?? null,
      label: i.label,
      quantity: i.quantity,
      unit: i.unit,
      grams: i.grams,
      preparation: i.preparation,
      matchConfidence: i.match?.confidence ?? null,
      amountGuessed: i.amountGuessed,
    })),
  );
}

async function ownedOrNotFound(patientId: string, id: string): Promise<MealRecord> {
  const meal = await MealModel.findOwned(patientId, id);
  if (!meal) throw HttpError.notFound('Meal not found');
  return meal;
}

const normalise = (s: string) => s.trim().toLowerCase().replace(/\s+/g, ' ');

export const MealService = {
  async list(patientId: string, q: MealListParams): Promise<MealView[]> {
    const rows = await MealModel.list(patientId, { status: q.status, limit: q.limit, before: q.before ? new Date(q.before) : undefined });
    return rows.map(toMealView);
  },

  async get(patientId: string, id: string): Promise<MealView> {
    return toMealView(await ownedOrNotFound(patientId, id));
  },

  async recent(patientId: string, limit = 5): Promise<RecentMeal[]> {
    const rows = await MealModel.recentSaved(patientId, 30);
    const seen = new Set<string>();
    const out: RecentMeal[] = [];
    for (const m of rows) {
      const key = normalise(m.rawText);
      if (!key || seen.has(key)) continue;
      seen.add(key);
      out.push({
        mealId: m.id,
        category: m.category,
        eatenAt: m.eatenAt.toISOString(),
        rawText: m.rawText,
        condiments: m.condiments.map((c) => ({ name: c.name, amount: c.amount })),
        drinks: m.drinks,
        cookingMethods: m.cookingMethods,
      });
      if (out.length >= limit) break;
    }
    return out;
  },

  async create(patientId: string, body: MealCreate, actorId: string, meta: RequestMeta): Promise<MealView> {
    const meal = await MealModel.create(
      patientId,
      {
        category: body.category,
        eatenAt: body.eatenAt,
        rawText: body.rawText,
        drinks: body.drinks,
        cookingMethods: body.cookingMethods,
        notes: body.notes || null,
        status: body.status,
      },
      body.condiments,
    );
    await AuditService.record('create', 'meal', meta, { actorId, actorRole: 'patient', resourceId: meal.id, patientId });
    if (body.status === 'saved' && body.analyse) {
      await analyse(meal, patientId);
      return MealService.get(patientId, meal.id);
    }
    return toMealView(meal);
  },

  async update(patientId: string, id: string, body: MealUpdate, actorId: string, meta: RequestMeta): Promise<MealView> {
    const current = await ownedOrNotFound(patientId, id);
    if (current.status !== 'draft') {
      throw HttpError.conflict('Saved meals can’t be edited. Delete it and log it again.');
    }
    const next: Partial<MealData> = {};
    if (body.category !== undefined) next.category = body.category;
    if (body.eatenAt !== undefined) next.eatenAt = body.eatenAt;
    if (body.rawText !== undefined) next.rawText = body.rawText;
    if (body.drinks !== undefined) next.drinks = body.drinks;
    if (body.cookingMethods !== undefined) next.cookingMethods = body.cookingMethods;
    if (body.notes !== undefined) next.notes = body.notes || null;
    if (body.status !== undefined) next.status = body.status;

    const finalText = next.rawText ?? current.rawText;
    if (next.status === 'saved' && finalText.trim().length < 2) {
      throw HttpError.badRequest('Tell us what you ate', [{ path: 'rawText', message: 'Tell us what you ate' }]);
    }

    const meal = await MealModel.update(id, next, body.condiments);
    await AuditService.record('update', 'meal', meta, { actorId, actorRole: 'patient', resourceId: id, patientId });
    if (meal.status === 'saved' && body.analyse) {
      await analyse(meal, patientId);
      return MealService.get(patientId, id);
    }
    return toMealView(meal);
  },

  async analyse(patientId: string, id: string, actorId: string, meta: RequestMeta): Promise<MealView> {
    const meal = await ownedOrNotFound(patientId, id);
    if (meal.status === 'draft') throw HttpError.conflict('Save the meal before analysing it');
    await analyse(meal, patientId);
    await AuditService.record('create', 'meal_analysis', meta, { actorId, actorRole: 'patient', resourceId: id, patientId });
    return MealService.get(patientId, id);
  },

  async remove(patientId: string, id: string, actorId: string, meta: RequestMeta): Promise<void> {
    await ownedOrNotFound(patientId, id);
    await MealModel.softDelete(id);
    await AuditService.record('delete', 'meal', meta, { actorId, actorRole: 'patient', resourceId: id, patientId });
  },
};
