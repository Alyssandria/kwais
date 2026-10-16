import { parseMealText } from '../nutrition/text-parser.js';
import { NUTRIENT_KEYS, type NutrientKey } from '../nutrition/types.js';
import { hasScoreBasis } from './rubric.js';
import type { AnalysisOutput } from './schemas.js';
import type { AiProvider, AnalysisInput, InputKey, ParsedFood } from './types.js';

const LABEL: Record<NutrientKey, string> = { sodium: 'Sodium', potassium: 'Potassium', phosphorus: 'Phosphorus', protein: 'Protein' };
const SALTY = ['toyo', 'toyo_mansi', 'patis', 'bagoong', 'asin', 'oyster_sauce'];
const fmt = (n: number, unit: string) => `${Math.round(n).toLocaleString('en-PH')} ${unit}`;

export function mockAnalysis(input: AnalysisInput): AnalysisOutput {
  const { targets = {}, labs = {}, restrictions = [], allergies = [] } = input.supplied;
  const used = new Set<InputKey>(['meal', 'day']);
  const reasons: AnalysisOutput['scoreReasons'] = [];
  const concerns: string[] = [];
  const basis = hasScoreBasis(input);

  if (!basis) {
    reasons.push({
      title: 'No score yet',
      detail: 'Add a daily target or a lab result with its reference range, and the next analysis will include a score.',
      deduction: null,
    });
  }

  for (const n of NUTRIENT_KEYS) {
    const target = targets[n];
    const unit = input.meal.totals[n].unit;
    const today = input.day.totalsWithMeal[n];
    const lab = labs[n];
    const labHigh = lab && lab.refHigh != null && lab.value > lab.refHigh;
    if (lab) used.add(`lab.${n}`);
    if (labHigh) concerns.push(`Your ${lab.label.toLowerCase()} result (${lab.value} ${lab.unit}, ${lab.collectedOn}) is above the range on your slip.`);

    if (!target) {
      if (basis) reasons.push({ title: `${LABEL[n]} not scored`, detail: `You have not entered a ${n} target.`, deduction: null });
      continue;
    }
    used.add(`target.${n}`);
    const pct = Math.round((today / target.dailyMax) * 100);
    const ofTarget = `Today about ${fmt(today, unit)} of your ${fmt(target.dailyMax, unit)} target.`;
    if (pct > 100) {
      reasons.push({ title: `${LABEL[n]} is over your target`, detail: `${ofTarget}${labHigh ? ' Your latest lab for it is also above its range.' : ''}`, deduction: labHigh ? 3 : 2 });
      concerns.push(`Today's ${n} is above the target you entered.`);
    } else {
      reasons.push({ title: `${LABEL[n]} within your target`, detail: `${ofTarget}${pct >= 80 ? ' That is close to the limit.' : ''}`, deduction: basis ? 0 : null });
    }
  }

  const lowSalt = restrictions.find((r) => /salt|sodium|asin/i.test(r));
  const salty = input.meal.condiments.filter((c) => SALTY.includes(c.name));
  if (lowSalt && salty.length) {
    used.add('restrictions');
    reasons.push({
      title: 'Conflicts with a restriction you entered',
      detail: `Your profile says “${lowSalt}”, and this meal had ${salty.map((c) => c.name.replace('_', '-')).join(', ')}.`,
      deduction: basis ? 2 : null,
    });
  }

  const text = `${input.meal.text} ${input.meal.items.map((i) => i.matchedTo ?? '').join(' ')}`.toLowerCase();
  const allergy = allergies.find((a) => text.includes(a.toLowerCase()));
  if (allergy) {
    used.add('allergies');
    reasons.push({ title: 'Matches an allergy you entered', detail: `You listed “${allergy}” as an allergy.`, deduction: basis ? 3 : null });
  }

  const deducted = reasons.reduce((s, r) => s + (r.deduction ?? 0), 0);
  const assumed = input.meal.items.filter((i) => i.amountAssumed).map((i) => i.food);
  return {
    score: basis ? Math.max(1, 10 - deducted) : null,
    scoreReasons: reasons.slice(0, 6),
    summary: 'Sample analysis made by rules, not by AI, from the numbers above and the details you entered.',
    observations: salty.length ? ['Calamansi or vinegar on its own keeps the flavour with less sodium than soy sauce or patis.'] : [],
    concerns: concerns.slice(0, 4),
    clinicianQuestions: Object.keys(targets).length < 3 ? ['Which daily targets should I track for my kidneys?'] : [],
    dataQuality: assumed.length ? `Amounts were assumed for ${assumed.join(', ')}.` : 'Amounts came from what you typed.',
    usedInputs: [...used].filter((k) => input.allowedInputs.includes(k)),
  };
}

export function createMockProvider(): AiProvider {
  return {
    name: 'mock',
    model: 'mock-rules',
    async parseMeal(text: string): Promise<ParsedFood[]> {
      return parseMealText(text).map((p) => ({
        name: p.label,
        localName: null,
        quantity: p.quantityGiven ? p.quantity : null,
        unit: p.unit,
        preparation: p.preparation,
        isMixedDish: false,
      }));
    },
    async analyseMeal(input: AnalysisInput) {
      return mockAnalysis(input);
    },
  };
}
