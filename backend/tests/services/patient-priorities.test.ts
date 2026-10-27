import { describe, expect, it } from 'vitest';
import { buildPriorities } from '../../src/services/patient-priorities.js';
import type { LabView } from '../../src/services/lab.service.js';
import type { MealFacts } from '../../src/services/meal-summary.js';
import type { TargetView } from '../../src/services/target.service.js';

const TZ = 'Asia/Manila';
const now = new Date('2026-10-27T04:00:00Z');

const meal = (date: string, sodium: number | null): MealFacts => ({
  id: `m-${date}-${sodium}`,
  date,
  eatenAt: new Date(`${date}T04:00:00Z`),
  category: 'lunch',
  rawText: 'kanin',
  status: sodium == null ? 'saved' : 'analysed',
  totals:
    sodium == null
      ? null
      : {
          sodium: { value: sodium, unit: 'mg', source: 'estimated', complete: true },
          potassium: { value: 0, unit: 'mg', source: 'estimated', complete: true },
          phosphorus: { value: 0, unit: 'mg', source: 'estimated', complete: true },
          protein: { value: 0, unit: 'g', source: 'estimated', complete: true },
        },
  score: null,
  aiStatus: null,
  ai: null,
});

const target = (dailyMax: number, source: TargetView['source'] = 'clinician_verified'): TargetView => ({
  nutrient: 'sodium',
  dailyMax,
  unit: 'mg',
  source,
  note: null,
  since: '',
  verified: null,
});

const lab = (test: LabView['test'], label: string, value: number, collectedOn: string, refLow: number | null = 3.5, refHigh: number | null = 5.1): LabView => ({
  id: `${test}-${collectedOn}`,
  test,
  label,
  value,
  refLow,
  refHigh,
  unit: 'mmol/L',
  collectedOn,
  labName: null,
  source: 'patient_entered',
  createdAt: '',
  verified: null,
});

const base = { now, timeZone: TZ, meals: [] as MealFacts[], lastMealAt: null as Date | null, targets: [] as TargetView[], labs: [] as LabView[], hasCkdStage: true };

describe('buildPriorities', () => {
  it('flags sodium over the target on most days and an out-of-range lab', () => {
    const days = ['2026-10-21', '2026-10-22', '2026-10-23', '2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'];
    const meals = days.map((d, i) => meal(d, i === 0 ? 1500 : 2600));
    const p = buildPriorities({
      ...base,
      meals,
      lastMealAt: meals[6]!.eatenAt,
      targets: [target(2000)],
      labs: [lab('potassium', 'Potassium', 5.0, '2026-06-01'), lab('potassium', 'Potassium', 5.8, '2026-10-03')],
    });
    expect(p.days.map((d) => d.logged)).toEqual([true, true, true, true, true, true, true]);
    expect(p.loggedToday).toBe(true);
    expect(p.sodium).toEqual({ average: 2443, limit: 2000, limitSource: 'target', daysWithData: 7, daysOver: 6, status: 'above' });
    expect(p.lab).toMatchObject({ label: 'Potassium', value: 5.8, status: 'above' });
    expect(p.flags.map((f) => f.text)).toEqual(['Sodium over target 6 of 7 days', 'Potassium above range']);
    expect(p.attention).toBe(4);
  });

  it('uses general guidance when there is no sodium target, and says so', () => {
    const meals = ['2026-10-24', '2026-10-25', '2026-10-26', '2026-10-27'].map((d) => meal(d, 2100));
    const p = buildPriorities({ ...base, meals, lastMealAt: meals[3]!.eatenAt });
    expect(p.sodium).toMatchObject({ limit: 2000, limitSource: 'guidance', daysOver: 4 });
    expect(p.flags.map((f) => f.text)).toEqual(['Sodium over general guidance 4 of 7 days', 'No targets yet']);
  });

  it('counts saved meals as logged days but leaves them out of the sodium average', () => {
    const p = buildPriorities({ ...base, meals: [meal('2026-10-27', null), meal('2026-10-26', 1600)], lastMealAt: new Date('2026-10-27T04:00:00Z'), targets: [target(2000)] });
    expect(p.daysLogged).toBe(2);
    expect(p.sodium).toMatchObject({ average: 1600, daysWithData: 1, status: 'near' });
  });

  it('flags patients who stopped or never started logging', () => {
    expect(buildPriorities({ ...base, lastMealAt: new Date('2026-10-23T04:00:00Z'), targets: [target(2000)] }).flags[0]).toEqual({
      kind: 'not_logging',
      severity: 'warn',
      text: 'No meals for 4 days',
    });
    const never = buildPriorities({ ...base, hasCkdStage: false });
    expect(never.flags.map((f) => f.kind)).toEqual(['never_logged', 'no_ckd_stage', 'no_targets']);
    expect(never.sodium.status).toBe('none');
    expect(never.lastMealAt).toBeNull();
  });

  it('marks unverified targets as information, not a problem', () => {
    const meals = [meal('2026-10-27', 900)];
    const p = buildPriorities({ ...base, meals, lastMealAt: meals[0]!.eatenAt, targets: [target(2000, 'patient_entered')], labs: [lab('potassium', 'Potassium', 4.6, '2026-10-12')] });
    expect(p.flags).toEqual([{ kind: 'targets_unverified', severity: 'info', text: 'Targets not verified' }]);
    expect(p.attention).toBe(0);
    expect(p.lab).toMatchObject({ value: 4.6, status: 'within' });
  });

  it('says on track when nothing needs a look', () => {
    const meals = [meal('2026-10-27', 900)];
    const p = buildPriorities({ ...base, meals, lastMealAt: meals[0]!.eatenAt, targets: [target(2000)] });
    expect(p.flags).toEqual([{ kind: 'on_track', severity: 'ok', text: 'On track' }]);
  });
});
