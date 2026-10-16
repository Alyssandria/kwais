import { prisma } from '../src/config/db.js';
import { env } from '../src/config/env.js';
import { createGeminiProvider } from '../src/services/ai/gemini.provider.js';
import { buildAnalysisInput } from '../src/services/ai/inputs.js';
import { createMockProvider } from '../src/services/ai/mock.provider.js';
import { checkAnalysis } from '../src/services/ai/rubric.js';
import { toParsedItem } from '../src/services/ai/ai.service.js';
import { FoodService } from '../src/services/food.service.js';
import { estimateMeal } from '../src/services/nutrition/engine.js';

const MEALS: { text: string; expect: string[] }[] = [
  { text: '1 tasa kanin, isang hita ng inihaw na manok, kalahating tasa pinakbet', expect: ['kanin|rice', 'manok|chicken', 'pinakbet'] },
  { text: '2 pandesal at kape', expect: ['pandesal', 'kape|coffee'] },
  { text: 'sinigang na baboy, 1 tasa kanin', expect: ['sinigang', 'kanin|rice'] },
  { text: 'tapsilog', expect: ['tapsilog|tapa'] },
  { text: 'isang mangkok na lugaw with itlog', expect: ['lugaw|congee|porridge', 'itlog|egg'] },
  { text: 'adobong manok, 2 sandok na kanin', expect: ['adobo', 'kanin|rice'] },
  { text: '1 piraso pritong tilapia at kalahating tasa ginisang monggo', expect: ['tilapia', 'monggo|mung'] },
  { text: 'pancit bihon, 1 hiwa tinapay', expect: ['pancit|bihon', 'tinapay|bread'] },
  { text: 'tinolang manok with malunggay, 1 cup rice', expect: ['tinola', 'rice|kanin'] },
  { text: '3 piraso longganisa, sinangag, pritong itlog', expect: ['longganisa|sausage', 'sinangag|garlic', 'itlog|egg'] },
  { text: 'nilagang baka with repolyo at patatas', expect: ['nilaga|beef'] },
  { text: '1 saging na saba, nilaga', expect: ['saba|banana|plantain'] },
  { text: 'tortang talong at kanin', expect: ['torta|eggplant|talong', 'kanin|rice'] },
  { text: '2 piraso turon at buko juice', expect: ['turon', 'buko|coconut'] },
  { text: 'isang lata sardinas with 1 tasa kanin', expect: ['sardin', 'kanin|rice'] },
  { text: '1 cheeseburger and medium fries', expect: ['burger', 'fries'] },
  { text: 'spaghetti and 1 slice of pizza', expect: ['spaghetti', 'pizza'] },
  { text: 'oatmeal with half a banana', expect: ['oat', 'banana|saging'] },
  { text: 'grilled salmon, steamed broccoli, half cup brown rice', expect: ['salmon', 'broccoli', 'rice'] },
  { text: '2 slices of whole wheat bread with peanut butter', expect: ['bread', 'peanut'] },
];

const provider =
  env.AI_PROVIDER === 'gemini' && env.GEMINI_API_KEY
    ? createGeminiProvider({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL, timeoutMs: env.AI_TIMEOUT_MS })
    : createMockProvider();

async function main() {
  const catalog = await FoodService.catalog();
  let parseOk = 0;
  let analysisOk = 0;
  console.log(`Provider: ${provider.name} (${provider.model})\n`);

  for (const m of MEALS) {
    const line: string[] = [m.text.slice(0, 60).padEnd(62)];
    try {
      const foods = await provider.parseMeal(m.text);
      const names = foods.map((f) => `${f.name} ${f.localName ?? ''}`.toLowerCase());
      const missing = m.expect.filter((e) => !names.some((n) => new RegExp(e).test(n)));
      if (missing.length === 0 && foods.length >= m.expect.length) parseOk++;
      line.push(missing.length ? `parse ✗ missing ${missing.join(', ')}` : `parse ✓ ${foods.length}`);

      const engine = estimateMeal({ rawText: m.text, condiments: [{ name: 'toyo', amount: 'tsp' }], drinks: ['tubig'], cookingMethods: [] }, catalog, foods.map(toParsedItem));
      const input = buildAnalysisInput({
        meal: { rawText: m.text, condiments: [{ name: 'toyo', amount: 'tsp' }], drinks: ['tubig'], cookingMethods: [], category: 'lunch', eatenAtLocal: '2026-10-16 12:30' },
        engine,
        day: { date: '2026-10-16', earlierMeals: 1, totalsBeforeMeal: { sodium: 600, potassium: 500, phosphorus: 300, protein: 15 } },
        profile: { ckdStage: { value: '3b', source: 'patient_entered' }, dialysisStatus: 'none', restrictions: ['Low-salt diet'], allergies: ['Shrimp'], dietaryPreferences: [] },
        targets: [{ nutrient: 'sodium', dailyMax: 2000, unit: 'mg', source: 'patient_entered', note: null, since: '' }],
        labs: [{ id: 'x', test: 'potassium', label: 'Potassium', value: 5.6, refLow: 3.5, refHigh: 5.1, unit: 'mmol/L', collectedOn: '2026-09-28', labName: null, source: 'patient_entered', createdAt: '' }],
      });
      const out = checkAnalysis(await provider.analyseMeal(input), input);
      analysisOk++;
      line.push(`analysis ✓ score ${out.score}`);
    } catch (err) {
      line.push(`✗ ${(err as Error).message}`);
    }
    console.log(line.join('  '));
  }

  console.log(`\nParsed correctly: ${parseOk}/${MEALS.length}. Analyses passing validation: ${analysisOk}/${MEALS.length}.`);
  process.exitCode = parseOk === MEALS.length && analysisOk === MEALS.length ? 0 : 1;
}

main()
  .catch((err) => {
    console.error(err);
    process.exitCode = 1;
  })
  .finally(() => prisma.$disconnect());
