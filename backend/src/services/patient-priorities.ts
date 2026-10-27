import { lastLocalDays, localDate } from '../lib/time.js';
import { GENERAL_GUIDANCE } from './ai/guidance.js';
import type { LabView } from './lab.service.js';
import { rollupByDay, type MealFacts } from './meal-summary.js';
import type { TargetView } from './target.service.js';

export type Severity = 'bad' | 'warn' | 'info' | 'ok';
export type Status = 'above' | 'near' | 'within' | 'below' | 'none';

export interface Flag {
  kind: 'sodium_over' | 'lab_out_of_range' | 'not_logging' | 'never_logged' | 'no_ckd_stage' | 'targets_unverified' | 'no_targets' | 'on_track';
  severity: Severity;
  text: string;
}

export interface PatientPriorities {
  days: { date: string; logged: boolean }[];
  daysLogged: number;
  loggedToday: boolean;
  lastMealAt: string | null;
  daysSinceLastMeal: number | null;
  sodium: {
    average: number | null;
    limit: number;
    limitSource: 'target' | 'guidance';
    daysWithData: number;
    daysOver: number;
    status: Status;
  };
  lab: { label: string; value: number; unit: string; refLow: number | null; refHigh: number | null; collectedOn: string; status: Status; source: LabView['source'] } | null;
  unverifiedTargets: number;
  flags: Flag[];
  attention: number;
}

export const NOT_LOGGING_DAYS = 3;
export const SODIUM_OVER_DAYS = 4;
const WINDOW = 7;
const RANK: Record<Severity, number> = { bad: 2, warn: 1, info: 0, ok: 0 };

const labStatus = (l: LabView): Status => {
  if (l.refHigh != null && l.value > l.refHigh) return 'above';
  if (l.refLow != null && l.value < l.refLow) return 'below';
  if (l.refHigh == null && l.refLow == null) return 'none';
  return 'within';
};

const daysBetween = (from: string, to: string) => Math.round((Date.parse(`${to}T00:00:00Z`) - Date.parse(`${from}T00:00:00Z`)) / 86_400_000);

function latestPerTest(labs: LabView[]): LabView[] {
  const latest = new Map<string, LabView>();
  for (const l of labs) {
    const key = l.test === 'other' ? `other:${l.label.toLowerCase()}` : l.test;
    const prev = latest.get(key);
    if (!prev || l.collectedOn > prev.collectedOn) latest.set(key, l);
  }
  return [...latest.values()].sort((a, b) => b.collectedOn.localeCompare(a.collectedOn));
}

export function buildPriorities(input: {
  now: Date;
  timeZone: string;
  meals: MealFacts[];
  lastMealAt: Date | null;
  targets: TargetView[];
  labs: LabView[];
  hasCkdStage: boolean;
}): PatientPriorities {
  const { now, timeZone, meals, lastMealAt, targets, labs } = input;
  const { dates } = lastLocalDays(now, timeZone, WINDOW);
  const today = dates[dates.length - 1]!;
  const rolled = rollupByDay(dates, meals);
  const days = dates.map((date) => ({ date, logged: rolled.get(date)!.meals > 0 }));
  const flags: Flag[] = [];

  const target = targets.find((t) => t.nutrient === 'sodium');
  const limit = target?.dailyMax ?? GENERAL_GUIDANCE.sodium!.dailyMax;
  const limitWord = target ? 'target' : 'general guidance';
  const withData = dates.map((d) => rolled.get(d)!).filter((d) => d.analysed > 0);
  const daysOver = withData.filter((d) => d.totals.sodium > limit).length;
  const average = withData.length ? Math.round(withData.reduce((s, d) => s + d.totals.sodium, 0) / withData.length) : null;
  const pct = average == null ? null : (average / limit) * 100;
  const sodiumStatus: Status = pct == null ? 'none' : pct > 100 ? 'above' : pct >= 80 ? 'near' : 'within';
  if (daysOver >= SODIUM_OVER_DAYS) flags.push({ kind: 'sodium_over', severity: 'bad', text: `Sodium over ${limitWord} ${daysOver} of ${WINDOW} days` });

  const latest = latestPerTest(labs);
  const abnormal = latest.filter((l) => labStatus(l) === 'above' || labStatus(l) === 'below');
  for (const l of abnormal.slice(0, 2)) flags.push({ kind: 'lab_out_of_range', severity: 'bad', text: `${l.label} ${labStatus(l)} range` });
  const shown = abnormal[0] ?? latest[0] ?? null;

  const lastDate = lastMealAt ? localDate(lastMealAt, timeZone) : null;
  const sinceLast = lastDate ? daysBetween(lastDate, today) : null;
  if (sinceLast == null) flags.push({ kind: 'never_logged', severity: 'warn', text: 'Has not started logging' });
  else if (sinceLast >= NOT_LOGGING_DAYS) flags.push({ kind: 'not_logging', severity: 'warn', text: `No meals for ${sinceLast} days` });

  if (!input.hasCkdStage) flags.push({ kind: 'no_ckd_stage', severity: 'info', text: 'No CKD stage' });
  const unverified = targets.filter((t) => t.source !== 'clinician_verified').length;
  if (!targets.length) flags.push({ kind: 'no_targets', severity: 'info', text: 'No targets yet' });
  else if (unverified) flags.push({ kind: 'targets_unverified', severity: 'info', text: 'Targets not verified' });
  if (!flags.length) flags.push({ kind: 'on_track', severity: 'ok', text: 'On track' });

  return {
    days,
    daysLogged: days.filter((d) => d.logged).length,
    loggedToday: days[days.length - 1]!.logged,
    lastMealAt: lastMealAt?.toISOString() ?? null,
    daysSinceLastMeal: sinceLast,
    sodium: { average, limit, limitSource: target ? 'target' : 'guidance', daysWithData: withData.length, daysOver, status: sodiumStatus },
    lab: shown
      ? { label: shown.label, value: shown.value, unit: shown.unit, refLow: shown.refLow, refHigh: shown.refHigh, collectedOn: shown.collectedOn, status: labStatus(shown), source: shown.source }
      : null,
    unverifiedTargets: unverified,
    flags,
    attention: flags.reduce((s, f) => s + RANK[f.severity], 0),
  };
}
