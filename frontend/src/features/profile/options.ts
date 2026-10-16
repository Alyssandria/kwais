import type { CkdStage, Dialysis, LabTest, Sex } from './api';

export const RESTRICTION_SUGGESTIONS = [
  'Low-salt diet',
  'Low-potassium diet',
  'Low-phosphorus diet',
  'Protein limit',
  'Fluid limit',
  'Diabetic diet',
];

export const PREFERENCE_SUGGESTIONS = ['Vegetarian', 'Pescatarian', 'Halal', 'No pork', 'No beef'];

export const ALLERGY_SUGGESTIONS = ['Shrimp', 'Crab', 'Shellfish', 'Peanuts', 'Egg', 'Milk', 'Soy', 'Fish'];

export const CKD_STAGE_OPTIONS: { value: CkdStage; label: string }[] = [
  { value: '1', label: 'Stage 1' },
  { value: '2', label: 'Stage 2' },
  { value: '3a', label: 'Stage 3a' },
  { value: '3b', label: 'Stage 3b' },
  { value: '4', label: 'Stage 4' },
  { value: '5', label: 'Stage 5' },
  { value: 'not_sure', label: 'My doctor hasn’t told me / not sure' },
];

export const DIALYSIS_OPTIONS: { value: Dialysis; label: string }[] = [
  { value: 'none', label: 'Not on dialysis' },
  { value: 'hemodialysis', label: 'Hemodialysis' },
  { value: 'peritoneal', label: 'Peritoneal dialysis' },
  { value: 'unknown', label: 'Prefer not to say' },
];

export const SEX_OPTIONS: { value: Sex; label: string }[] = [
  { value: 'female', label: 'Female' },
  { value: 'male', label: 'Male' },
  { value: 'intersex', label: 'Intersex' },
  { value: 'prefer_not_to_say', label: 'Prefer not to say' },
];

export const ckdLabel = (v: CkdStage) => CKD_STAGE_OPTIONS.find((o) => o.value === v)?.label ?? v;

export const LAB_TEST_OPTIONS: { value: LabTest; label: string; units: string[] }[] = [
  { value: 'potassium', label: 'Potassium', units: ['mmol/L', 'mEq/L'] },
  { value: 'phosphorus', label: 'Phosphorus', units: ['mmol/L', 'mg/dL'] },
  { value: 'sodium', label: 'Sodium', units: ['mmol/L', 'mEq/L'] },
  { value: 'creatinine', label: 'Creatinine', units: ['µmol/L', 'mg/dL'] },
  { value: 'egfr', label: 'eGFR', units: ['mL/min/1.73m²'] },
  { value: 'bun', label: 'BUN', units: ['mmol/L', 'mg/dL'] },
  { value: 'albumin', label: 'Albumin', units: ['g/L', 'g/dL'] },
  { value: 'calcium', label: 'Calcium', units: ['mmol/L', 'mg/dL'] },
  { value: 'hemoglobin', label: 'Hemoglobin', units: ['g/L', 'g/dL'] },
  { value: 'bicarbonate', label: 'Bicarbonate', units: ['mmol/L', 'mEq/L'] },
  { value: 'pth', label: 'PTH', units: ['pg/mL', 'pmol/L'] },
  { value: 'uric_acid', label: 'Uric acid', units: ['µmol/L', 'mg/dL'] },
  { value: 'other', label: 'Other test', units: [] },
];
