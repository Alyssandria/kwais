import { Link } from 'react-router-dom';
import { Card, ErrorState, LoadingRegion, Notice, Skeleton } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { errorMessage } from '@/lib/api';
import { NUTRIENT_KEYS } from '@/lib/nutrition';
import { ConsistencyCard, InsightsCard, RecentMealsCard } from './components/ActivityCards';
import { MealBreakdownCard, WeekTrendCard } from './components/ChartCards';
import { LabsCard } from './components/LabsCard';
import { NutrientCard, TodayScoreCard } from './components/TodayCards';
import { WelcomeHero } from './components/WelcomeHero';
import { useDashboard } from './useDashboard';

export function DashboardPage() {
  const { user } = useAuth();
  const { data, isPending, isError, error, refetch } = useDashboard();

  if (isPending) return <DashboardSkeleton />;
  if (isError) {
    return (
      <Card padding="none">
        <ErrorState title="We couldn’t load your dashboard" message={errorMessage(error)} onRetry={() => void refetch()} />
      </Card>
    );
  }

  const targets = Object.fromEntries(NUTRIENT_KEYS.map((n) => [n, data.today.nutrients[n].target]));

  return (
    <div className="flex flex-col gap-6">
      {user && !user.onboardingComplete && (
        <Notice tone="warn" title="Finish setting up">
          Add your kidney health details and any targets from your care team so estimates can be compared with them.{' '}
          <Link to="/patient/onboarding">Continue setup</Link>
        </Notice>
      )}

      {data.isSample && <Notice>You’re seeing fictional sample data.</Notice>}

      <WelcomeHero firstName={user?.firstName ?? ''} today={data.today} />

      <section aria-labelledby="today-title" className="flex flex-col gap-3">
        <h2 id="today-title" className="text-base font-bold">
          Today at a glance
        </h2>
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[minmax(0,1fr)_minmax(0,2fr)]">
          <TodayScoreCard score={data.today.averageScore} scoredMeals={data.today.scoredMeals} />
          <div className="grid gap-4 sm:grid-cols-2">
            {NUTRIENT_KEYS.map((n) => (
              <NutrientCard key={n} nutrient={n} data={data.today.nutrients[n]} />
            ))}
          </div>
        </div>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <MealBreakdownCard byMeal={data.today.byMeal} />
        <WeekTrendCard week={data.week} targets={targets} />
      </div>

      <LabsCard labs={data.labs} />

      <div className="grid gap-4 lg:grid-cols-[minmax(0,5fr)_minmax(0,7fr)]">
        <ConsistencyCard days={data.consistency} />
        <RecentMealsCard meals={data.recentMeals} />
      </div>

      <InsightsCard insights={data.insights} isSample={data.isSample || data.sampleInsights} />

      <footer className="border-t border-line pt-3 text-[12px] text-muted">
        Nutrient values are estimates from the Philippine Food Composition Tables and other databases and may be
        inaccurate. K-WAIS does not diagnose, treat or replace professional medical advice.
      </footer>
    </div>
  );
}

function DashboardSkeleton() {
  return (
    <LoadingRegion label="Loading your dashboard">
      <div className="flex flex-col gap-6">
        <Skeleton className="h-40 rounded-hero" />
        <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-[1fr_2fr]">
          <Skeleton className="h-56 rounded-card" />
          <div className="grid gap-4 sm:grid-cols-2">
            {[0, 1, 2, 3].map((i) => (
              <Skeleton key={i} className="h-40 rounded-card" />
            ))}
          </div>
        </div>
        <div className="grid gap-4 lg:grid-cols-[5fr_7fr]">
          <Skeleton className="h-64 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      </div>
    </LoadingRegion>
  );
}
