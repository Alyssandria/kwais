import { useState } from 'react';
import { Link, useNavigate, useParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { ChevronLeft, PencilLine, Trash2 } from 'lucide-react';
import { Badge, Button, Card, CardHeader, ConfirmDialog, ErrorState, LoadingRegion, Notice, Skeleton, useToast } from '@/components/ui';
import { useChangeConsent } from '@/features/profile/api';
import { errorMessage } from '@/lib/api';
import { Actions, AnalysisFooter, Contribution, DataQuality, Insights, ItemsTable, NutrientTotals, ScoreCard } from './analysis';
import { useAnalyseMeal, useDeleteMeal, useMeal, type Meal } from './api';
import { ProgressDialog, type ProgressKind, type ProgressStep } from './ProgressDialog';
import { amountLabel, condimentLabel, cookingLabel, drinkLabel, mealLabel, whenText } from './options';

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

export function MealPage() {
  const { id } = useParams();
  const navigate = useNavigate();
  const toast = useToast();
  const meal = useMeal(id);
  const analyseMeal = useAnalyseMeal();
  const changeConsent = useChangeConsent();
  const deleteMeal = useDeleteMeal();
  const busy = analyseMeal.isPending || changeConsent.isPending;
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);
  const [progress, setProgress] = useState<ProgressKind | null>(null);
  const [step, setStep] = useState<ProgressStep | null>(null);

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

  const withProgress = async (work: () => Promise<unknown>) => {
    setActionError(null);
    setProgress('reanalyse');
    setStep('reading');
    try {
      await work();
      toast.success('Analysis ready');
    } catch (err) {
      setActionError(errorMessage(err));
    } finally {
      setProgress(null);
    }
  };

  const runAnalysis = () => withProgress(() => analyseMeal.mutateAsync({ id: m.id, onStep: setStep }));

  const allowAiAndAnalyse = () =>
    withProgress(async () => {
      await changeConsent.mutateAsync({ consentType: 'ai_processing', granted: true });
      await analyseMeal.mutateAsync({ id: m.id, onStep: setStep });
    });

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
          {m.analysis ? (
            <>
              <p className="text-[13px] font-semibold text-muted">{whenText(m.category, m.eatenAt)}</p>
              <h1 className="text-[26px] font-extrabold tracking-tight">Your {mealLabel(m.category).toLowerCase()}, analysed</h1>
            </>
          ) : (
            <h1 className="text-[26px] font-extrabold tracking-tight">{whenText(m.category, m.eatenAt)}</h1>
          )}
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
          <Button onClick={runAnalysis} loading={busy}>
            Analyse now
          </Button>
        </Card>
      )}

      {m.analysis && (
        <>
          <ScoreCard analysis={m.analysis} onAllowAi={allowAiAndAnalyse} onRetry={runAnalysis} busy={busy} />
          <Actions analysis={m.analysis} />
          <NutrientTotals analysis={m.analysis} />
          <Contribution items={m.analysis.items} />
          <ItemsTable items={m.analysis.items} />
          <DataQuality analysis={m.analysis} />
          <Insights analysis={m.analysis} />
          <AnalysisFooter analysis={m.analysis} onReanalyse={runAnalysis} busy={busy} />
        </>
      )}

      <ProgressDialog kind={progress} step={step} title={`Analysing your ${mealLabel(m.category).toLowerCase()}`} />

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
