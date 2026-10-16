const UNIT_SYNONYMS: Record<string, string[]> = {
  g: ['g', 'gm', 'gms', 'gr', 'gram', 'grams', 'gramo'],
  ml: ['ml', 'mL', 'milliliter', 'milliliters', 'millilitre', 'millilitres'],
  tasa: ['tasa', 'cup', 'cups'],
  sandok: ['sandok', 'ladle', 'ladles', 'scoop', 'scoops'],
  mangkok: ['mangkok', 'bowl', 'bowls'],
  piraso: [
    'piraso', 'pc', 'pcs', 'piece', 'pieces', 'buo', 'whole',
    'hita', 'pitso', 'pakpak', 'thigh', 'thighs', 'breast', 'breasts', 'leg', 'legs', 'wing', 'wings', 'drumstick', 'drumsticks',
    'stick', 'sticks', 'patty', 'patties',
  ],
  hiwa: ['hiwa', 'slice', 'slices'],
  baso: ['baso', 'glass', 'glasses'],
  lata: ['lata', 'can', 'cans', 'tin'],
  pakete: ['pakete', 'pack', 'packs', 'packet', 'packets', 'sachet', 'sachets', 'pouch'],
  tbsp: ['tbsp', 'tbs', 'tablespoon', 'tablespoons', 'kutsara'],
  tsp: ['tsp', 'teaspoon', 'teaspoons', 'kutsarita'],
  serving: ['serving', 'servings', 'order', 'orders', 'plate', 'plates', 'plato', 'platito'],
};

const UNIT_LOOKUP = new Map<string, string>();
for (const [canonical, words] of Object.entries(UNIT_SYNONYMS)) {
  for (const w of words) UNIT_LOOKUP.set(w.toLowerCase(), canonical);
}

export const CANONICAL_UNITS = Object.keys(UNIT_SYNONYMS);

export function toUnit(word: string): string | null {
  const w = word.toLowerCase();
  const direct = UNIT_LOOKUP.get(w);
  if (direct) return direct;
  if (w.endsWith('ng') && w.length > 3) return UNIT_LOOKUP.get(w.slice(0, -2)) ?? null;
  return null;
}

export const STANDARD_GRAMS: Record<string, number> = { g: 1, ml: 1, tbsp: 15, tsp: 5 };

export const DRINK_GLASS_GRAMS = 240;

const NUMBER_WORDS: Record<string, number> = {
  a: 1, an: 1, one: 1, isa: 1, isang: 1,
  two: 2, dalawa: 2, dalawang: 2,
  three: 3, tatlo: 3, tatlong: 3,
  four: 4, apat: 4,
  five: 5, lima: 5, limang: 5,
  six: 6, anim: 6,
  half: 0.5, kalahati: 0.5, kalahating: 0.5,
  quarter: 0.25, kapat: 0.25,
};

const UNICODE_FRACTIONS: Record<string, number> = { '½': 0.5, '¼': 0.25, '¾': 0.75, '⅓': 1 / 3, '⅔': 2 / 3 };

export function parseAmountToken(token: string): number | null {
  const t = token.toLowerCase();
  if (t in UNICODE_FRACTIONS) return UNICODE_FRACTIONS[t]!;
  const mixed = /^(\d+)([½¼¾⅓⅔])$/.exec(t);
  if (mixed) return Number(mixed[1]) + UNICODE_FRACTIONS[mixed[2]!]!;
  if (/^\d+(\.\d+)?$/.test(t)) return Number(t);
  const frac = /^(\d+)\/(\d+)$/.exec(t);
  if (frac && Number(frac[2]) > 0) return Number(frac[1]) / Number(frac[2]);
  return NUMBER_WORDS[t] ?? null;
}
