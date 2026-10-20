import { Link } from 'react-router-dom';
import { Bookmark, Sparkles, Utensils } from 'lucide-react';
import { Badge, Card, CardHeader, EmptyState } from '@/components/ui';
import { bandFor } from '@/components/domain/ScoreRing';
import { cn } from '@/lib/cn';
import type { Insight, PatientDashboard, RecentMeal } from '../types';

const SHADES = [
  { bg: '#f1f5f9', fg: '#5b6779' },
  { bg: '#d5eeea', fg: '#075e68' },
  { bg: '#9fd6cf', fg: '#073b40' },
  { bg: '#3fa3a8', fg: '#ffffff' },
  { bg: '#075e68', fg: '#ffffff' },
];

export function ConsistencyCard({ days }: { days: PatientDashboard['consistency'] }) {
  const logged = days.filter((d) => d.meals > 0).length;
  const weekdays = days.slice(0, 7).map((d) => new Date(`${d.date}T12:00:00`).toLocaleDateString('en-PH', { weekday: 'short' }));

  return (
    <Card>
      <CardHeader title="Logging consistency" subtitle={`Meals logged per day, last 4 weeks · ${logged} of ${days.length} days logged`} />
      <div aria-hidden className="mb-1.5 grid grid-cols-7 gap-1.5 text-center text-[11px] text-muted">
        {weekdays.map((w, i) => (
          <span key={i}>{w}</span>
        ))}
      </div>
      <ol aria-label="Meals logged per day" className="grid grid-cols-7 gap-1.5">
        {days.map((d) => {
          const shade = SHADES[Math.min(d.meals, 4)]!;
          const dateText = new Date(`${d.date}T12:00:00`).toLocaleDateString('en-PH', { day: 'numeric', month: 'short' });
          return (
            <li
              key={d.date}
              aria-label={`${dateText}: ${d.meals} ${d.meals === 1 ? 'meal' : 'meals'}`}
              className="flex h-[34px] items-center justify-center rounded-field text-[12px] font-semibold"
              style={{ background: shade.bg, color: shade.fg }}
            >
              {d.meals}
            </li>
          );
        })}
      </ol>
      <p className="mt-3 text-[12px] text-muted">Darker means more meals logged. The number is the meals that day.</p>
    </Card>
  );
}

const MEAL_LABEL = { breakfast: 'Breakfast', lunch: 'Lunch', dinner: 'Dinner', snack: 'Snack' } as const;
const BAND_STYLE = {
  good: { cls: 'bg-good-soft text-good', label: 'Good fit' },
  mixed: { cls: 'bg-warn-soft text-warn', label: 'Mixed' },
  attention: { cls: 'bg-bad-soft text-bad', label: 'Needs attention' },
} as const;

function whenText(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  const time = d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  if (d.toDateString() === today.toDateString()) return `Today, ${time}`;
  if (d.toDateString() === yesterday.toDateString()) return `Yesterday, ${time}`;
  return d.toLocaleDateString('en-PH', { day: 'numeric', month: 'short' });
}

export function RecentMealsCard({ meals }: { meals: RecentMeal[] }) {
  return (
    <Card>
      <CardHeader
        title="Recent meals"
        action={
          <Link to="/patient/meals" className="text-[13px] font-semibold">
            View history
          </Link>
        }
      />
      {meals.length === 0 ? (
        <EmptyState
          icon={Utensils}
          title="No meals yet"
          description="Your logged meals will appear here."
          action={
            <Link to="/patient/meals/new" className="font-semibold">
              Log your first meal
            </Link>
          }
        />
      ) : (
        <ul className="flex flex-col gap-2">
          {meals.map((m) => {
            const band = m.score != null ? BAND_STYLE[bandFor(m.score)] : null;
            return (
              <li key={m.id}>
                <Link
                  to={`/patient/meals/${m.id}`}
                  className="flex items-center gap-3.5 rounded-card border border-[#f1f5f9] p-3 text-ink no-underline hover:bg-canvas"
                >
                  {m.score != null && band ? (
                    <span className={cn('flex size-[46px] shrink-0 items-center justify-center rounded-full text-[17px] font-extrabold', band.cls)}>
                      <span className="sr-only">Score </span>
                      {m.score}
                    </span>
                  ) : (
                    <span className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-[#475569]">
                      <Bookmark className="size-5" aria-hidden />
                    </span>
                  )}
                  <span className="flex min-w-0 flex-1 flex-col">
                    <span className="font-semibold">
                      {MEAL_LABEL[m.category]} · {whenText(m.eatenAt)}
                    </span>
                    <span className="truncate text-[12.5px] text-muted">{m.summary}</span>
                  </span>
                  <span className={cn('shrink-0 text-right text-[12px] font-semibold', band ? band.cls.split(' ')[1] : 'text-[#475569]')}>
                    {band ? band.label : 'Saved · not analysed'}
                  </span>
                </Link>
              </li>
            );
          })}
        </ul>
      )}
    </Card>
  );
}

export function InsightsCard({ insights, isSample }: { insights: Insight[]; isSample: boolean }) {
  if (insights.length === 0) return null;
  return (
    <Card tone="ai" as="section" aria-labelledby="insights-title">
      <div className="mb-4 flex flex-wrap items-center justify-between gap-2">
        <h2 id="insights-title" className="text-base font-bold">
          Suggestions from your recent meals
        </h2>
        {isSample ? (
          <Badge>Sample text, not AI</Badge>
        ) : (
          <Badge tone="ai">
            <Sparkles className="size-3" aria-hidden />
            AI-generated
          </Badge>
        )}
      </div>
      <div className="grid gap-3 md:grid-cols-3">
        {insights.map((i) => (
          <article key={i.id} className="flex flex-col gap-2 rounded-card border border-[#ede9fe] bg-surface p-4">
            <h3 className="font-semibold">{i.title}</h3>
            <p className="text-[13px] text-[#475569]">{i.body}</p>
            <Link to={i.source.href} className="mt-auto text-[12.5px] font-semibold">
              From: {i.source.label}
            </Link>
          </article>
        ))}
      </div>
      <p className="mt-3 text-[12px] text-muted">
        Suggestions are educational and use only what you entered. Ask your care team before changing your diet.
      </p>
    </Card>
  );
}
