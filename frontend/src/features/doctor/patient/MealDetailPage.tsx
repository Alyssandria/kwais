import { Link, useParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { ChevronLeft } from 'lucide-react';
import { Card, CardHeader, ErrorState, LoadingRegion, Skeleton } from '@/components/ui';
import { Actions, AnalysisFooter, Contribution, DataQuality, Insights, ItemsTable, NutrientTotals, ScoreCard } from '@/features/meals/analysis';
import { useMeal } from '@/features/meals/api';
import { LoggedCard, StatusBadge } from '@/features/meals/MealPage';
import { whenText } from '@/features/meals/options';
import { errorMessage } from '@/lib/api';

export function MealDetailPage() {
  const { mealId } = useParams();
  const meal = useMeal(mealId);

  const back = (
    <Link to=".." relative="path" className="inline-flex min-h-11 items-center gap-2 self-start font-semibold no-underline">
      <ChevronLeft className="size-[18px]" aria-hidden />
      All meals
    </Link>
  );

  if (meal.isPending) {
    return (
      <div className="flex flex-col gap-5">
        {back}
        <LoadingRegion label="Loading this meal">
          <Skeleton className="h-32 w-full" />
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
            <ErrorState title="We couldn’t find this meal" message="The patient may have deleted it." />
          ) : (
            <ErrorState title="We couldn’t load this meal" message={errorMessage(meal.error)} onRetry={() => void meal.refetch()} />
          )}
        </Card>
      </div>
    );
  }

  const m = meal.data;
  return (
    <div className="flex flex-col gap-5">
      {back}
      <div className="flex flex-col gap-1.5">
        <StatusBadge status={m.status} />
        <h2 className="text-[22px] font-extrabold tracking-tight">{whenText(m.category, m.eatenAt)}</h2>
      </div>
      <LoggedCard meal={m} title="What the patient logged" />
      {m.analysis ? (
        <>
          <ScoreCard analysis={m.analysis} />
          <NutrientTotals analysis={m.analysis} />
          <Contribution items={m.analysis.items} />
          <ItemsTable items={m.analysis.items} />
          <DataQuality analysis={m.analysis} />
          <Actions analysis={m.analysis} />
          <Insights analysis={m.analysis} />
          <AnalysisFooter analysis={m.analysis} />
        </>
      ) : (
        <Card as="section" aria-labelledby="not-analysed-title">
          <CardHeader id="not-analysed-title" title="Not analysed" subtitle="The patient saved this meal without analysis, so it has no nutrients or score." />
        </Card>
      )}
    </div>
  );
}
