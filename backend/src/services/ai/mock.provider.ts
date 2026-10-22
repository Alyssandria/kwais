import { parseMealText } from '../nutrition/text-parser.js';
import { NUTRIENT_KEYS, type NutrientKey } from '../nutrition/types.js';
import { hasScoreBasis } from './rubric.js';
import type { AnalysisOutput } from './schemas.js';
import type { AiProvider, AnalysisInput, InputKey, ParsedFood } from './types.js';

const LABEL: Record<NutrientKey, string> = { sodium: 'Sodium', potassium: 'Potassium', phosphorus: 'Phosphorus', protein: 'Protein' };
const SALTY = ['toyo', 'toyo_mansi', 'patis', 'bagoong', 'asin', 'oyster_sauce'];
const SALTY_WORDS = /\b(maalat|sobrang alat|salty|tuyo|daing|longganisa|tocino|hotdog|corned beef|instant|de lata|bagoong)\b/i;
const MEAL_SHARE = 0.4;
const fmt = (n: number, unit: string) => `${Math.round(n).toLocaleString('en-PH')} ${unit}`;

export function mockAnalysis(input: AnalysisInput): AnalysisOutput {
  const { targets = {}, labs = {}, restrictions = [], allergies = [] } = input.supplied;
  const guidance = input.guidance ?? {};
  const used = new Set<InputKey>(['meal', 'day']);
  const reasons: AnalysisOutput['scoreReasons'] = [];
  const concerns: string[] = [];
  const actions: AnalysisOutput['actions'] = [];
  const basis = hasScoreBasis(input);

  if (!basis) {
    reasons.push({
      title: 'No score yet',
      detail: 'The food tables had no sodium value for this meal. Add a daily target or a lab result with its range for a fuller analysis.',
      deduction: null,
      basis: 'not_scored',
    });
  }

  for (const n of NUTRIENT_KEYS) {
    const target = targets[n];
    const guide = guidance[n];
    const limit = target ?? (input.meal.totals[n].value != null ? guide : undefined);
    const unit = input.meal.totals[n].unit;
    const today = input.day.totalsWithMeal[n];
    const lab = labs[n];
    const labHigh = lab && lab.refHigh != null && lab.value > lab.refHigh;
    if (lab) used.add(`lab.${n}`);
    if (labHigh) concerns.push(`Your ${lab.label.toLowerCase()} result (${lab.value} ${lab.unit}, ${lab.collectedOn}) is above the range on your slip.`);

    if (!limit) {
      if (basis) reasons.push({ title: `${LABEL[n]} not scored`, detail: `Add a ${n} target or lab result to have it scored.`, deduction: null, basis: 'not_scored' });
      continue;
    }
    used.add(target ? `target.${n}` : `guide.${n}`);
    const whose = target ? 'your' : 'the general CKD guidance of';
    const pct = Math.round((today / limit.dailyMax) * 100);
    const ofLimit = `Today about ${fmt(today, unit)} of ${whose} ${fmt(limit.dailyMax, unit)}.`;
    if (pct > 100) {
      reasons.push({
        title: `${LABEL[n]} is over ${target ? 'your target' : 'general guidance'}`,
        detail: `${ofLimit}${labHigh ? ' Your latest lab for it is also above its range.' : ''}`,
        deduction: labHigh ? 3 : 2,
        basis: target ? 'target' : 'guidance',
      });
      concerns.push(`Today's ${n} is above ${target ? 'the target you entered' : 'general guidance for people with CKD'}.`);
      actions.push({ title: `Keep the rest of today low in ${n}`, detail: `You are past ${fmt(limit.dailyMax, unit)} for today, so choose fresh, unsalted food for your next meal.` });
    } else {
      reasons.push({
        title: `${LABEL[n]} within ${target ? 'your target' : 'general guidance'}`,
        detail: `${ofLimit}${pct >= 80 ? ' That is close to the limit.' : ''}`,
        deduction: 0,
        basis: target ? 'target' : 'guidance',
      });
    }
    const mealValue = input.meal.totals[n].value ?? 0;
    if (mealValue > limit.dailyMax * MEAL_SHARE) {
      reasons.push({
        title: `A big share of the day's ${n} in one meal`,
        detail: `This meal alone has about ${fmt(mealValue, unit)}, more than ${Math.round(MEAL_SHARE * 100)}% of ${fmt(limit.dailyMax, unit)}.`,
        deduction: 1,
        basis: 'meal_share',
      });
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
      basis: 'restriction',
    });
  }
  if (salty.length) {
    actions.push({ title: 'Swap the sawsawan', detail: 'Next time, try calamansi or suka on its own. It keeps the flavour with much less sodium than toyo or patis.' });
  }

  const text = `${input.meal.text} ${input.meal.items.map((i) => i.matchedTo ?? '').join(' ')}`.toLowerCase();
  const allergy = allergies.find((a) => text.includes(a.toLowerCase()));
  if (allergy) {
    used.add('allergies');
    reasons.push({ title: 'Matches an allergy you entered', detail: `You listed “${allergy}” as an allergy.`, deduction: basis ? 3 : null, basis: 'allergy' });
  }

  const word = input.meal.text.match(SALTY_WORDS)?.[0];
  if (word) {
    reasons.push({
      title: 'Saltier than the food tables show',
      detail: `You wrote “${word}”. The tables use a typical recipe, so the real sodium was likely higher.`,
      deduction: basis ? 1 : null,
      basis: 'description',
    });
    actions.push({ title: 'Ask for it less salty', detail: `When cooking or ordering ${input.meal.items[0]?.food ?? 'this dish'}, add the salt or patis at the table instead, and go easy on the sabaw.` });
  }

  if (!Object.keys(targets).length) {
    actions.push({ title: 'Add your own targets', detail: 'Enter the daily limits from your doctor or dietitian in your profile, and future scores will fit you instead of general guidance.' });
  }

  const deducted = reasons.reduce((s, r) => s + (r.deduction ?? 0), 0);
  const assumed = input.meal.items.filter((i) => i.amountAssumed).map((i) => i.food);
  return {
    score: basis ? Math.max(1, 10 - deducted) : null,
    scoreReasons: reasons.slice(0, 8),
    summary: 'Sample analysis made by rules, not by AI, from the numbers above and the details you entered.',
    actions: actions.slice(0, 4),
    observations: salty.length ? ['Most of the sodium in meals like this usually comes from the sawsawan, not the food itself.'] : [],
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
