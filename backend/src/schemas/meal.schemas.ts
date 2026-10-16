import { z } from 'zod';

export const CONDIMENT_KEYS = [
  'toyo', 'toyo_mansi', 'patis', 'bagoong', 'suka', 'asin',
  'ketchup', 'banana_ketchup', 'sarsa', 'mayonnaise', 'sili', 'oyster_sauce',
] as const;
export const CONDIMENT_AMOUNTS = ['konti', 'tsp', 'tbsp', 'marami'] as const;
export const DRINK_KEYS = ['tubig', 'kape', 'tsaa', 'softdrinks', 'juice', 'gatas', 'buko_juice', 'milk_tea'] as const;
export const COOKING_KEYS = ['prito', 'inihaw', 'nilaga', 'ginisa', 'steamed', 'adobo', 'hilaw'] as const;
export const MEAL_CATEGORIES = ['breakfast', 'lunch', 'dinner', 'snack'] as const;

export const MAX_BACKDATE_DAYS = 7;
const CLOCK_SKEW_MS = 5 * 60 * 1000;

const uniqueKeys = <T extends readonly [string, ...string[]]>(keys: T) =>
  z
    .array(z.enum(keys))
    .max(keys.length)
    .transform((xs) => [...new Set(xs)]);

const eatenAt = z
  .string()
  .datetime({ offset: true, message: 'Use a full date and time' })
  .transform((s) => new Date(s))
  .refine((d) => d.getTime() <= Date.now() + CLOCK_SKEW_MS, 'A meal cannot be in the future')
  .refine((d) => d.getTime() >= Date.now() - MAX_BACKDATE_DAYS * 86_400_000, `You can log meals from the last ${MAX_BACKDATE_DAYS} days`);

const condiments = z
  .array(z.object({ name: z.enum(CONDIMENT_KEYS), amount: z.enum(CONDIMENT_AMOUNTS) }).strict())
  .max(CONDIMENT_KEYS.length)
  .refine((cs) => new Set(cs.map((c) => c.name)).size === cs.length, 'Each condiment can be added once');

const fields = {
  category: z.enum(MEAL_CATEGORIES),
  eatenAt,
  rawText: z.string().trim().max(1000, 'Keep it under 1,000 characters'),
  condiments,
  drinks: uniqueKeys(DRINK_KEYS),
  cookingMethods: uniqueKeys(COOKING_KEYS),
  notes: z.string().trim().max(300, 'Keep the note under 300 characters').nullable().optional(),
};

const needsText = (m: { status: string; rawText?: string }) => m.status === 'draft' || (m.rawText?.length ?? 0) >= 2;
const textMessage = { message: 'Tell us what you ate', path: ['rawText'] };

export const MealCreateSchema = z
  .object({
    ...fields,
    rawText: fields.rawText.default(''),
    condiments: condiments.default([]),
    drinks: fields.drinks.default([]),
    cookingMethods: fields.cookingMethods.default([]),
    status: z.enum(['draft', 'saved']),
    analyse: z.boolean().default(false),
  })
  .strict()
  .refine(needsText, textMessage);

export const MealUpdateSchema = z
  .object({
    ...fields,
    status: z.enum(['draft', 'saved']),
    analyse: z.boolean(),
  })
  .partial()
  .strict();

export const MealListQuery = z.object({
  status: z.enum(['draft', 'saved', 'analysed']).optional(),
  category: z.enum(MEAL_CATEGORIES).optional(),
  limit: z.coerce.number().int().min(1).max(50).default(20),
  before: z.string().datetime({ offset: true }).optional(),
});

export type MealCreate = z.infer<typeof MealCreateSchema>;
export type MealUpdate = z.infer<typeof MealUpdateSchema>;
export type MealListParams = z.infer<typeof MealListQuery>;
