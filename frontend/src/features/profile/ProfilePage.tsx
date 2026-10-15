import type { ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Copy, ShieldCheck, UserRound } from 'lucide-react';
import { Badge, Card, ErrorState, IconButton, LoadingRegion, Notice, PageHeader, Skeleton, useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { errorMessage } from '@/lib/api';
import { useConsents, useProfile, useTargets, type ValueSource } from './api';
import { ckdLabel } from './options';
import { AboutYouSection, DietSection, KidneySection, PreferencesSection, TargetsSection } from './sections';
import { useSavers } from './useSavers';

function SourceBadge({ source }: { source: ValueSource }) {
  return source === 'clinician_verified' ? (
    <Badge tone="good">
      <ShieldCheck className="size-3" aria-hidden />
      Verified by your clinician
    </Badge>
  ) : (
    <Badge>Entered by you</Badge>
  );
}

function Section({ id, title, subtitle, badge, children }: { id: string; title: string; subtitle?: string; badge?: ReactNode; children: ReactNode }) {
  return (
    <Card as="section" padding="lg" aria-labelledby={id}>
      <div className="mb-5 flex flex-wrap items-start justify-between gap-2">
        <div>
          <h2 id={id} className="text-lg font-extrabold">
            {title}
          </h2>
          {subtitle && <p className="text-[13px] text-muted">{subtitle}</p>}
        </div>
        {badge}
      </div>
      {children}
    </Card>
  );
}

export function ProfilePage() {
  const { user } = useAuth();
  const toast = useToast();
  const profile = useProfile();
  const targets = useTargets();
  const consents = useConsents();
  const { saveProfile, saveTargets, savePreferences } = useSavers();

  if (profile.isPending || targets.isPending || consents.isPending) {
    return (
      <LoadingRegion label="Loading your profile">
        <div className="flex flex-col gap-4">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-48 rounded-card" />
          <Skeleton className="h-64 rounded-card" />
        </div>
      </LoadingRegion>
    );
  }
  if (profile.isError || targets.isError || consents.isError) {
    return (
      <Card padding="none">
        <ErrorState
          title="We couldn’t load your profile"
          message={errorMessage(profile.error ?? targets.error ?? consents.error)}
          onRetry={() => {
            void profile.refetch();
            void targets.refetch();
            void consents.refetch();
          }}
        />
      </Card>
    );
  }

  const p = profile.data;
  const saved = (what: string) => () => toast.success(`${what} saved`);

  return (
    <div className="flex flex-col gap-5">
      <PageHeader title="Your profile" description="What you share here is used only to personalise your own estimates and scores." />

      {!p.onboarding.complete && (
        <Notice title="Setup isn’t finished">
          You can fill in your profile here, or <Link to="/patient/onboarding">continue the guided setup</Link>.
        </Notice>
      )}

      <Card padding="lg" className="flex flex-wrap items-center gap-4">
        <span aria-hidden className="flex size-14 items-center justify-center rounded-full bg-primary-soft text-primary-dark">
          <UserRound className="size-7" />
        </span>
        <div className="flex-1">
          <p className="text-lg font-extrabold">
            {p.firstName} {p.lastName}
          </p>
          <p className="text-[13px] text-muted">{user?.email}</p>
        </div>
        <div className="flex items-center gap-2 rounded-card border border-line bg-canvas px-3 py-2">
          <div>
            <p className="text-[11.5px] font-semibold text-muted uppercase">Patient code</p>
            <p className="font-mono text-base font-bold tracking-wider">{p.patientCode}</p>
          </div>
          <IconButton
            label="Copy patient code"
            size="sm"
            variant="ghost"
            icon={<Copy className="size-4" />}
            onClick={() => {
              void navigator.clipboard?.writeText(p.patientCode).then(() => toast.info('Patient code copied'));
            }}
          />
        </div>
        <p className="w-full text-[12px] text-muted">
          In a later version you can give this code to your doctor so they can see your records. Only share it with your care team.
        </p>
      </Card>

      <Section id="about" title="About you">
        <AboutYouSection profile={p} submitLabel="Save changes" onSubmit={(v) => saveProfile(v).then(saved('Personal details'))} />
      </Section>

      <Section id="diet" title="Food and diet">
        <DietSection profile={p} submitLabel="Save changes" onSubmit={(v) => saveProfile(v).then(saved('Food and diet'))} />
      </Section>

      <Section
        id="kidney"
        title="Kidney health"
        subtitle={p.ckdStage ? `Current: ${ckdLabel(p.ckdStage.value)}` : 'No CKD stage entered'}
        badge={p.ckdStage ? <SourceBadge source={p.ckdStage.source} /> : undefined}
      >
        <KidneySection profile={p} submitLabel="Save changes" onSubmit={(v) => saveProfile(v).then(saved('Kidney health'))} />
      </Section>

      <Section id="targets" title="Daily targets" subtitle="Meal scores compare your meals with these. Changing a target keeps your past scores as they were.">
        <TargetsSection
          key={targets.dataUpdatedAt}
          targets={targets.data}
          submitLabel="Save targets"
          onSubmit={(v) => saveTargets(v).then(saved('Targets'))}
        />
      </Section>

      <Section id="prefs" title="AI and reminders">
        <PreferencesSection
          profile={p}
          consents={consents.data}
          submitLabel="Save preferences"
          onSubmit={(v) => savePreferences(v, consents.data).then(saved('Preferences'))}
        />
      </Section>
    </div>
  );
}
