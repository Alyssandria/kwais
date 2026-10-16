import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { ChevronLeft, PencilLine, RefreshCw, Sparkles, Trash2 } from 'lucide-react';
import { NutrientIcon } from '@/components/domain/NutrientIcon';
import {
  Badge,
  Button,
  Card,
  CardHeader,
  ConfirmDialog,
  ErrorState,
  LoadingRegion,
  Notice,
  Skeleton,
  SourceTag,
  useToast,
} from '@/components/ui';
import { useTargets } from '@/features/profile/api';
import { errorMessage } from '@/lib/api';
import { NUTRIENTS, NUTRIENT_KEYS, fmt, percentOfTarget, type NutrientKey } from '@/lib/nutrition';
import { useAnalyseMeal, useDeleteMeal, useMeal, type AnalysedItem, type Meal, type MealAnalysis } from './api';
import { amountLabel, condimentLabel, cookingLabel, drinkLabel, whenText } from './options';

const value = (n: number, unit: 'mg' | 'g') => (unit === 'g' ? n.toFixed(1) : fmt(n));

function StatusBadge({ status }: { status: Meal['status'] }) {
  if (status === 'draft') return <Badge tone="warn">Draft</Badge>;
  if (status === 'saved') return <Badge>Saved · not analysed</Badge>;
  return <Badge tone="mint">Analysed</Badge>;
}

function LoggedCard({ meal }: { meal: Meal }) {
  const rows: [string, string][] = [];
  if (meal.condiments.length) rows.push(['Condiments', meal.condiments.map((c) => `${condimentLabel(c.name)} (${amountLabel(c.amount).toLowerCase()})`).join(', ')]);
  if (meal.drinks.length) rows.push(['Drinks', meal.drinks.map(drinkLabel).join(', ')]);
  if (meal.cookingMethods.length) rows.push(['Cooked', meal.cookingMethods.map(cookingLabel).join(', ')]);
  if (meal.notes) rows.push(['Note', meal.notes]);
  return (
    <Card as="section" aria-labelledby="logged-title">
      <CardHeader id="logged-title" title="What you logged" />
      <p className="text-[17px] leading-relaxed">{meal.rawText || <span className="text-muted">No food text yet</span>}</p>
      {rows.length > 0 && (
        <dl className="mt-3 grid gap-x-4 gap-y-1.5 text-[13.5px] sm:grid-cols-[120px_1fr]">
          {rows.map(([k, v]) => (
            <div key={k} className="contents">
              <dt className="font-semibold text-muted">{k}</dt>
              <dd>{v}</dd>
            </div>
          ))}
        </dl>
      )}
    </Card>
  );
}

function TotalsGrid({ analysis }: { analysis: MealAnalysis }) {
  const targets = useTargets();
  const targetFor = (n: NutrientKey) => targets.data?.find((t) => t.nutrient === n)?.dailyMax ?? null;
  return (
    <section aria-labelledby="totals-title" className="flex flex-col gap-3">
      <h2 id="totals-title" className="text-lg font-extrabold">
        Estimated nutrients in this meal
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {NUTRIENT_KEYS.map((n) => {
          const t = analysis.totals[n];
          const meta = NUTRIENTS[n];
          const target = targetFor(n);
          const pct = t.value != null ? percentOfTarget(t.value, target) : null;
          return (
            <li key={n}>
              <Card as="article" aria-label={meta.label} padding="sm" className="flex h-full flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <NutrientIcon nutrient={n} size="sm" />
                  <span className="font-bold">{meta.label}</span>
                </div>
                <p className="text-[26px] leading-none font-extrabold">
                  {t.value == null ? '—' : (
                    <>
                      {!t.complete && <span className="text-[15px] font-semibold text-muted">at least </span>}
                      {value(t.value, t.unit)}
                    </>
                  )}{' '}
                  <span className="text-sm font-semibold text-muted">{t.unit}</span>
                </p>
                <SourceTag kind={t.source} />
                <p className="text-[12.5px] text-muted">
                  {pct != null
                    ? `${pct}% of your daily target (${fmt(target!)} ${meta.unit})`
                    : target == null
                      ? 'No daily target set'
                      : 'Not enough data to compare'}
                </p>
              </Card>
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function itemAmount(i: AnalysedItem): string {
  if (i.kind === 'condiment') return amountLabel(i.unit);
  const q = Math.round(i.quantity * 100) / 100;
  return `${q} ${i.unit}`;
}

function ItemsTable({ items }: { items: AnalysedItem[] }) {
  if (items.length === 0) return null;
  return (
    <Card as="section" aria-labelledby="items-title" padding="none" className="overflow-hidden">
      <div className="px-5 pt-5">
        <CardHeader id="items-title" title="Food by food" subtitle="How each food was matched and weighed. Amounts marked “assumed” were not in what you typed." />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13.5px]">
          <caption className="sr-only">Nutrients for each food in this meal</caption>
          <thead className="bg-[#f8fafc] text-[12px] text-muted">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-semibold">Food</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Amount</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Matched to</th>
              {NUTRIENT_KEYS.map((n) => (
                <th key={n} scope="col" className="px-3 py-2.5 text-right font-semibold">
                  {NUTRIENTS[n].label} ({NUTRIENTS[n].unit})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={`${i.label}-${idx}`} className="border-t border-line align-top">
                <th scope="row" className="px-5 py-3 font-semibold">
                  {i.label}
                  {i.preparation && <span className="block text-[12px] font-normal text-muted">{i.preparation}</span>}
                </th>
                <td className="px-3 py-3">
                  {itemAmount(i)}
                  {i.grams != null && <span className="block text-[12px] text-muted">≈ {fmt(i.grams)} g{i.amountGuessed ? ' · assumed' : ''}</span>}
                </td>
                <td className="px-3 py-3">
                  {i.match ? (
                    <>
                      {i.match.name}
                      <span className="block">
                        <SourceTag kind={i.match.verified ? 'verified' : 'estimated'} detail={i.match.source === 'recipe' ? 'recipe' : undefined} />
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">Not found · not counted</span>
                  )}
                </td>
                {NUTRIENT_KEYS.map((n) => {
                  const v = i.nutrients[n].value;
                  return (
                    <td key={n} className="px-3 py-3 text-right tabular-nums">
                      {v == null ? <span className="text-muted">—</span> : value(v, NUTRIENTS[n].unit)}
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

function AnalysisSection({ meal, onReanalyse, reanalysing }: { meal: Meal & { analysis: MealAnalysis }; onReanalyse: () => void; reanalysing: boolean }) {
  const a = meal.analysis;
  return (
    <>
      <TotalsGrid analysis={a} />
      {a.notes.length > 0 && (
        <Notice tone="warn" title="About these numbers">
          <ul className="list-disc space-y-1 pl-4">
            {a.notes.map((n) => (
              <li key={`${n.code}-${n.nutrient ?? ''}`}>{n.message}</li>
            ))}
          </ul>
        </Notice>
      )}
      <ItemsTable items={a.items} />
      <Card as="section" tone="ai" aria-labelledby="ai-title">
        <CardHeader
          id="ai-title"
          title={
            <span className="inline-flex items-center gap-2">
              <Sparkles className="size-4 text-ai" aria-hidden />
              Score and suggestions
            </span>
          }
        />
        <p className="text-[14px]">
          AI feedback and a meal score aren’t available for this meal yet. The numbers above come from the food tables, not from
          AI.
        </p>
      </Card>
      <div className="flex flex-wrap items-center gap-3 text-[12.5px] text-muted">
        <span>
          Estimate {a.version > 1 ? `version ${a.version} · ` : ''}
          {new Date(a.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })} · {a.engineVersion}
        </span>
        <Button variant="ghost" size="sm" onClick={onReanalyse} loading={reanalysing} iconLeft={<RefreshCw className="size-3.5" aria-hidden />}>
          Analyse again
        </Button>
      </div>
    </>
  );
}

export function MealPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const meal = useMeal(id);
  const analyseMeal = useAnalyseMeal();
  const deleteMeal = useDeleteMeal();
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  const back = (
    <Link to="/patient/dashboard" className="inline-flex min-h-11 items-center gap-2 font-semibold no-underline">
      <ChevronLeft className="size-[18px]" aria-hidden />
      Back to dashboard
    </Link>
  );

  if (meal.isPending) {
    return (
      <div className="flex flex-col gap-5">
        {back}
        <LoadingRegion label="Loading this meal">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="mt-4 h-32 w-full" />
          <Skeleton className="mt-4 h-40 w-full" />
        </LoadingRegion>
      </div>
    );
  }

  if (meal.isError) {
    const notFound = meal.error instanceof AxiosError && meal.error.response?.status === 404;
    return (
      <div className="flex flex-col gap-5">
        {back}
        <Card>
          {notFound ? (
            <ErrorState title="We couldn’t find this meal" message="It may have been deleted, or the link is wrong." />
          ) : (
            <ErrorState title="We couldn’t load this meal" message={errorMessage(meal.error)} onRetry={() => void meal.refetch()} />
          )}
        </Card>
      </div>
    );
  }

  const m = meal.data;

  const runAnalysis = async () => {
    setActionError(null);
    try {
      await analyseMeal.mutateAsync(m.id);
    } catch (err) {
      setActionError(errorMessage(err));
    }
  };

  const remove = async () => {
    try {
      await deleteMeal.mutateAsync(m.id);
      toast.success('Meal deleted');
      navigate('/patient/dashboard');
    } catch (err) {
      setConfirmDelete(false);
      setActionError(errorMessage(err));
    }
  };

  return (
    <div className="mx-auto flex max-w-[1056px] flex-col gap-5">
      {back}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-1.5">
          <StatusBadge status={m.status} />
          <h1 className="text-[26px] font-extrabold tracking-tight">{whenText(m.category, m.eatenAt)}</h1>
        </div>
        <Button variant="secondary" size="sm" onClick={() => setConfirmDelete(true)} iconLeft={<Trash2 className="size-4" aria-hidden />}>
          Delete meal
        </Button>
      </div>

      {actionError && (
        <div role="alert">
          <Notice tone="bad">{actionError}</Notice>
        </div>
      )}

      <LoggedCard meal={m} />

      {m.status === 'draft' && (
        <Notice tone="info" title="This meal is still a draft">
          <p>Drafts are not counted in your log.</p>
          <Link to={`/patient/meals/new?draft=${m.id}`} className="mt-1 inline-flex items-center gap-1.5 font-semibold">
            <PencilLine className="size-4" aria-hidden />
            Continue this draft
          </Link>
        </Notice>
      )}

      {m.status !== 'draft' && !m.analysis && (
        <Card as="section" aria-labelledby="not-analysed-title" tone="mint">
          <CardHeader id="not-analysed-title" title="Not analysed yet" subtitle="You saved this meal without analysis. It already counts toward your history." />
          <Button onClick={runAnalysis} loading={analyseMeal.isPending}>
            Analyse now
          </Button>
        </Card>
      )}

      {m.analysis && <AnalysisSection meal={{ ...m, analysis: m.analysis }} onReanalyse={runAnalysis} reanalysing={analyseMeal.isPending} />}

      <ConfirmDialog
        open={confirmDelete}
        title="Delete this meal?"
        description="It will be removed from your log, totals and charts."
        confirmLabel="Delete meal"
        destructive
        loading={deleteMeal.isPending}
        onConfirm={remove}
        onCancel={() => setConfirmDelete(false)}
      />
    </div>
  );
}
