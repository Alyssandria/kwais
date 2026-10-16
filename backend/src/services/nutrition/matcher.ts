import type { Catalog, CatalogFood, FoodMatch } from './types.js';

/**
 * Finds the food composition record for a food phrase.
 * Matching is by name and local names (English, Tagalog, regional), so "kanin", "rice" and
 * "white rice" can all reach the same record. The more specific record wins:
 * "inihaw na manok" matches the grilled-chicken record, not plain chicken.
 */

export const MATCH_THRESHOLD = 0.5;

/** Words that carry no meaning for matching. */
const STOPWORDS = new Set(['na', 'ng', 'ang', 'mga', 'sa', 'a', 'an', 'the', 'of', 'with', 'ni', 'nang', 'and', 'at']);

/** Inflections that mean the same cooking method. */
const SAME_WORD: Record<string, string> = {
  pritong: 'prito', piniritong: 'prito', pinirito: 'prito', fried: 'prito',
  inihaw: 'inihaw', grilled: 'inihaw', ihaw: 'inihaw',
  nilagang: 'nilaga', boiled: 'nilaga',
  ginisang: 'ginisa', sauteed: 'ginisa',
  adobong: 'adobo',
  tinolang: 'tinola',
};

/** Order of preference when two records match equally well. */
const SOURCE_RANK: Record<CatalogFood['source'], number> = { PH_FCT: 0, USDA_FDC: 1, recipe: 2, custom: 3 };

export function normalizeTokens(text: string): string[] {
  return text
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, '')
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, ' ')
    .trim()
    .split(' ')
    .filter((w) => w && !STOPWORDS.has(w))
    .map((w) => SAME_WORD[w] ?? (w.length > 3 && w.endsWith('s') && !w.endsWith('ss') ? w.slice(0, -1) : w));
}

/**
 * How well a candidate name fits the phrase, 0–1.
 *   1.0         same words
 *   0.75–1.0    every word of the name is in the phrase ("manok" in "inihaw na manok")
 *   0.5–0.8     every word of the phrase is in the name ("manok" vs "inihaw na manok")
 *   up to 0.6   partial overlap
 */
export function nameScore(phrase: string[], name: string[]): number {
  if (phrase.length === 0 || name.length === 0) return 0;
  const P = new Set(phrase);
  const N = new Set(name);
  const shared = [...N].filter((w) => P.has(w)).length;
  if (shared === 0) return 0;
  if (shared === P.size && shared === N.size) return 1;
  if (shared === N.size) return 0.75 + 0.25 * (N.size / P.size);
  if (shared === P.size) return 0.5 + 0.3 * (P.size / N.size);
  return 0.6 * (shared / new Set([...P, ...N]).size);
}

interface Indexed {
  food: CatalogFood;
  names: string[][];
}

const indexCache = new WeakMap<Catalog, Indexed[]>();

function index(catalog: Catalog): Indexed[] {
  let idx = indexCache.get(catalog);
  if (!idx) {
    idx = catalog.foods.map((food) => ({
      food,
      names: [food.name, ...food.localNames].map(normalizeTokens).filter((n) => n.length > 0),
    }));
    indexCache.set(catalog, idx);
  }
  return idx;
}

/** Best record for the phrase, or null when nothing reaches the threshold. Never guesses beyond that. */
export function matchFood(phrase: string, catalog: Catalog): FoodMatch | null {
  const words = normalizeTokens(phrase);
  if (words.length === 0) return null;

  let best: { food: CatalogFood; score: number; specificity: number } | null = null;
  for (const { food, names } of index(catalog)) {
    for (const name of names) {
      const score = nameScore(words, name);
      if (score < MATCH_THRESHOLD) continue;
      const better =
        !best ||
        score > best.score + 1e-9 ||
        (Math.abs(score - best.score) < 1e-9 &&
          (name.length > best.specificity ||
            (name.length === best.specificity &&
              (Number(food.verified) > Number(best.food.verified) ||
                (food.verified === best.food.verified && SOURCE_RANK[food.source] < SOURCE_RANK[best.food.source])))));
      if (better) best = { food, score, specificity: name.length };
    }
  }
  if (!best) return null;
  return {
    foodId: best.food.id,
    name: best.food.name,
    source: best.food.source,
    sourceRef: best.food.sourceRef,
    verified: best.food.verified,
    confidence: Math.round(best.score * 1000) / 1000,
  };
}
