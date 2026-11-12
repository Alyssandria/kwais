import { readFile, writeFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { parseFoodCsv } from '../src/services/nutrition/food-csv.js';
import { buildPhilFctBase } from '../src/services/nutrition/philfct.js';

// pnpm db:build-philfct <path to fnri_detailed_nutritional_data.csv>
// Writes prisma/seed-data/philfct-base.csv, ready for: pnpm db:import-foods prisma/seed-data/philfct-base.csv

const SELECTION = fileURLToPath(new URL('./seed-data/philfct-base-selection.csv', import.meta.url));
const OUTPUT = fileURLToPath(new URL('./seed-data/philfct-base.csv', import.meta.url));

async function main() {
  const source = process.argv[2];
  if (!source) {
    console.error('Usage: pnpm db:build-philfct <path to fnri_detailed_nutritional_data.csv>');
    process.exitCode = 1;
    return;
  }

  const build = buildPhilFctBase(await readFile(source, 'utf8'), await readFile(SELECTION, 'utf8'));
  if (build.errors.length) {
    console.error(`Nothing written. ${build.errors.length} problem(s):`);
    for (const e of build.errors) console.error(`  ${e}`);
    process.exitCode = 1;
    return;
  }

  // Same checks the importer runs, so a file written here always imports.
  const check = parseFoodCsv(build.csv);
  if (check.errors.length) {
    console.error('Nothing written. The built file would not import:');
    for (const e of check.errors) console.error(`  ${e}`);
    process.exitCode = 1;
    return;
  }

  await writeFile(OUTPUT, build.csv, 'utf8');
  console.log(`Wrote ${build.count} PhilFCT foods to ${OUTPUT}`);
  for (const [nutrient, ids] of Object.entries(build.missing)) {
    console.log(`  ${nutrient}: reported for ${build.count - ids.length} of ${build.count}`);
  }
  console.log('Every row is unverified. Check each against PhilFCT, set verified to true, then import:');
  console.log('  pnpm db:import-foods prisma/seed-data/philfct-base.csv');
}

main().catch((err) => {
  console.error(err);
  process.exitCode = 1;
});
