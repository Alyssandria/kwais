import { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bookmark, PencilLine, Plus, Utensils } from 'lucide-react';
import { bandFor } from '@/components/domain/ScoreRing';
import { Button, Card, EmptyState, ErrorState, LoadingRegion, PageHeader, Segmented, Skeleton } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { usePatientScope } from '@/lib/patient-scope';
import { useMealHistory, type Meal, type MealCategory, type MealStatus } from './api';
import { MEAL_TYPES, mealLabel } from './options';

type StatusFilter = 'all' | 'analysed' | 'saved' | 'draft';
type CategoryFilter = 'all' | MealCategory;

const STATUS_OPTIONS: { value: StatusFilter; label: string }[] = [
  { value: 'all', label: 'All' },
  { value: 'analysed', label: 'Analysed' },
  { value: 'saved', label: 'Not analysed' },
  { value: 'draft', label: 'Drafts' },
];
const CATEGORY_OPTIONS: { value: CategoryFilter; label: string }[] = [{ value: 'all', label: 'All meals' }, ...MEAL_TYPES.map((m) => ({ value: m.value, label: m.label }))];

const BAND = {
  good: 'bg-good-soft text-good',
  mixed: 'bg-warn-soft text-warn',
  attention: 'bg-bad-soft text-bad',
} as const;

const dayKey = (iso: string) => new Date(iso).toDateString();

function dayHeading(iso: string) {
  const d = new Date(iso);
  const today = new Date();
  const yesterday = new Date();
  yesterday.setDate(today.getDate() - 1);
  if (d.toDateString() === today.toDateString()) return 'Today';
  if (d.toDateString() === yesterday.toDateString()) return 'Yesterday';
  return d.toLocaleDateString('en-PH', { weekday: 'long', day: 'numeric', month: 'long' });
}

function MealRow({ meal, patientId }: { meal: Meal; patientId: string | null }) {
  const score = meal.analysis?.score ?? null;
  const time = new Date(meal.eatenAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  const href = patientId
    ? `/doctor/patients/${patientId}/meals/${meal.id}`
    : meal.status === 'draft'
      ? `/patient/meals/new?draft=${meal.id}`
      : `/patient/meals/${meal.id}`;
  const status =
    meal.status === 'draft' ? 'Draft' : meal.status === 'saved' ? 'Saved · not analysed' : score == null ? 'Analysed · no score' : null;

  return (
    <Link to={href} className="flex items-center gap-3.5 rounded-card border border-line bg-surface p-3.5 text-ink no-underline hover:bg-canvas">
      {score != null ? (
        <span className={cn('flex size-[46px] shrink-0 items-center justify-center rounded-full text-[17px] font-extrabold', BAND[bandFor(score)])}>
          <span className="sr-only">Score </span>
          {score}
        </span>
      ) : (
        <span className="flex size-[46px] shrink-0 items-center justify-center rounded-full bg-[#f1f5f9] text-[#475569]">
          {meal.status === 'draft' ? <PencilLine className="size-5" aria-hidden /> : <Bookmark className="size-5" aria-hidden />}
        </span>
      )}
      <span className="flex min-w-0 flex-1 flex-col">
        <span className="font-semibold">
          {mealLabel(meal.category)} · {time}
        </span>
        <span className="truncate text-[13px] text-muted">{meal.rawText || 'No food text yet'}</span>
      </span>
      {status && <span className="shrink-0 text-right text-[12px] font-semibold text-[#475569]">{status}</span>}
    </Link>
  );
}

export function HistoryPage() {
  const patientId = usePatientScope();
  const [status, setStatus] = useState<StatusFilter>('all');
  const [category, setCategory] = useState<CategoryFilter>('all');
  const history = useMealHistory({
    status: status === 'all' ? undefined : (status as MealStatus),
    category: category === 'all' ? undefined : category,
  });

  const meals = history.data?.pages.flat() ?? [];
  const groups: { key: string; heading: string; meals: Meal[] }[] = [];
  for (const m of meals) {
    const key = dayKey(m.eatenAt);
    const last = groups[groups.length - 1];
    if (last?.key === key) last.meals.push(m);
    else groups.push({ key, heading: dayHeading(m.eatenAt), meals: [m] });
  }

  const logLink = patientId ? undefined : (
    <Link to="/patient/meals/new" className="font-semibold">
      Log a meal
    </Link>
  );

  return (
    <div className="flex flex-col gap-5">
      {patientId ? (
        <div>
          <h2 className="text-lg font-extrabold">Meals</h2>
          <p className="text-[13.5px] text-muted">Saved and analysed meals, newest first. Drafts stay private to the patient.</p>
        </div>
      ) : (
        <PageHeader
          title="Meal history"
          description="Every meal you logged, newest first."
          actions={
            <Link
              to="/patient/meals/new"
              className="inline-flex h-11 items-center gap-2 rounded-card bg-accent px-4 font-extrabold text-ink no-underline shadow-card hover:bg-[#fca85a]"
            >
              <Plus className="size-4" aria-hidden />
              Log a meal
            </Link>
          }
        />
      )}

      <div className="flex flex-wrap gap-3">
        <Segmented label="Show" value={status} options={patientId ? STATUS_OPTIONS.filter((o) => o.value !== 'draft') : STATUS_OPTIONS} onChange={setStatus} />
        <Segmented label="Meal" value={category} options={CATEGORY_OPTIONS} onChange={setCategory} />
      </div>

      {history.isPending ? (
        <LoadingRegion label={patientId ? 'Loading meals' : 'Loading your meals'}>
          <div className="flex flex-col gap-2.5">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-[74px] rounded-card" />
            ))}
          </div>
        </LoadingRegion>
      ) : history.isError ? (
        <Card padding="none">
          <ErrorState title={patientId ? 'We couldn’t load these meals' : 'We couldn’t load your meals'} message={errorMessage(history.error)} onRetry={() => void history.refetch()} />
        </Card>
      ) : meals.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={Utensils}
            title={status === 'all' && category === 'all' ? 'No meals yet' : 'No meals match these filters'}
            description={
              status !== 'all' || category !== 'all' ? 'Try another filter.' : patientId ? 'Meals the patient saves will appear here.' : 'Meals you log will appear here.'
            }
            action={logLink}
          />
        </Card>
      ) : (
        <>
          {groups.map((g) => (
            <section key={g.key} aria-label={g.heading} className="flex flex-col gap-2">
              <h2 className="text-[13px] font-bold text-muted">{g.heading}</h2>
              <ul className="flex flex-col gap-2">
                {g.meals.map((m) => (
                  <li key={m.id}>
                    <MealRow meal={m} patientId={patientId} />
                  </li>
                ))}
              </ul>
            </section>
          ))}
          {history.hasNextPage && (
            <Button variant="secondary" className="self-center" onClick={() => void history.fetchNextPage()} loading={history.isFetchingNextPage}>
              Show older meals
            </Button>
          )}
        </>
      )}
    </div>
  );
}
