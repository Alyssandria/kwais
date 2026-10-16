/**
 * Loads the sample food tables. Runs with `pnpm db:seed`, and automatically after `pnpm db:reset`.
 * Safe to run again: rows are matched on (source, sourceRef) and updated in place.
 *
 * The values are approximate sample data, stored as unverified. See seed-data/sample-foods.ts.
 */
import { prisma } from '../src/config/db.js';
import { FoodModel } from '../src/models/food.model.js';
import { SAMPLE_FOODS, SAMPLE_RECIPES, type SampleFood } from './seed-data/sample-foods.js';

const sampleRef = (ref: string) => `sample:${ref}`;
const portionsOf = (p: Record<string, number> | undefined) => Object.entries(p ?? {}).map(([unit, grams]) => ({ unit, grams }));

async function seedFoods(): Promise<Map<string, string>> {
  const ids = new Map<string, string>();
  for (const f of SAMPLE_FOODS satisfies SampleFood[]) {
    const [sodiumMg, potassiumMg, phosphorusMg, proteinG] = f.per100g;
    const id = await FoodModel.upsert({
      name: f.name,
      localNames: f.localNames.map((n) => n.toLowerCase()),
      category: f.category,
      source: 'custom',
      sourceRef: sampleRef(f.ref),
      verified: false,
      sodiumMg,
      potassiumMg,
      phosphorusMg,
      proteinG,
      portions: portionsOf(f.portions),
    });
    ids.set(f.ref, id);
  }
  return ids;
}

async function seedRecipes(ids: Map<string, string>): Promise<void> {
  for (const r of SAMPLE_RECIPES) {
    const total = Object.values(r.ingredients).reduce((s, g) => s + g, 0);
    if (Math.abs(total - 100) > 0.5) throw new Error(`Recipe ${r.ref}: ingredients add up to ${total} g, not 100 g`);

    const id = await FoodModel.upsert({
      name: r.name,
      localNames: r.localNames.map((n) => n.toLowerCase()),
      category: r.category,
      source: 'recipe',
      sourceRef: sampleRef(r.ref),
      verified: false,
      // A recipe's values are always worked out from its ingredients, never stored.
      sodiumMg: null,
      potassiumMg: null,
      phosphorusMg: null,
      proteinG: null,
      portions: portionsOf(r.portions),
    });
    await FoodModel.setRecipe(
      id,
      Object.entries(r.ingredients).map(([ref, grams]) => {
        const ingredientId = ids.get(ref);
        if (!ingredientId) throw new Error(`Recipe ${r.ref} uses unknown ingredient "${ref}"`);
        return { ingredientId, gramsPer100g: grams };
      }),
    );
  }
}

async function main() {
  const ids = await seedFoods();
  await seedRecipes(ids);
  console.log(`Seeded ${SAMPLE_FOODS.length} sample foods and ${SAMPLE_RECIPES.length} recipes (approximate values, unverified).`);
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
