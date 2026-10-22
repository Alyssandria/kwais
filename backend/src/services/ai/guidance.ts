import type { NutrientKey } from '../nutrition/types.js';

export interface Guidance {
  dailyMax: number;
  unit: 'mg' | 'g';
  source: string;
}

export const GENERAL_GUIDANCE: Partial<Record<NutrientKey, Guidance>> = {
  sodium: { dailyMax: 2000, unit: 'mg', source: 'KDIGO 2024 guideline for adults with CKD: under 2 g of sodium a day' },
};

export function guidanceWithout(targets: Partial<Record<NutrientKey, unknown>> | undefined): Partial<Record<NutrientKey, Guidance>> {
  const out: Partial<Record<NutrientKey, Guidance>> = {};
  for (const [n, g] of Object.entries(GENERAL_GUIDANCE) as [NutrientKey, Guidance][]) {
    if (!targets?.[n]) out[n] = g;
  }
  return out;
}
