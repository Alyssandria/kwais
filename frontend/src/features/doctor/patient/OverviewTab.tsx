import { Link } from 'react-router-dom';
import { Badge, Card, CardHeader, ErrorState, LoadingRegion, Skeleton, StatusLabel } from '@/components/ui';
import { useDashboard } from '@/features/dashboard/useDashboard';
import type { PatientDashboard } from '@/features/dashboard/types';
import { mealLabel } from '@/features/meals/options';
import { errorMessage } from '@/lib/api';
import { NUTRIENTS, NUTRIENT_KEYS, fmt, labStatus, labStatusText, percentOfTarget, rangeText, targetStatus } from '@/lib/nutrition';
import { lastMealText, sodiumText } from '../PatientList';
import type { Severity } from '../patients';
import { usePatientRecordContext } from './PatientRecordLayout';

const TONE: Record<Severity, 'bad' | 'warn' | 'info' | 'good'> = { bad: 'bad', warn: 'warn', info: 'info', ok: 'good' };
const amount = (n: number, unit: string) => (unit === 'g' ? n.toFixed(1) : fmt(n));
const day = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric', month: 'short', timeZone: 'UTC' });

function Attention() {
  const r = usePatientRecordContext();
  return (
    <Card as="section" aria-labelledby="attention-title">
      <CardHeader id="attention-title" title="At a glance" subtitle="Flags use the same rules as your patient list." />
      <ul className="flex flex-wrap gap-1.5">
        {r.flags.map((f) => (
          <li key={f.kind}>
            <Badge tone={TONE[f.severity]}>{f.text}</Badge>
          </li>
        ))}
      </ul>
      <dl className="mt-4 grid gap-x-4 gap-y-2 text-[13.5px] sm:grid-cols-[170px_1fr]">
        <dt className="font-semibold text-muted">Logging</dt>
        <dd>
          {r.daysLogged} of the last 7 days · {lastMealText(r)}
        </dd>
        <dt className="font-semibold text-muted">Sodium, 7-day average</dt>
        <dd>
          {sodiumText(r.sodium)}
          {r.sodium.daysWithData > 0 && ` · over on ${r.sodium.daysOver} of ${r.sodium.daysWithData} days`}
        </dd>
        <dt className="font-semibold text-muted">Targets</dt>
        <dd>{r.unverifiedTargets === 0 ? 'All verified, or none set' : `${r.unverifiedTargets} entered by the patient, not verified`}</dd>
      </dl>
    </Card>
  );
}

function Today({ d }: { d: PatientDashboard }) {
  return (
    <Card as="section" aria-labelledby="today-title">
      <CardHeader
        id="today-title"
        title="Today so far"
        subtitle={`${d.today.mealsLogged.length} ${d.today.mealsLogged.length === 1 ? 'meal' : 'meals'} logged · in the patient’s time zone`}
      />
      <ul className="grid gap-3 sm:grid-cols-2">
        {NUTRIENT_KEYS.map((n) => {
          const v = d.today.nutrients[n];
          const pct = percentOfTarget(v.value, v.target);
          return (
            <li key={n} className="rounded-card border border-line p-3">
              <p className="text-[13px] font-semibold text-muted">{NUTRIENTS[n].label}</p>
              <p className="text-[20px] font-extrabold">
                {amount(v.value, v.unit)} <span className="text-[13px] font-semibold text-muted">{v.unit}</span>
              </p>
              {v.target != null ? (
                <StatusLabel kind={targetStatus(pct)}>
                  {pct}% of {fmt(v.target)} {v.unit} · {v.targetSource === 'clinician_verified' ? 'verified' : 'entered by patient'}
                </StatusLabel>
              ) : (
                <p className="text-[12.5px] text-muted">No target set</p>
              )}
            </li>
          );
        })}
      </ul>
    </Card>
  );
}

function Week({ d }: { d: PatientDashboard }) {
  return (
    <Card as="section" aria-labelledby="week-title" padding="none" className="overflow-hidden">
      <div className="px-5 pt-5">
        <CardHeader id="week-title" title="Last 7 days" subtitle="Daily totals from analysed meals" />
      </div>
      <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Last 7 days table, scrolls sideways">
        <table className="w-full min-w-[560px] text-left text-[13.5px]">
          <caption className="sr-only">Average meal score and nutrient totals for each of the last 7 days</caption>
          <thead className="bg-[#f8fafc] text-[12px] text-muted">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-semibold">Day</th>
              <th scope="col" className="px-3 py-2.5 text-right font-semibold">Score</th>
              {NUTRIENT_KEYS.map((n) => (
                <th key={n} scope="col" className="px-3 py-2.5 text-right font-semibold">
                  {NUTRIENTS[n].label} ({NUTRIENTS[n].unit})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {[...d.week].reverse().map((w) => (
              <tr key={w.date} className="border-t border-line">
                <th scope="row" className="px-5 py-2.5 font-semibold">
                  {day(w.date)}
                </th>
                <td className="px-3 py-2.5 text-right tabular-nums">{w.score ?? <span className="text-muted">—</span>}</td>
                {NUTRIENT_KEYS.map((n) => {
                  const target = d.today.nutrients[n].target;
                  const v = w.totals?.[n];
                  return (
                    <td key={n} className="px-3 py-2.5 text-right tabular-nums">
                      {v == null ? (
                        <span className="text-muted">—</span>
                      ) : (
                        <span className={target != null && v > target ? 'font-bold text-bad' : undefined}>
                          {amount(v, NUTRIENTS[n].unit)}
                          {target != null && v > target && <span className="sr-only"> (over target)</span>}
                        </span>
                      )}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

function RecentMeals({ d }: { d: PatientDashboard }) {
  return (
    <Card as="section" aria-labelledby="recent-title">
      <CardHeader
        id="recent-title"
        title="Recent meals"
        action={
          <Link to="meals" className="text-[13px] font-semibold">
            All meals
          </Link>
        }
      />
      {d.recentMeals.length === 0 ? (
        <p className="text-[13.5px] text-muted">No meals logged yet.</p>
      ) : (
        <ul className="flex flex-col divide-y divide-line">
          {d.recentMeals.map((m) => (
            <li key={m.id}>
              <Link to={`meals/${m.id}`} className="flex items-center gap-3 py-2.5 text-ink no-underline hover:bg-canvas">
                <span className="w-10 shrink-0 text-center text-[15px] font-extrabold">
                  {m.score ?? '—'}
                  <span className="sr-only">{m.score == null ? 'No score' : ' out of 10'}</span>
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block text-[13.5px] font-semibold">
                    {mealLabel(m.category)} · {new Date(m.eatenAt).toLocaleString('en-PH', { day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' })}
                  </span>
                  <span className="block truncate text-[12.5px] text-muted">{m.summary}</span>
                </span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}

function Labs({ d }: { d: PatientDashboard }) {
  return (
    <Card as="section" aria-labelledby="labs-title">
      <CardHeader
        id="labs-title"
        title="Latest labs"
        action={
          <Link to="labs" className="text-[13px] font-semibold">
            Labs and targets
          </Link>
        }
      />
      {d.labs.length === 0 ? (
        <p className="text-[13.5px] text-muted">No lab results yet.</p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {d.labs.map((l) => {
            const latest = l.history[l.history.length - 1];
            if (!latest) return null;
            const kind = labStatus(latest.value, l.refLow, l.refHigh);
            return (
              <li key={l.test + l.label} className="flex flex-wrap items-baseline justify-between gap-2 text-[13.5px]">
                <span className="font-semibold">{l.label}</span>
                <span className="flex flex-col items-end">
                  <StatusLabel kind={kind}>
                    {latest.value} {l.unit} · {labStatusText(kind)}
                  </StatusLabel>
                  <span className="text-[12px] text-muted">
                    Range {rangeText(l.refLow, l.refHigh)} · {day(latest.collectedOn)}
                    {l.source === 'clinician_verified' ? ' · verified' : ''}
                  </span>
                </span>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function OverviewTab() {
  const dashboard = useDashboard();
  return (
    <div className="flex flex-col gap-5">
      <h2 className="sr-only">Overview</h2>
      <Attention />
      {dashboard.isPending ? (
        <LoadingRegion label="Loading the overview">
          <Skeleton className="h-64 w-full" />
        </LoadingRegion>
      ) : dashboard.isError ? (
        <Card padding="none">
          <ErrorState title="We couldn’t load the overview" message={errorMessage(dashboard.error)} onRetry={() => void dashboard.refetch()} />
        </Card>
      ) : (
        <>
          <div className="grid gap-5 lg:grid-cols-2">
            <Today d={dashboard.data} />
            <Labs d={dashboard.data} />
          </div>
          <Week d={dashboard.data} />
          <RecentMeals d={dashboard.data} />
        </>
      )}
    </div>
  );
}
