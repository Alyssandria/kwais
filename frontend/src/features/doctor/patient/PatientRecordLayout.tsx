import { useState } from 'react';
import { Link, NavLink, Outlet, useNavigate, useOutletContext, useParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { ChevronLeft } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, ErrorState, LoadingRegion, Notice, Skeleton, useToast } from '@/components/ui';
import { useCareAction } from '@/features/care/api';
import { patientMeta } from '@/features/care/format';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { PatientScopeProvider } from '@/lib/patient-scope';
import { usePatientRecord, type PatientRecord } from './api';

const TABS = [
  { to: '.', label: 'Overview', end: true },
  { to: 'meals', label: 'Meals', end: false },
  { to: 'trends', label: 'Trends', end: true },
  { to: 'labs', label: 'Labs and targets', end: true },
];

const SEX: Record<string, string> = { female: 'Female', male: 'Male', intersex: 'Intersex' };

export function usePatientRecordContext() {
  return useOutletContext<PatientRecord>();
}

function about(r: PatientRecord): string {
  const p = r.profile;
  const age = p.birthYear ? `${new Date().getFullYear() - p.birthYear} years` : null;
  const since = `Sharing since ${new Date(r.since).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' })}`;
  return [age, p.sex ? SEX[p.sex] : null, since].filter(Boolean).join(' · ');
}

function Chips({ label, items, tone }: { label: string; items: string[]; tone: 'warn' | 'neutral' }) {
  if (!items.length) return null;
  return (
    <div className="flex flex-wrap items-center gap-1.5">
      <span className="text-[12.5px] font-semibold text-muted">{label}</span>
      {items.map((i) => (
        <Badge key={i} tone={tone}>
          {i}
        </Badge>
      ))}
    </div>
  );
}

export function PatientRecordLayout() {
  const { patientId = '' } = useParams();
  const record = usePatientRecord(patientId);
  const act = useCareAction('doctor');
  const navigate = useNavigate();
  const toast = useToast();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const back = (
    <Link to="/doctor/dashboard" className="inline-flex min-h-11 items-center gap-2 self-start font-semibold no-underline">
      <ChevronLeft className="size-[18px]" aria-hidden />
      All patients
    </Link>
  );

  if (record.isPending) {
    return (
      <div className="flex flex-col gap-5">
        {back}
        <LoadingRegion label="Loading this patient">
          <Skeleton className="h-36 w-full" />
          <Skeleton className="mt-4 h-64 w-full" />
        </LoadingRegion>
      </div>
    );
  }

  if (record.isError) {
    const notFound = record.error instanceof AxiosError && record.error.response?.status === 404;
    return (
      <div className="flex flex-col gap-5">
        {back}
        <Card padding="none">
          {notFound ? (
            <ErrorState title="This patient isn’t sharing with you" message="They may have stopped sharing, or the link is wrong." />
          ) : (
            <ErrorState title="We couldn’t load this patient" message={errorMessage(record.error)} onRetry={() => void record.refetch()} />
          )}
        </Card>
      </div>
    );
  }

  const r = record.data;
  const name = r.patient.name;

  const stop = async () => {
    setError(null);
    try {
      await act.mutateAsync({ id: r.linkId, action: 'end' });
      toast.success(`Stopped following ${name}`);
      navigate('/doctor/dashboard');
    } catch (err) {
      setConfirm(false);
      setError(errorMessage(err));
    }
  };

  return (
    <PatientScopeProvider patientId={patientId}>
      <div className="mx-auto flex w-full max-w-[1056px] flex-col gap-5">
        {back}
        <Card as="section" aria-labelledby="patient-name" padding="lg" className="flex flex-col gap-3">
          <div className="flex flex-wrap items-start justify-between gap-3">
            <div>
              <h1 id="patient-name" className="text-[26px] font-extrabold tracking-tight">{name}</h1>
              <p className="text-[13.5px] text-muted">{patientMeta(r.patient)}</p>
              <p className="text-[13.5px] text-muted">{about(r)}</p>
            </div>
            <Button variant="secondary" size="sm" onClick={() => setConfirm(true)} aria-label={`Stop following ${name}`}>
              Stop following
            </Button>
          </div>
          <Chips label="Allergies" items={r.profile.allergies} tone="warn" />
          <Chips label="Restrictions" items={r.profile.restrictions} tone="neutral" />
          <Chips label="Diet" items={r.profile.dietaryPreferences} tone="neutral" />
          <p className="text-[12.5px] text-muted">Read-only. The patient can see that you viewed their record in their activity log.</p>
        </Card>

        {error && (
          <div role="alert">
            <Notice tone="bad">{error}</Notice>
          </div>
        )}

        <nav aria-label="Patient record" className="-mx-1 flex gap-1 overflow-x-auto border-b border-line px-1">
          {TABS.map((t) => (
            <NavLink
              key={t.label}
              to={t.to}
              end={t.end}
              className={({ isActive }) =>
                cn(
                  'shrink-0 border-b-[3px] px-3 py-2.5 text-[14px] font-semibold no-underline',
                  isActive ? 'border-primary text-primary-dark' : 'border-transparent text-[#475569] hover:text-ink',
                )
              }
            >
              {t.label}
            </NavLink>
          ))}
        </nav>

        <Outlet context={r} />

        <ConfirmDialog
          open={confirm}
          title={`Stop following ${name}?`}
          description="You will no longer see their records. They are told, and can invite you again later."
          confirmLabel="Stop following"
          destructive
          loading={act.isPending}
          onConfirm={() => void stop()}
          onCancel={() => setConfirm(false)}
        />
      </div>
    </PatientScopeProvider>
  );
}
