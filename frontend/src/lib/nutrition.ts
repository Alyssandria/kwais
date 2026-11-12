import type { StatusKind } from '@/components/ui/Status';

export type NutrientKey = 'sodium' | 'potassium' | 'phosphorus' | 'protein' | 'energy' | 'fluid';
export type NutrientUnit = 'mg' | 'g' | 'kcal' | 'mL';

export const NUTRIENTS: Record<
  NutrientKey,
  { label: string; unit: NutrientUnit; color: string; soft: string; text: string; tile: string }
> = {
  sodium: { label: 'Sodium', unit: 'mg', color: '#0369a1', soft: '#e0f2fe', text: 'text-sodium', tile: 'bg-sodium-soft text-sodium' },
  potassium: { label: 'Potassium', unit: 'mg', color: '#b45309', soft: '#fef3c7', text: 'text-potassium', tile: 'bg-potassium-soft text-potassium' },
  phosphorus: { label: 'Phosphorus', unit: 'mg', color: '#6d28d9', soft: '#ede9fe', text: 'text-phosphorus', tile: 'bg-phosphorus-soft text-phosphorus' },
  protein: { label: 'Protein', unit: 'g', color: '#be123c', soft: '#ffe4e6', text: 'text-protein', tile: 'bg-protein-soft text-protein' },
  energy: { label: 'Calories', unit: 'kcal', color: '#4d7c0f', soft: '#ecfccb', text: 'text-energy', tile: 'bg-energy-soft text-energy' },
  fluid: { label: 'Fluid', unit: 'mL', color: '#0e7490', soft: '#cffafe', text: 'text-fluid', tile: 'bg-fluid-soft text-fluid' },
};

export const NUTRIENT_KEYS: NutrientKey[] = ['sodium', 'potassium', 'phosphorus', 'protein', 'energy', 'fluid'];

// A calorie target is a goal to reach, not a limit: it is never shown as "above" or scored.
export const isGoal = (n: NutrientKey) => n === 'energy';

// Fluid counts only the drinks a patient logs, not soup broth.
export const FLUID_NOTE = 'From the drinks you logged. Soup broth is not counted.';

export function percentOfTarget(value: number, dailyMax: number | null | undefined): number | null {
  if (dailyMax == null || dailyMax <= 0) return null;
  return Math.round((value / dailyMax) * 100);
}

export function targetStatus(pct: number | null): StatusKind {
  if (pct == null) return 'none';
  if (pct > 100) return 'above';
  if (pct >= 80) return 'near';
  return 'within';
}

export function goalStatusText(pct: number | null): string {
  return pct == null ? 'Estimate only · no goal set' : `${pct}% of your goal`;
}

export function targetStatusText(pct: number | null): string {
  switch (targetStatus(pct)) {
    case 'above':
      return `Above your target (${pct}%)`;
    case 'near':
      return `Approaching your target (${pct}%)`;
    case 'within':
      return `Within your target (${pct}%)`;
    default:
      return 'Estimate only · no target set';
  }
}

export function labStatus(value: number, refLow: number | null, refHigh: number | null): StatusKind {
  if (refHigh != null && value > refHigh) return 'above';
  if (refLow != null && value < refLow) return 'below';
  if (refLow == null && refHigh == null) return 'none';
  return 'within';
}

export function labStatusText(kind: StatusKind): string {
  return { above: 'Above slip range', below: 'Below slip range', within: 'Within slip range', near: 'Within slip range', none: 'No range entered' }[kind];
}

export function rangeText(low: number | null, high: number | null): string {
  if (low != null && high != null) return `${low}–${high}`;
  if (low != null) return `above ${low}`;
  if (high != null) return `below ${high}`;
  return 'not entered';
}

const nf = new Intl.NumberFormat('en-PH');
export const fmt = (n: number) => nf.format(Math.round(n));
