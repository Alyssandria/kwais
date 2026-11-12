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

export const DRINK_UNITS = ['baso', 'tasa', 'lata', 'ml'] as const;
const DRINK_MAX: Record<(typeof DRINK_UNITS)[number], number> = { baso: 10, tasa: 10, lata: 6, ml: 3000 };

// { name, quantity, unit }. A bare drink name (sent by older versions of the app) means one glass, marked as assumed.
const drink = z.union([
  z.enum(DRINK_KEYS).transform((name) => ({ name, quantity: 1, unit: 'baso' as const, assumed: true })),
  z
    .object({ name: z.enum(DRINK_KEYS), quantity: z.number().positive('Enter how much you drank'), unit: z.enum(DRINK_UNITS) })
    .strict()
    .refine((d) => d.quantity <= DRINK_MAX[d.unit], { message: 'That is more than K-WAIS accepts for one meal', path: ['quantity'] })
    .transform((d) => ({ ...d, assumed: false })),
]);

const drinks = z
  .array(drink)
  .max(DRINK_KEYS.length)
  .refine((ds) => new Set(ds.map((d) => d.name)).size === ds.length, 'Each drink can be added once');

const fields = {
  category: z.enum(MEAL_CATEGORIES),
  eatenAt,
  rawText: z.string().trim().max(1000, 'Keep it under 1,000 characters'),
  condiments,
  drinks,
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
