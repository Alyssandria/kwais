import { useMemo, useState } from 'react';
import { Plus, Search, Users } from 'lucide-react';
import { Badge, Button, Card, CardHeader, EmptyState, ErrorState, LoadingRegion, Skeleton } from '@/components/ui';
import { patientMeta } from '@/features/care/format';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { fmt } from '@/lib/nutrition';
import { useDoctorPatients, type PatientRow, type Severity, type Status } from './patients';

type Filter = 'all' | 'attention' | 'not_logging' | 'dialysis';

const FILTERS: { key: Filter; label: string; match: (r: PatientRow) => boolean }[] = [
  { key: 'all', label: 'All', match: () => true },
  { key: 'attention', label: 'Needs attention', match: (r) => r.attention > 0 },
  { key: 'not_logging', label: 'Not logging', match: (r) => r.flags.some((f) => f.kind === 'not_logging' || f.kind === 'never_logged') },
  { key: 'dialysis', label: 'On dialysis', match: (r) => r.patient.dialysisStatus === 'hemodialysis' || r.patient.dialysisStatus === 'peritoneal' },
];

const SEVERITY_TONE: Record<Severity, 'bad' | 'warn' | 'info' | 'good'> = { bad: 'bad', warn: 'warn', info: 'info', ok: 'good' };
const STATUS_TEXT: Record<Status, string> = { above: 'text-bad', below: 'text-bad', near: 'text-warn', within: 'text-good', none: 'text-[#475569]' };
const STATUS_BAR: Record<Status, string> = { above: 'bg-bad', below: 'bg-bad', near: 'bg-warn-mark', within: 'bg-good', none: 'bg-[#94a3b8]' };
const STATUS_MARK: Record<Status, string> = { above: '▲', below: '▼', near: '●', within: '✓', none: '–' };

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

const shortDay = (iso: string) => new Date(`${iso}T12:00:00Z`).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', timeZone: 'UTC' });

export function lastMealText(r: Pick<PatientRow, 'lastMealAt' | 'daysSinceLastMeal'>): string {
  if (!r.lastMealAt || r.daysSinceLastMeal == null) return 'No meals logged yet';
  if (r.daysSinceLastMeal === 0) return `Last meal today, ${new Date(r.lastMealAt).toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`;
  if (r.daysSinceLastMeal === 1) return 'Last meal yesterday';
  return `Last meal ${r.daysSinceLastMeal} days ago`;
}

export function sodiumText(s: PatientRow['sodium']): string {
  if (s.average == null) return '– No analysed meals this week';
  const of = s.limitSource === 'target' ? `of ${fmt(s.limit)} mg target` : `mg · general guidance ${fmt(s.limit)}`;
  return `${STATUS_MARK[s.status]} ${fmt(s.average)} ${of}`;
}

export function labText(l: NonNullable<PatientRow['lab']>): string {
  return `${l.status === 'none' ? '' : `${STATUS_MARK[l.status]} `}${l.label} ${l.value} ${l.unit}`;
}

function Days({ row }: { row: PatientRow }) {
  return (
    <div>
      <div role="img" aria-label={`${row.daysLogged} of the last 7 days logged`} className="flex items-center gap-1">
        {row.days.map((d) => (
          <span key={d.date} className={cn('size-3.5 rounded-[4px]', d.logged ? 'bg-primary' : 'border-[1.5px] border-muted bg-surface')} />
        ))}
      </div>
      <p className="text-[12.5px] text-muted">{lastMealText(row)}</p>
    </div>
  );
}

function Sodium({ row }: { row: PatientRow }) {
  const s = row.sodium;
  const pct = s.average == null ? 0 : Math.min(100, (s.average / s.limit) * 100);
  return (
    <div className="min-w-[170px]">
      <div className="h-2 overflow-hidden rounded-full bg-line">
        <div className={cn('h-2 rounded-full', STATUS_BAR[s.status])} style={{ width: `${pct}%` }} />
      </div>
      <p className={cn('mt-1 text-[12.5px] font-bold', STATUS_TEXT[s.status])}>{sodiumText(s)}</p>
    </div>
  );
}

function Lab({ row }: { row: PatientRow }) {
  const l = row.lab;
  if (!l) return <p className="text-[12.5px] font-bold text-[#475569]">No labs yet</p>;
  const range = l.refLow != null || l.refHigh != null ? `Range ${l.refLow ?? '…'}–${l.refHigh ?? '…'} · ` : '';
  return (
    <div>
      <p className={cn('text-[12.5px] font-bold', STATUS_TEXT[l.status])}>{labText(l)}</p>
      <p className="text-[12.5px] text-muted">
        {range}
        {shortDay(l.collectedOn)}
      </p>
    </div>
  );
}

function Flags({ row }: { row: PatientRow }) {
  return (
    <div className="flex flex-wrap gap-1.5">
      {row.flags.map((f) => (
        <Badge key={f.kind + f.text} tone={SEVERITY_TONE[f.severity]}>
          {f.text}
        </Badge>
      ))}
    </div>
  );
}

function Tile({ label, value, of, note, tone }: { label: string; value: number; of?: number; note: string; tone?: 'bad' }) {
  return (
    <Card className="flex flex-col">
      <p className="text-[13px] font-semibold text-muted">{label}</p>
      <p className={cn('text-[28px] font-extrabold', tone === 'bad' && value > 0 && 'text-bad')}>
        {value}
        {of != null && <span className="text-[15px] font-semibold text-muted"> of {of}</span>}
      </p>
      <p className="text-[12.5px] text-muted">{note}</p>
    </Card>
  );
}

export function PatientList({ onAdd, onStop }: { onAdd: () => void; onStop: (linkId: string, name: string) => void }) {
  const list = useDoctorPatients();
  const [filter, setFilter] = useState<Filter>('all');
  const [query, setQuery] = useState('');

  const rows = useMemo(() => {
    const q = query.trim().toLowerCase();
    const match = FILTERS.find((f) => f.key === filter)!.match;
    return (list.data?.patients ?? []).filter((r) => match(r) && (!q || r.patient.name.toLowerCase().includes(q) || r.patient.patientCode.toLowerCase().includes(q)));
  }, [list.data, filter, query]);

  if (list.isPending) {
    return (
      <LoadingRegion label="Loading your patients">
        <Skeleton className="h-64 w-full" />
      </LoadingRegion>
    );
  }
  if (list.isError) {
    return (
      <Card padding="none">
        <ErrorState title="We couldn’t load your patients" message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
      </Card>
    );
  }

  const { summary, patients } = list.data;
  const addButton = (
    <Button variant="accent" onClick={onAdd} iconLeft={<Plus className="size-4" aria-hidden />}>
      Add a patient
    </Button>
  );

  if (patients.length === 0) {
    return (
      <Card as="section" aria-labelledby="patients-title" padding="none">
        <div className="px-5 pt-5">
          <CardHeader id="patients-title" title="Your patients" />
        </div>
        <EmptyState
          icon={Users}
          title="No patients yet"
          description="Add a patient with their code, or ask them to invite you from their Settings. Sharing starts once they approve."
          action={addButton}
        />
      </Card>
    );
  }

  return (
    <>
      <div className="grid gap-3.5 sm:grid-cols-3">
        <Tile label="Needs attention" value={summary.needsAttention} tone="bad" note="Over target most days, a lab out of range, or not logging" />
        <Tile label="Logged a meal today" value={summary.loggedToday} of={summary.total} note="In each patient’s own time zone" />
        <Tile label="Targets not verified" value={summary.targetsUnverified} note="Scored against values the patient entered" />
      </div>

      <Card as="section" aria-labelledby="patients-title" padding="none">
        <div className="flex flex-wrap items-center justify-between gap-3 px-5 pt-5 pb-3">
          <h2 id="patients-title" className="text-base font-bold">
            Your patients
          </h2>
          <div className="flex flex-wrap items-center gap-2.5">
            <label className="flex h-11 min-w-[220px] items-center gap-2 rounded-field border border-[#cbd5e1] bg-surface px-3">
              <Search className="size-4 text-muted" aria-hidden />
              <span className="sr-only">Search patients</span>
              <input
                type="search"
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Name or patient code"
                className="min-w-0 flex-1 bg-transparent text-sm outline-none"
              />
            </label>
            {addButton}
          </div>
        </div>
        <div role="group" aria-label="Show" className="flex flex-wrap gap-1.5 px-5 pb-3">
          {FILTERS.map((f) => {
            const count = patients.filter(f.match).length;
            const on = filter === f.key;
            return (
              <button
                key={f.key}
                type="button"
                aria-pressed={on}
                onClick={() => setFilter(f.key)}
                className={cn(
                  'h-9 cursor-pointer rounded-full px-3 text-[13px]',
                  on ? 'border-[1.5px] border-primary bg-primary-soft font-bold text-primary-dark' : 'border border-line bg-surface font-semibold',
                )}
              >
                {f.label} · {count}
              </button>
            );
          })}
        </div>

        {rows.length === 0 ? (
          <p className="border-t border-line px-5 py-8 text-center text-muted">No patients match. Try another filter or search.</p>
        ) : (
          <>
            <div className="hidden overflow-x-auto md:block" tabIndex={0} role="region" aria-label="Patient table, scrolls sideways">
              <table className="w-full min-w-[900px] border-collapse text-[13.5px]">
                <caption className="sr-only">Your patients with their recent logging, sodium, labs and flags. Patients needing attention are listed first.</caption>
                <thead>
                  <tr className="bg-[#f8fafc] text-left text-[12px] text-[#475569]">
                    <th scope="col" className="px-5 py-2.5 font-semibold">Patient</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Last 7 days logged</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Sodium, 7-day average</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Latest lab</th>
                    <th scope="col" className="px-3 py-2.5 font-semibold">Why it’s flagged</th>
                    <th scope="col" className="px-5 py-2.5">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody>
                  {rows.map((r) => (
                    <tr key={r.linkId} className="border-t border-line align-top">
                      <th scope="row" className="px-5 py-3 text-left font-normal">
                        <div className="flex items-center gap-2.5">
                          <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary-dark">
                            {initials(r.patient.name)}
                          </span>
                          <span className="flex flex-col">
                            <span className="font-bold">{r.patient.name}</span>
                            <span className="text-[12.5px] text-muted">{patientMeta(r.patient)}</span>
                          </span>
                        </div>
                      </th>
                      <td className="px-3 py-3">
                        <Days row={r} />
                      </td>
                      <td className="px-3 py-3">
                        <Sodium row={r} />
                      </td>
                      <td className="px-3 py-3">
                        <Lab row={r} />
                      </td>
                      <td className="px-3 py-3">
                        <Flags row={r} />
                      </td>
                      <td className="px-5 py-3 text-right">
                        <Button variant="ghost" size="sm" onClick={() => onStop(r.linkId, r.patient.name)} aria-label={`Stop following ${r.patient.name}`}>
                          Stop following
                        </Button>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <ul className="flex flex-col gap-2.5 border-t border-line p-3 md:hidden">
              {rows.map((r) => (
                <li key={r.linkId} className="flex flex-col gap-2.5 rounded-card border border-line p-3.5">
                  <div className="flex items-center gap-2.5">
                    <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-primary-soft font-bold text-primary-dark">
                      {initials(r.patient.name)}
                    </span>
                    <div className="min-w-0 flex-1">
                      <p className="font-bold">{r.patient.name}</p>
                      <p className="text-[12.5px] text-muted">{patientMeta(r.patient)}</p>
                    </div>
                  </div>
                  <Days row={r} />
                  <Sodium row={r} />
                  <Lab row={r} />
                  <Flags row={r} />
                  <div>
                    <Button variant="ghost" size="sm" onClick={() => onStop(r.linkId, r.patient.name)} aria-label={`Stop following ${r.patient.name}`}>
                      Stop following
                    </Button>
                  </div>
                </li>
              ))}
            </ul>
          </>
        )}
        <p className="px-5 pt-1 pb-4 text-[12.5px] text-muted">
          Sodium compares the 7-day average of analysed meals with each patient’s target, or with general CKD guidance (2,000 mg a day) when they have none. Estimates
          come from food tables and what patients type.
        </p>
      </Card>
    </>
  );
}
