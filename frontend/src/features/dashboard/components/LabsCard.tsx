import { Link } from 'react-router-dom';
import { FlaskConical, Plus } from 'lucide-react';
import { Card, EmptyState, StatusLabel } from '@/components/ui';
import { labStatus, labStatusText, rangeText } from '@/lib/nutrition';
import type { LabSummary } from '../types';

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' });

/** Tiny trend line of past entries. Decorative extra: the latest value is always written out. */
function Sparkline({ values, label }: { values: number[]; label: string }) {
  if (values.length < 2) return null;
  const min = Math.min(...values);
  const max = Math.max(...values);
  const span = max - min || 1;
  const pts = values
    .map((v, i) => `${(i / (values.length - 1)) * 196 + 2},${36 - ((v - min) / span) * 30}`)
    .join(' ');
  return (
    <svg role="img" aria-label={label} viewBox="0 0 200 40" className="h-10 w-full">
      <polyline points={pts} fill="none" stroke="#087f8c" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
    </svg>
  );
}

export function LabsCard({ labs }: { labs: LabSummary[] }) {
  return (
    <section aria-labelledby="labs-title" className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h2 id="labs-title" className="text-base font-bold">
            My lab results
          </h2>
          <p className="text-[12.5px] text-muted">As you entered them, compared with the range printed on your lab slip</p>
        </div>
        <Link
          to="/patient/labs"
          className="inline-flex h-10 items-center gap-1.5 rounded-field border border-line bg-surface px-3.5 font-semibold no-underline hover:bg-canvas"
        >
          <Plus className="size-4" aria-hidden />
          Add results
        </Link>
      </div>

      {labs.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={FlaskConical}
            title="No lab results yet"
            description="Add values from your latest lab slip to see them here and to get meal scores."
          />
        </Card>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          {labs.map((lab) => {
            const latest = lab.history.at(-1);
            if (!latest) return null;
            const kind = labStatus(latest.value, lab.refLow, lab.refHigh);
            return (
              <Card key={lab.test} as="article" padding="sm" className="flex flex-col gap-1.5">
                <div className="flex items-center justify-between gap-2">
                  <h3 className="font-bold">{lab.label}</h3>
                  <span className="text-[11.5px] text-muted">{shortDate(latest.collectedOn)}</span>
                </div>
                <p className="flex items-baseline gap-1.5">
                  <span className="text-2xl font-extrabold">{latest.value}</span>
                  <span className="text-[12.5px] text-muted">{lab.unit}</span>
                </p>
                <StatusLabel kind={kind}>{labStatusText(kind)}</StatusLabel>
                <p className="text-[12px] text-muted">Slip range {rangeText(lab.refLow, lab.refHigh)}</p>
                <Sparkline
                  values={lab.history.map((h) => h.value)}
                  label={`${lab.label} entries over time: ${lab.history.map((h) => h.value).join(', ')}`}
                />
                <p className="mt-auto border-t border-[#f1f5f9] pt-2 text-[11.5px] text-muted">
                  {lab.source === 'clinician_verified' ? 'Verified by your clinician' : 'Entered by you · not yet clinician-verified'}
                </p>
              </Card>
            );
          })}
        </div>
      )}
    </section>
  );
}
