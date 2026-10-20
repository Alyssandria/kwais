import { useState } from 'react';
import { Link } from 'react-router-dom';
import { CartesianGrid, Line, LineChart, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import { LineChart as LineChartIcon } from 'lucide-react';
import { NutrientIcon } from '@/components/domain/NutrientIcon';
import { ScoreRing } from '@/components/domain/ScoreRing';
import { Card, CardHeader, EmptyState, ErrorState, LoadingRegion, PageHeader, Segmented, Skeleton, StatusLabel } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { fmt, NUTRIENTS, NUTRIENT_KEYS, percentOfTarget, targetStatus, type NutrientKey } from '@/lib/nutrition';
import { useAnalytics, type AnalyticsRange, type PatientAnalytics } from './api';

const RANGES: { value: `${AnalyticsRange}`; label: string }[] = [
  { value: '7', label: '7 days' },
  { value: '30', label: '30 days' },
  { value: '90', label: '90 days' },
];

type Series = 'score' | NutrientKey;
const SERIES: Record<Series, { label: string; color: string; unit: string }> = {
  score: { label: 'Score', color: '#087f8c', unit: 'out of 10' },
  sodium: { label: 'Sodium', color: NUTRIENTS.sodium.color, unit: 'mg' },
  potassium: { label: 'Potassium', color: NUTRIENTS.potassium.color, unit: 'mg' },
  phosphorus: { label: 'Phosphorus', color: NUTRIENTS.phosphorus.color, unit: 'mg' },
  protein: { label: 'Protein', color: NUTRIENTS.protein.color, unit: 'g' },
};

const shortDate = (iso: string) => new Date(`${iso}T12:00:00`).toLocaleDateString('en-PH', { day: 'numeric', month: 'short' });
const amount = (n: number, unit: string) => (unit === 'g' ? n.toFixed(1) : fmt(n));

function SummaryTiles({ a }: { a: PatientAnalytics }) {
  const s = a.summary;
  return (
    <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-[minmax(0,1fr)_minmax(0,1fr)_minmax(0,2fr)]">
      <Card className="flex flex-col gap-1.5">
        <h2 className="text-[13px] font-semibold text-muted">Days logged</h2>
        <p className="text-[30px] font-extrabold tracking-tight">
          {s.daysLogged} <span className="text-base font-semibold text-muted">of {a.range}</span>
        </p>
        <p className="text-[12.5px] text-muted">
          {s.mealsLogged} {s.mealsLogged === 1 ? 'meal' : 'meals'}, {s.analysedMeals} analysed
        </p>
      </Card>
      <Card tone="mint" className="flex flex-col gap-2">
        <h2 className="text-[13px] font-semibold text-muted">Average meal score</h2>
        {s.averageScore == null ? (
          <p className="text-[13px] text-muted">No scored meals in this period.</p>
        ) : (
          <ScoreRing score={s.averageScore} size={72} />
        )}
      </Card>
      <Card as="section" aria-labelledby="bands-title">
        <h2 id="bands-title" className="mb-3 text-[13px] font-semibold text-muted">
          Scored meals by band
        </h2>
        <BandBars bands={s.scoreBands} />
      </Card>
    </div>
  );
}

function BandBars({ bands }: { bands: PatientAnalytics['summary']['scoreBands'] }) {
  const total = bands.good + bands.mixed + bands.attention;
  const rows = [
    { label: 'Good fit (8–10)', value: bands.good, cls: 'bg-good' },
    { label: 'Mixed (5–7)', value: bands.mixed, cls: 'bg-warn-mark' },
    { label: 'Needs attention (1–4)', value: bands.attention, cls: 'bg-bad' },
  ];
  if (total === 0) return <p className="text-[13px] text-muted">No scored meals yet.</p>;
  return (
    <ul className="flex flex-col gap-2">
      {rows.map((r) => (
        <li key={r.label} className="grid grid-cols-[150px_1fr_32px] items-center gap-3 text-[13px]">
          <span>{r.label}</span>
          <span aria-hidden className="h-2.5 overflow-hidden rounded-full bg-[#f1f5f9]">
            <span className={cn('block h-full rounded-full', r.cls)} style={{ width: `${(r.value / total) * 100}%` }} />
          </span>
          <span className="text-right font-semibold">{r.value}</span>
        </li>
      ))}
    </ul>
  );
}

function NutrientAverages({ a }: { a: PatientAnalytics }) {
  return (
    <section aria-labelledby="avg-title" className="flex flex-col gap-3">
      <h2 id="avg-title" className="text-base font-bold">
        Average per day
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {NUTRIENT_KEYS.map((n) => {
          const v = a.summary.nutrients[n];
          const pct = v.averagePerDay == null ? null : percentOfTarget(v.averagePerDay, v.target);
          return (
            <li key={n}>
              <Card as="article" aria-label={NUTRIENTS[n].label} padding="sm" className="flex h-full flex-col gap-2">
                <span className="flex items-center gap-2.5 font-bold">
                  <NutrientIcon nutrient={n} size="sm" />
                  {NUTRIENTS[n].label}
                </span>
                <p className="text-[24px] leading-none font-extrabold">
                  {v.averagePerDay == null ? '—' : amount(v.averagePerDay, v.unit)} <span className="text-sm font-semibold text-muted">{v.unit}</span>
                </p>
                {v.target != null && v.averagePerDay != null ? (
                  <StatusLabel kind={targetStatus(pct)}>
                    {pct}% of your {fmt(v.target)} {v.unit} target
                  </StatusLabel>
                ) : (
                  <p className="text-[12.5px] text-muted">{v.target == null ? 'No target set' : 'No analysed meals'}</p>
                )}
                <p className="text-[12px] text-muted">
                  {v.daysWithData === 0
                    ? 'No days with analysed meals'
                    : v.daysOverTarget == null
                      ? `From ${v.daysWithData} ${v.daysWithData === 1 ? 'day' : 'days'} with analysed meals`
                      : `Over target on ${v.daysOverTarget} of ${v.daysWithData} ${v.daysWithData === 1 ? 'day' : 'days'}`}
                </p>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function TrendCard({ a }: { a: PatientAnalytics }) {
  const [series, setSeries] = useState<Series>('sodium');
  const meta = SERIES[series];
  const target = series === 'score' ? null : a.summary.nutrients[series].target;
  const data = a.days.map((d) => ({ day: shortDate(d.date), value: series === 'score' ? d.score : (d.totals?.[series] ?? null) }));
  const withData = data.filter((d) => d.value != null);
  const summary = `${meta.label} per day, ${shortDate(a.from)} to ${shortDate(a.to)}: ${withData.length} days with data.`;

  return (
    <Card as="section" aria-labelledby="trend-title">
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="trend-title" className="text-base font-bold">
            Daily trend
          </h2>
          <p className="text-[12.5px] text-muted">
            {series === 'score' ? 'Average meal score per day' : `Estimated ${meta.label.toLowerCase()} per day, ${meta.unit}`}
            {series !== 'score' && target == null ? ' · no target set' : ''}
          </p>
        </div>
        <div role="group" aria-label="Choose what to chart" className="flex flex-wrap gap-1.5">
          {(Object.keys(SERIES) as Series[]).map((k) => (
            <button
              key={k}
              type="button"
              aria-pressed={k === series}
              onClick={() => setSeries(k)}
              className={cn(
                'h-[34px] cursor-pointer rounded-full border px-3 text-[12.5px] font-semibold',
                k === series ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-[#334155] hover:bg-canvas',
              )}
            >
              {SERIES[k].label}
            </button>
          ))}
        </div>
      </div>
      <div role="img" aria-label={summary} className="h-64">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 18, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fill: '#5b6779', fontSize: 11 }} minTickGap={16} />
            <YAxis tickLine={false} axisLine={false} tick={{ fill: '#5b6779', fontSize: 11 }} domain={series === 'score' ? [0, 10] : [0, 'auto']} tickFormatter={(v: number) => fmt(v)} />
            <Tooltip formatter={(v: number) => [`${fmt(v)} ${meta.unit}`, meta.label]} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
            {target != null && (
              <ReferenceLine
                y={target}
                stroke="#b45309"
                strokeDasharray="5 4"
                label={{ value: `Your target ${fmt(target)} ${meta.unit}`, position: 'insideTopRight', fill: '#92400e', fontSize: 11, fontWeight: 600 }}
              />
            )}
            <Line type="monotone" dataKey="value" stroke={meta.color} strokeWidth={2.5} dot={a.range <= 30 ? { r: 3, fill: '#fff', stroke: meta.color, strokeWidth: 2 } : false} connectNulls={false} isAnimationActive={false} />
          </LineChart>
        </ResponsiveContainer>
      </div>
      <table className="sr-only">
        <caption>{`${meta.label} per day`}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">{meta.label}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d, i) => (
            <tr key={i}>
              <td>{d.day}</td>
              <td>{d.value ?? 'No data'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}

export function AnalyticsPage() {
  const [range, setRange] = useState<`${AnalyticsRange}`>('30');
  const query = useAnalytics(Number(range) as AnalyticsRange);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader
        title="Analytics"
        description="Trends from the meals you logged, compared only with the targets you entered."
        actions={<Segmented label="Period" value={range} options={RANGES} onChange={setRange} />}
      />
      {query.isPending ? (
        <LoadingRegion label="Loading your trends">
          <div className="flex flex-col gap-4">
            <Skeleton className="h-32 rounded-card" />
            <Skeleton className="h-72 rounded-card" />
          </div>
        </LoadingRegion>
      ) : query.isError ? (
        <Card padding="none">
          <ErrorState title="We couldn’t load your trends" message={errorMessage(query.error)} onRetry={() => void query.refetch()} />
        </Card>
      ) : query.data.summary.mealsLogged === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={LineChartIcon}
            title="No meals in this period"
            description="Trends appear once you log meals."
            action={
              <Link to="/patient/meals/new" className="font-semibold">
                Log a meal
              </Link>
            }
          />
        </Card>
      ) : (
        <>
          <SummaryTiles a={query.data} />
          <TrendCard a={query.data} />
          <NutrientAverages a={query.data} />
          <Card padding="sm">
            <CardHeader title="About these numbers" level={3} />
            <p className="text-[13px] text-muted">
              Daily figures add up analysed meals only. Meals saved without analysis count as logged days but add no nutrients. Values
              are estimates from food composition tables.
            </p>
          </Card>
        </>
      )}
    </div>
  );
}
