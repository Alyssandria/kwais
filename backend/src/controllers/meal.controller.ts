import type { Request, Response } from 'express';
import { HttpError } from '../lib/http-error.js';
import { patientIdOf } from '../middleware/require-patient.js';
import { MealListQuery, type MealCreate, type MealUpdate } from '../schemas/meal.schemas.js';
import { requestMeta } from '../services/audit.service.js';
import { FoodService } from '../services/food.service.js';
import { MealService } from '../services/meal.service.js';

const userIdOf = (req: Request) => {
  if (!req.auth) throw HttpError.unauthorized();
  return req.auth.userId;
};

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

/** A malformed id is just a meal that doesn't exist. */
function mealId(req: Request): string {
  const id = String(req.params.id);
  if (!UUID.test(id)) throw HttpError.notFound('Meal not found');
  return id;
}

export const MealController = {
  async list(req: Request, res: Response) {
    const q = MealListQuery.parse(req.query);
    res.json({ data: await MealService.list(patientIdOf(req), q) });
  },
  async recent(req: Request, res: Response) {
    res.json({ data: await MealService.recent(patientIdOf(req)) });
  },
  async get(req: Request, res: Response) {
    res.json({ data: await MealService.get(patientIdOf(req), mealId(req)) });
  },
  async create(req: Request, res: Response) {
    res.status(201).json({ data: await MealService.create(patientIdOf(req), req.body as MealCreate, userIdOf(req), requestMeta(req)) });
  },
  async update(req: Request, res: Response) {
    res.json({ data: await MealService.update(patientIdOf(req), mealId(req), req.body as MealUpdate, userIdOf(req), requestMeta(req)) });
  },
  async analyse(req: Request, res: Response) {
    res.json({ data: await MealService.analyse(patientIdOf(req), mealId(req), userIdOf(req), requestMeta(req)) });
  },
  async remove(req: Request, res: Response) {
    await MealService.remove(patientIdOf(req), mealId(req), userIdOf(req), requestMeta(req));
    res.status(204).end();
  },
};

export const FoodController = {
  async search(req: Request, res: Response) {
    const q = typeof req.query.q === 'string' ? req.query.q.slice(0, 60) : '';
    res.json({ data: await FoodService.search(q) });
  },
};
