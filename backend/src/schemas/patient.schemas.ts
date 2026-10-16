import { z } from 'zod';

const shortList = (label: string) =>
  z
    .array(z.string().trim().min(1).max(60, `Each ${label} must be 60 characters or fewer`))
    .max(30, `Add at most 30 ${label}s`)
    .transform((xs) => [...new Set(xs)]);

export const CKD_STAGES = ['1', '2', '3a', '3b', '4', '5', 'not_sure'] as const;

const thisYear = new Date().getFullYear();

export const ProfileUpdateSchema = z
  .object({
    firstName: z.string().trim().min(1).max(80),
    lastName: z.string().trim().min(1).max(80),
    birthYear: z.number().int().min(thisYear - 120).max(thisYear).nullable(),
    sex: z.enum(['female', 'male', 'intersex', 'prefer_not_to_say']).nullable(),
    dietaryPreferences: shortList('preference'),
    allergies: shortList('allergy'),
    restrictions: shortList('restriction'),
    ckdStage: z.enum(CKD_STAGES).nullable(),
    dialysisStatus: z.enum(['none', 'hemodialysis', 'peritoneal', 'unknown']),
    reminderTime: z
      .string()
      .regex(/^([01]\d|2[0-3]):[0-5]\d$/, 'Use a 24-hour time like 19:00')
      .nullable(),
    onboardingStep: z.number().int().min(0).max(10),
  })
  .partial()
  .strict();

export const NUTRIENT_LIMITS = {
  sodium: { unit: 'mg', max: 10_000 },
  potassium: { unit: 'mg', max: 10_000 },
  phosphorus: { unit: 'mg', max: 5_000 },
  protein: { unit: 'g', max: 300 },
} as const;

export const NutrientParam = z.enum(['sodium', 'potassium', 'phosphorus', 'protein']);

export const TargetSchema = z.object({
  dailyMax: z.number().positive('Enter an amount above zero').finite(),
  note: z.string().trim().max(200).nullable().optional(),
});

export const LAB_TESTS = {
  potassium: 'Potassium',
  phosphorus: 'Phosphorus',
  sodium: 'Sodium',
  creatinine: 'Creatinine',
  egfr: 'eGFR',
  bun: 'BUN',
  albumin: 'Albumin',
  calcium: 'Calcium',
  hemoglobin: 'Hemoglobin',
  bicarbonate: 'Bicarbonate',
  pth: 'PTH',
  uric_acid: 'Uric acid',
  other: 'Other',
} as const;

const labNumber = z.number().finite().min(0, 'Values cannot be negative').max(100_000);

const isoDate = z
  .string()
  .regex(/^\d{4}-\d{2}-\d{2}$/, 'Use a date like 2026-09-28')
  .refine((d) => !Number.isNaN(Date.parse(`${d}T00:00:00Z`)), 'Enter a real date')
  .refine((d) => d >= '1990-01-01', 'Date is too far in the past')
  .refine((d) => Date.parse(`${d}T00:00:00Z`) <= Date.now() + 86_400_000, 'Date cannot be in the future');

const labFields = {
  test: z.enum(Object.keys(LAB_TESTS) as [keyof typeof LAB_TESTS, ...(keyof typeof LAB_TESTS)[]]),
  testLabel: z.string().trim().min(1).max(60).nullable().optional(),
  value: labNumber,
  refLow: labNumber.nullable().optional(),
  refHigh: labNumber.nullable().optional(),
  unit: z.string().trim().min(1, 'Enter the unit printed on your slip').max(30),
  collectedOn: isoDate,
  labName: z.string().trim().max(120).nullable().optional(),
};

const rangeOrder = (v: { refLow?: number | null; refHigh?: number | null }) =>
  v.refLow == null || v.refHigh == null || v.refLow <= v.refHigh;

const otherNeedsLabel = (v: { test?: string; testLabel?: string | null }) => v.test !== 'other' || Boolean(v.testLabel);

export const LabCreateSchema = z
  .object(labFields)
  .refine(rangeOrder, { path: ['refHigh'], message: 'The high end of the range must be above the low end' })
  .refine(otherNeedsLabel, { path: ['testLabel'], message: 'Name the test' });

export const LabUpdateSchema = z
  .object(labFields)
  .partial()
  .strict()
  .refine(rangeOrder, { path: ['refHigh'], message: 'The high end of the range must be above the low end' });

export const ConsentChangeSchema = z.object({
  consentType: z.enum(['ai_processing', 'reminders']),
  granted: z.boolean(),
});

export type ProfileUpdate = z.infer<typeof ProfileUpdateSchema>;
export type TargetBody = z.infer<typeof TargetSchema>;
export type LabCreate = z.infer<typeof LabCreateSchema>;
export type LabUpdate = z.infer<typeof LabUpdateSchema>;
export type ConsentChange = z.infer<typeof ConsentChangeSchema>;
