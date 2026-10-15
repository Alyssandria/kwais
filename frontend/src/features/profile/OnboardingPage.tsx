import { useState } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { Check } from 'lucide-react';
import { Button, Card, ErrorState, LoadingRegion, Skeleton } from '@/components/ui';
import { Logo } from '@/components/layout/Logo';
import { useAuth } from '@/features/auth/AuthProvider';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/api';
import { useCompleteOnboarding, useConsents, useProfile, useTargets } from './api';
import { AboutYouSection, DietSection, KidneySection, PreferencesSection, TargetsSection } from './sections';
import { useSavers } from './useSavers';

const STEPS = [
  { title: 'About you', intro: 'A few basics. Only your name is required.' },
  { title: 'Food and diet', intro: 'What your care team asked you to limit, and foods you avoid.' },
  { title: 'Kidney health', intro: 'Only what your doctor has already told you. Skip anything you’re unsure about.' },
  { title: 'Daily targets', intro: 'Optional. Amounts from your care team make meal scores possible.' },
  { title: 'AI and reminders', intro: 'Choose how K-WAIS helps you. You can change these any time.' },
] as const;

/**
 * Five short steps after sign-up. Every step saves as you go, every step after the first
 * can be skipped, and nothing is inferred from the answers.
 */
export function OnboardingPage() {
  const navigate = useNavigate();
  const { refreshUser } = useAuth();
  const profile = useProfile();
  const targets = useTargets();
  const consents = useConsents();
  const complete = useCompleteOnboarding();
  const { saveProfile, saveTargets, savePreferences } = useSavers();

  const [step, setStep] = useState<number | null>(null);
  const current = step ?? Math.min(profile.data?.onboarding.step ?? 0, STEPS.length - 1);
  const [finishError, setFinishError] = useState<string | null>(null);

  const goTo = async (next: number) => {
    setStep(next);
    await saveProfile({ onboardingStep: next }).catch(() => undefined);
    window.scrollTo({ top: 0 });
  };

  const finish = async () => {
    setFinishError(null);
    try {
      await complete.mutateAsync();
      await refreshUser();
      navigate('/patient/dashboard', { replace: true });
    } catch (err) {
      setFinishError(errorMessage(err));
    }
  };

  const next = () => (current < STEPS.length - 1 ? goTo(current + 1) : finish());
  const back = current > 0 ? <Button variant="secondary" onClick={() => void goTo(current - 1)}>Back</Button> : null;
  const skip =
    current > 0 ? (
      <Button variant="ghost" onClick={() => void next()}>
        Skip this step
      </Button>
    ) : null;
  const actions = (
    <>
      {back}
      {skip}
    </>
  );
  const isLast = current === STEPS.length - 1;
  const submitLabel = isLast ? 'Finish' : 'Continue';

  const loading = profile.isPending || targets.isPending || consents.isPending;
  const failed = profile.isError || targets.isError || consents.isError;

  return (
    <div className="min-h-screen bg-canvas">
      <header className="flex h-16 items-center justify-between border-b border-line bg-surface px-4 sm:px-6">
        <Logo tone="light" showTagline={false} />
        <Link to="/patient/dashboard" className="text-[13px] font-semibold">
          Finish later
        </Link>
      </header>

      <main id="main" className="mx-auto flex max-w-3xl flex-col gap-6 px-4 py-8 sm:px-6">
        <ol aria-label="Setup steps" className="grid grid-cols-5 gap-1.5">
          {STEPS.map((s, i) => (
            <li key={s.title} aria-current={i === current ? 'step' : undefined} className="flex flex-col gap-1.5">
              <span className={cn('h-1.5 rounded-full', i < current ? 'bg-primary' : i === current ? 'bg-accent' : 'bg-line')} />
              <span className={cn('hidden text-[12px] sm:flex sm:items-center sm:gap-1', i === current ? 'font-bold text-ink' : 'text-muted')}>
                {i < current && <Check className="size-3 text-primary" aria-hidden />}
                {s.title}
              </span>
            </li>
          ))}
        </ol>

        <div>
          <p className="text-[13px] font-semibold text-primary">
            Step {current + 1} of {STEPS.length}
          </p>
          <h1 className="text-[26px] font-extrabold tracking-tight">{STEPS[current]!.title}</h1>
          <p className="mt-1 text-muted">{STEPS[current]!.intro}</p>
        </div>

        <Card padding="lg">
          {loading ? (
            <LoadingRegion label="Loading your profile">
              <div className="flex flex-col gap-3">
                <Skeleton className="h-11" />
                <Skeleton className="h-11" />
                <Skeleton className="h-24" />
              </div>
            </LoadingRegion>
          ) : failed ? (
            <ErrorState
              message={errorMessage(profile.error ?? targets.error ?? consents.error)}
              onRetry={() => {
                void profile.refetch();
                void targets.refetch();
                void consents.refetch();
              }}
            />
          ) : (
            <>
              {current === 0 && (
                <AboutYouSection
                  profile={profile.data!}
                  submitLabel={submitLabel}
                  actions={actions}
                  onSubmit={async (patch) => {
                    await saveProfile(patch);
                    await next();
                  }}
                />
              )}
              {current === 1 && (
                <DietSection
                  profile={profile.data!}
                  submitLabel={submitLabel}
                  actions={actions}
                  onSubmit={async (patch) => {
                    await saveProfile(patch);
                    await next();
                  }}
                />
              )}
              {current === 2 && (
                <KidneySection
                  profile={profile.data!}
                  submitLabel={submitLabel}
                  actions={actions}
                  onSubmit={async (patch) => {
                    await saveProfile(patch);
                    await next();
                  }}
                />
              )}
              {current === 3 && (
                <TargetsSection
                  targets={targets.data!}
                  submitLabel={submitLabel}
                  actions={actions}
                  onSubmit={async (changes) => {
                    await saveTargets(changes);
                    await next();
                  }}
                />
              )}
              {current === 4 && (
                <PreferencesSection
                  profile={profile.data!}
                  consents={consents.data!}
                  submitLabel={submitLabel}
                  actions={actions}
                  onSubmit={async (v) => {
                    await savePreferences(v, consents.data);
                    await next();
                  }}
                />
              )}
              {finishError && <p role="alert" className="mt-3 text-[13px] font-semibold text-bad">{finishError}</p>}
            </>
          )}
        </Card>

        <p className="text-center text-[12px] text-muted">
          Everything here is optional except your name, and you can change it later in your profile.
        </p>
      </main>
    </div>
  );
}
