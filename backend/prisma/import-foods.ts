/**
 * Imports food composition records from a CSV file:
 *   pnpm db:import-foods path/to/foods.csv
 *
 * The whole file is checked first; nothing is written if any row has a problem.
 * Rows are matched on (source, source_ref), so re-importing a corrected file updates in place.
 * Format: see src/services/nutrition/food-csv.ts and prisma/seed-data/README.md.
 */
import { readFile } from 'node:fs/promises';
import { prisma } from '../src/config/db.js';
import { FoodModel } from '../src/models/food.model.js';
import { parseFoodCsv } from '../src/services/nutrition/food-csv.js';

async function main() {
  const file = process.argv[2];
  if (!file) {
    console.error('Usage: pnpm db:import-foods <file.csv>');
    process.exitCode = 1;
    return;
  }

  const { rows, errors } = parseFoodCsv(await readFile(file, 'utf8'));
  if (errors.length) {
    console.error(`Nothing imported. ${errors.length} problem(s) in ${file}:`);
    for (const e of errors) console.error(`  ${e}`);
    process.exitCode = 1;
    return;
  }

  for (const r of rows) await FoodModel.upsert(r);
  const verified = rows.filter((r) => r.verified).length;
  console.log(`Imported ${rows.length} foods from ${file} (${verified} verified, ${rows.length - verified} unverified).`);
  console.log('Restart the API (or wait 5 minutes) for analyses to use them.');
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
