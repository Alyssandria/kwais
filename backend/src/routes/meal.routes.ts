import { Router, type Request } from 'express';
import rateLimit from 'express-rate-limit';
import { env } from '../config/env.js';
import { FoodController, MealController } from '../controllers/meal.controller.js';
import { authenticate } from '../middleware/authenticate.js';
import { requirePatient } from '../middleware/require-patient.js';
import { validateBody } from '../middleware/validate.js';
import { MealCreateSchema, MealUpdateSchema } from '../schemas/meal.schemas.js';

/**
 * Analysing is the expensive step (and calls Gemini from Section 7), so it has its own limit:
 * 30 per hour per patient. Saving without analysis is not limited here.
 */
const analyseLimiter = rateLimit({
  windowMs: 60 * 60 * 1000,
  limit: 30,
  standardHeaders: 'draft-8',
  legacyHeaders: false,
  keyGenerator: (req: Request) => req.auth?.userId ?? req.ip ?? 'anonymous',
  skip: (req: Request) => env.NODE_ENV === 'test' || !wantsAnalysis(req),
  handler: (_req, res) => {
    res.status(429).json({
      error: { code: 'rate_limited', message: 'You’ve analysed a lot of meals in the last hour. Try again later, or save this meal without analysis for now.' },
    });
  },
});

/** True for POST /:id/analyse, and for create/update bodies that ask for analysis. */
function wantsAnalysis(req: Request): boolean {
  if (req.path.endsWith('/analyse')) return true;
  const body = req.body as { analyse?: unknown } | undefined;
  return body?.analyse === true;
}

/** /meals/* — the signed-in patient's own meals. */
export const mealRoutes = Router();
mealRoutes.use(requirePatient);
mealRoutes.get('/', MealController.list);
mealRoutes.get('/recent', MealController.recent);
mealRoutes.post('/', analyseLimiter, validateBody(MealCreateSchema), MealController.create);
mealRoutes.get('/:id', MealController.get);
mealRoutes.patch('/:id', analyseLimiter, validateBody(MealUpdateSchema), MealController.update);
mealRoutes.post('/:id/analyse', analyseLimiter, MealController.analyse);
mealRoutes.delete('/:id', MealController.remove);

/** /foods — search the food tables. Not patient data, but still signed-in only. */
export const foodRoutes = Router();
foodRoutes.get('/', authenticate, FoodController.search);
