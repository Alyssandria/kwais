import type { CondimentAmount, DrinkUnit, MealCategory, MealCondiment, MealDrink } from './api';

export const MEAL_TYPES: { value: MealCategory; label: string; hint: string }[] = [
  { value: 'breakfast', label: 'Breakfast', hint: 'Almusal' },
  { value: 'lunch', label: 'Lunch', hint: 'Tanghalian' },
  { value: 'dinner', label: 'Dinner', hint: 'Hapunan' },
  { value: 'snack', label: 'Snack', hint: 'Meryenda' },
];

export const CONDIMENTS: { value: string; label: string }[] = [
  { value: 'toyo', label: 'Toyo' },
  { value: 'toyo_mansi', label: 'Toyo-mansi' },
  { value: 'patis', label: 'Patis' },
  { value: 'bagoong', label: 'Bagoong' },
  { value: 'suka', label: 'Suka' },
  { value: 'asin', label: 'Asin' },
  { value: 'ketchup', label: 'Ketchup' },
  { value: 'banana_ketchup', label: 'Banana ketchup' },
  { value: 'sarsa', label: 'Sarsa (lechon sauce)' },
  { value: 'mayonnaise', label: 'Mayonnaise' },
  { value: 'sili', label: 'Sili / chili sauce' },
  { value: 'oyster_sauce', label: 'Oyster sauce' },
];

export const AMOUNTS: { value: CondimentAmount; label: string }[] = [
  { value: 'konti', label: 'Konti' },
  { value: 'tsp', label: '1 tsp' },
  { value: 'tbsp', label: '1 tbsp' },
  { value: 'marami', label: 'Marami' },
];

export const DRINKS: { value: string; label: string }[] = [
  { value: 'tubig', label: 'Tubig' },
  { value: 'kape', label: 'Kape' },
  { value: 'tsaa', label: 'Tsaa' },
  { value: 'softdrinks', label: 'Softdrinks' },
  { value: 'juice', label: 'Juice' },
  { value: 'gatas', label: 'Gatas' },
  { value: 'buko_juice', label: 'Buko juice' },
  { value: 'milk_tea', label: 'Milk tea' },
];

export const DRINK_UNITS: { value: DrinkUnit; label: string }[] = [
  { value: 'baso', label: 'Baso' },
  { value: 'tasa', label: 'Tasa' },
  { value: 'lata', label: 'Lata' },
  { value: 'ml', label: 'mL' },
];

// Standard sizes used to switch between units in the form. Matches the backend.
export const DRINK_UNIT_ML: Record<DrinkUnit, number> = { baso: 240, tasa: 240, lata: 330, ml: 1 };

export const COOKING: { value: string; label: string }[] = [
  { value: 'prito', label: 'Prito' },
  { value: 'inihaw', label: 'Inihaw' },
  { value: 'nilaga', label: 'Nilaga' },
  { value: 'ginisa', label: 'Ginisa' },
  { value: 'steamed', label: 'Steamed' },
  { value: 'adobo', label: 'Adobo-style' },
  { value: 'hilaw', label: 'Hilaw' },
];

const labelIn = (list: { value: string; label: string }[]) => (v: string) => list.find((o) => o.value === v)?.label ?? v;
export const condimentLabel = labelIn(CONDIMENTS);
export const amountLabel = labelIn(AMOUNTS);
export const drinkLabel = labelIn(DRINKS);
export const cookingLabel = labelIn(COOKING);

const unitWord = (d: Pick<MealDrink, 'quantity' | 'unit'>) => (d.unit === 'ml' ? 'mL' : d.unit);
export const drinkText = (d: MealDrink) =>
  `${drinkLabel(d.name)} (${d.assumed ? 'amount not given' : `${Math.round(d.quantity * 100) / 100} ${unitWord(d)}`})`;
export const mealLabel = (c: MealCategory) => MEAL_TYPES.find((m) => m.value === c)!.label;

export function defaultCategory(d: Date): MealCategory {
  const h = d.getHours();
  if (h >= 4 && h < 10) return 'breakfast';
  if (h >= 10 && h < 15) return 'lunch';
  if (h >= 15 && h < 18) return 'snack';
  return 'dinner';
}

export interface MealForm {
  category: MealCategory;
  rawText: string;
  condiments: MealCondiment[];
  drinks: MealDrink[];
  cookingMethods: string[];
  notes: string;
}

export function summaryOf(f: MealForm): string {
  const parts: string[] = [];
  if (f.rawText.trim()) parts.push(f.rawText.trim());
  if (f.condiments.length) {
    parts.push(`with ${f.condiments.map((c) => `${condimentLabel(c.name)} (${amountLabel(c.amount).toLowerCase()})`).join(', ')}`);
  }
  if (f.drinks.length) parts.push(`drinks: ${f.drinks.map(drinkText).join(', ').toLowerCase()}`);
  if (f.cookingMethods.length) parts.push(`cooked: ${f.cookingMethods.map(cookingLabel).join(', ').toLowerCase()}`);
  if (f.notes.trim()) parts.push(`note: ${f.notes.trim()}`);
  return parts.length ? `${parts.join('; ')}.` : 'Nothing entered yet.';
}

export function whenText(category: MealCategory, iso: string, now = new Date()): string {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  const days = Math.round((startOfDay(now).getTime() - startOfDay(d).getTime()) / 86_400_000);
  const day =
    days === 0 ? 'today' : days === 1 ? 'yesterday' : d.toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric', month: 'short' });
  return `${mealLabel(category)} · ${day}, ${time}`;
}

export function startOfDay(d: Date): Date {
  const x = new Date(d);
  x.setHours(0, 0, 0, 0);
  return x;
}
