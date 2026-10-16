import type { NutrientKey } from '@/lib/nutrition';
import type { DaySummary, PatientDashboard } from './types';

const iso = (d: Date) => d.toISOString().slice(0, 10);

function daysAgo(n: number, h = 12, m = 0): Date {
  const d = new Date();
  d.setDate(d.getDate() - n);
  d.setHours(h, m, 0, 0);
  return d;
}

const t = (sodium: number, potassium: number, phosphorus: number, protein: number): Record<NutrientKey, number> => ({
  sodium,
  potassium,
  phosphorus,
  protein,
});

export function buildSampleDashboard(): PatientDashboard {
  const breakfast = t(480, 520, 210, 14);
  const lunch = t(1580, 615, 320, 30);

  const pastWeek: [number, Record<NutrientKey, number>][] = [
    [7, t(1820, 1650, 720, 44)],
    [6, t(2150, 1840, 810, 52)],
    [8, t(1640, 1500, 650, 40)],
    [5, t(2380, 1720, 880, 55)],
    [6, t(1900, 1580, 700, 47)],
    [7, t(1710, 1690, 690, 43)],
  ];
  const week: DaySummary[] = pastWeek.map(([score, totals], i) => ({
    date: iso(daysAgo(6 - i)),
    score,
    totals,
  }));
  week.push({ date: iso(daysAgo(0)), score: 6, totals: t(2060, 1135, 530, 44) });

  const counts = [3, 2, 4, 3, 0, 2, 3, 3, 4, 2, 1, 3, 3, 2, 4, 3, 3, 0, 2, 3, 4, 3, 3, 2, 4, 3, 3, 2];
  const consistency = counts.map((meals, i) => ({ date: iso(daysAgo(27 - i)), meals }));

  const labDates = [daysAgo(217), daysAgo(117), daysAgo(61), daysAgo(17)].map(iso);
  const hist = (vals: number[]) => vals.map((value, i) => ({ collectedOn: labDates[i]!, value }));

  return {
    isSample: true,
    sampleInsights: true,
    generatedAt: new Date().toISOString(),
    today: {
      date: iso(daysAgo(0)),
      mealsLogged: [
        { category: 'breakfast', eatenAt: daysAgo(0, 7, 15).toISOString() },
        { category: 'lunch', eatenAt: daysAgo(0, 12, 40).toISOString() },
      ],
      streakDays: 5,
      averageScore: 6,
      scoredMeals: 2,
      nutrients: {
        sodium: { value: 2060, unit: 'mg', target: 2000, targetSource: 'patient_entered', hasEstimates: true },
        potassium: { value: 1135, unit: 'mg', target: 2000, targetSource: 'patient_entered', hasEstimates: true },
        phosphorus: { value: 530, unit: 'mg', target: null, targetSource: null, hasEstimates: true },
        protein: { value: 44, unit: 'g', target: 50, targetSource: 'patient_entered', hasEstimates: false },
      },
      byMeal: [
        { category: 'breakfast', values: breakfast },
        { category: 'lunch', values: lunch },
      ],
    },
    week,
    labs: [
      { test: 'potassium', label: 'Potassium', unit: 'mmol/L', refLow: 3.5, refHigh: 5.1, source: 'patient_entered', history: hist([5.0, 5.2, 5.4, 5.6]) },
      { test: 'phosphorus', label: 'Phosphorus', unit: 'mmol/L', refLow: 0.8, refHigh: 1.5, source: 'patient_entered', history: hist([1.6, 1.7, 1.8, 1.9]) },
      { test: 'egfr', label: 'eGFR', unit: 'mL/min/1.73m²', refLow: 60, refHigh: null, source: 'patient_entered', history: hist([44, 42, 41, 38]) },
      { test: 'sodium', label: 'Sodium', unit: 'mmol/L', refLow: 135, refHigh: 145, source: 'patient_entered', history: hist([140, 138, 139, 139]) },
    ],
    consistency,
    recentMeals: [
      { id: 'sample-lunch', category: 'lunch', eatenAt: daysAgo(0, 12, 40).toISOString(), summary: 'Kanin 1 tasa, inihaw na manok, pinakbet ½ tasa, toyo-mansi', score: 5, status: 'analysed' },
      { id: 'sample-breakfast', category: 'breakfast', eatenAt: daysAgo(0, 7, 15).toISOString(), summary: 'Pandesal 2 piraso, scrambled egg, kape', score: 7, status: 'analysed' },
      { id: 'sample-dinner', category: 'dinner', eatenAt: daysAgo(1, 19, 30).toISOString(), summary: 'Sinigang na baboy, kanin 1 tasa, patis', score: 4, status: 'analysed' },
      { id: 'sample-snack', category: 'snack', eatenAt: daysAgo(1, 15, 10).toISOString(), summary: '1 mansanas, tubig', score: null, status: 'saved' },
    ],
    insights: [
      {
        id: 'i1',
        title: 'Toyo-mansi gave over half of lunch sodium',
        body: 'About 880 mg of lunch’s 1,580 mg came from 1 tbsp of soy sauce, putting today above your 2,000 mg target. Calamansi on its own is a lower-sodium option to ask about.',
        source: { label: 'Lunch today', href: '/patient/meals/sample-lunch' },
      },
      {
        id: 'i2',
        title: 'Sinigang broth adds sodium',
        body: 'Most of last night’s sodium came from the soup base and patis. Eating more of the vegetables and less broth is one option to discuss with your dietitian.',
        source: { label: 'Dinner yesterday', href: '/patient/meals/sample-dinner' },
      },
      {
        id: 'i3',
        title: 'Phosphorus has no target yet',
        body: 'Your lab slip shows phosphorus above its printed range, but you have not entered a phosphorus target. Ask your care team what daily amount suits you.',
        source: { label: 'Your lab results', href: '/patient/labs' },
      },
    ],
  };
}
