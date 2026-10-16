import { useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import { Card, CardHeader } from '@/components/ui';
import { cn } from '@/lib/cn';
import { fmt, NUTRIENT_KEYS, NUTRIENTS, type NutrientKey } from '@/lib/nutrition';
import type { DaySummary, MealCategory, PatientDashboard } from '../types';

const MEAL_COLORS: Record<MealCategory, string> = {
  breakfast: '#8fd0c8',
  lunch: '#087f8c',
  dinner: '#0b3b40',
  snack: '#fdba74',
};
const MEAL_LABEL: Record<MealCategory, string> = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' };

export function MealBreakdownCard({ byMeal }: { byMeal: PatientDashboard['today']['byMeal'] }) {
  if (byMeal.length === 0) {
    return (
      <Card>
        <CardHeader title="Where today’s nutrients came from" />
        <p className="text-muted">Log a meal to see how each one adds up.</p>
      </Card>
    );
  }
  return (
    <Card>
      <CardHeader title="Where today’s nutrients came from" subtitle="Share of each nutrient by meal" />
      <ul aria-label="Legend" className="mb-4 flex flex-wrap gap-4 text-[12px] text-[#475569]">
        {byMeal.map((m) => (
          <li key={m.category} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-[3px]" style={{ background: MEAL_COLORS[m.category] }} />
            {MEAL_LABEL[m.category]}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-4">
        {NUTRIENT_KEYS.map((n) => {
          const total = byMeal.reduce((s, m) => s + m.values[n], 0);
          const parts = byMeal.map((m) => ({ ...m, v: m.values[n], pct: total ? (m.values[n] / total) * 100 : 0 }));
          const unit = NUTRIENTS[n].unit;
          const aria = `${NUTRIENTS[n].label}: ` + parts.map((p) => `${MEAL_LABEL[p.category]} ${Math.round(p.pct)} percent`).join(', ');
          return (
            <div key={n} className="flex flex-col gap-1.5">
              <div className="flex justify-between text-[13px]">
                <span className="font-semibold">{NUTRIENTS[n].label}</span>
                <span className="text-muted">
                  {parts.map((p) => fmt(p.v)).join(' + ')} {unit}
                </span>
              </div>
              <div role="img" aria-label={aria} className="flex h-3.5 gap-0.5 overflow-hidden rounded-[4px]">
                {parts.map((p) => (
                  <div key={p.category} style={{ width: `${p.pct}%`, background: MEAL_COLORS[p.category] }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

type Series = 'score' | NutrientKey;

const SERIES: Record<Series, { label: string; color: string; unit: string; sub: string }> = {
  score: { label: 'Score', color: '#087f8c', unit: '/10', sub: 'Average meal score per day' },
  sodium: { label: 'Sodium', color: NUTRIENTS.sodium.color, unit: 'mg', sub: 'Estimated sodium per day, mg' },
  potassium: { label: 'Potassium', color: NUTRIENTS.potassium.color, unit: 'mg', sub: 'Estimated potassium per day, mg' },
  phosphorus: { label: 'Phosphorus', color: NUTRIENTS.phosphorus.color, unit: 'mg', sub: 'Estimated phosphorus per day, mg' },
  protein: { label: 'Protein', color: NUTRIENTS.protein.color, unit: 'g', sub: 'Estimated protein per day, g' },
};

const dayLabel = (iso: string, isToday: boolean) =>
  isToday ? 'Today' : new Date(`${iso}T12:00:00`).toLocaleDateString('en-PH', { weekday: 'short' });

export function WeekTrendCard({ week, targets }: { week: DaySummary[]; targets: Partial<Record<NutrientKey, number | null>> }) {
  const [series, setSeries] = useState<Series>('score');
  const meta = SERIES[series];
  const target = series === 'score' ? null : (targets[series] ?? null);

  const data = week.map((d, i) => ({
    day: dayLabel(d.date, i === week.length - 1),
    value: series === 'score' ? d.score : (d.totals?.[series] ?? null),
  }));
  const summary = `${meta.label} over the last 7 days: ` + data.map((d) => `${d.day} ${d.value ?? 'no data'}`).join(', ');

  return (
    <Card>
      <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 className="text-base font-bold">Last 7 days</h2>
          <p className="text-[12.5px] text-muted">
            {meta.sub}
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
                'h-[34px] cursor-pointer rounded-full border px-3 text-[12.5px] font-semibold transition-colors',
                k === series ? 'border-primary bg-primary text-white' : 'border-line bg-surface text-[#334155] hover:bg-canvas',
              )}
            >
              {SERIES[k].label}
            </button>
          ))}
        </div>
      </div>

      <div role="img" aria-label={summary} className="h-56">
        <ResponsiveContainer width="100%" height="100%">
          <LineChart data={data} margin={{ top: 18, right: 12, bottom: 0, left: -12 }}>
            <CartesianGrid vertical={false} stroke="#f1f5f9" />
            <XAxis dataKey="day" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fill: '#64748b', fontSize: 11 }} />
            <YAxis
              tickLine={false}
              axisLine={false}
              tick={{ fill: '#64748b', fontSize: 11 }}
              domain={series === 'score' ? [0, 10] : [0, 'auto']}
              tickFormatter={(v: number) => fmt(v)}
            />
            <Tooltip
              formatter={(v: number) => [`${fmt(v)} ${meta.unit === '/10' ? 'out of 10' : meta.unit}`, meta.label]}
              contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }}
            />
            {target != null && (
              <ReferenceLine
                y={target}
                stroke="#b45309"
                strokeDasharray="5 4"
                label={{ value: `Your target ${fmt(target)} ${meta.unit}`, position: 'insideTopRight', fill: '#92400e', fontSize: 11, fontWeight: 600 }}
              />
            )}
            <Line
              type="monotone"
              dataKey="value"
              stroke={meta.color}
              strokeWidth={2.5}
              dot={{ r: 4, fill: '#fff', stroke: meta.color, strokeWidth: 2 }}
              activeDot={{ r: 6 }}
              connectNulls={false}
              isAnimationActive={false}
            />
          </LineChart>
        </ResponsiveContainer>
      </div>

      <table className="sr-only">
        <caption>{meta.sub}</caption>
        <thead>
          <tr>
            <th scope="col">Day</th>
            <th scope="col">{meta.label}</th>
          </tr>
        </thead>
        <tbody>
          {data.map((d) => (
            <tr key={d.day}>
              <td>{d.day}</td>
              <td>{d.value ?? 'No data'}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </Card>
  );
}
