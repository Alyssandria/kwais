import { Badge, Card, CardHeader, ErrorState, LoadingRegion, Skeleton, StatusLabel } from '@/components/ui';
import { useLabs, useTargets, type ValueSource } from '@/features/profile/api';
import { errorMessage } from '@/lib/api';
import { NUTRIENTS, fmt, labStatus, labStatusText, rangeText } from '@/lib/nutrition';

const date = (iso: string) => new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: iso.length === 10 ? 'UTC' : undefined });

function Source({ source }: { source: ValueSource }) {
  return source === 'clinician_verified' ? <Badge tone="good">Verified</Badge> : <Badge>Entered by patient</Badge>;
}

function Targets() {
  const targets = useTargets();
  return (
    <Card as="section" aria-labelledby="targets-title" padding="none" className="overflow-hidden">
      <div className="px-5 pt-5">
        <CardHeader id="targets-title" title="Daily targets" subtitle="Meal scores use these. Without one, sodium falls back to general CKD guidance." />
      </div>
      {targets.isPending ? (
        <LoadingRegion label="Loading targets">
          <Skeleton className="mx-5 mb-5 h-24" />
        </LoadingRegion>
      ) : targets.isError ? (
        <ErrorState title="We couldn’t load the targets" message={errorMessage(targets.error)} onRetry={() => void targets.refetch()} />
      ) : targets.data.length === 0 ? (
        <p className="px-5 pb-5 text-[13.5px] text-muted">No daily targets set.</p>
      ) : (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Daily targets table, scrolls sideways">
          <table className="w-full min-w-[520px] text-left text-[13.5px]">
            <caption className="sr-only">The patient’s daily nutrient targets</caption>
            <thead className="bg-[#f8fafc] text-[12px] text-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-semibold">Nutrient</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Daily max</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Source</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Since</th>
                <th scope="col" className="px-5 py-2.5 font-semibold">Note</th>
              </tr>
            </thead>
            <tbody>
              {targets.data.map((t) => (
                <tr key={t.nutrient} className="border-t border-line">
                  <th scope="row" className="px-5 py-2.5 font-semibold">{NUTRIENTS[t.nutrient].label}</th>
                  <td className="px-3 py-2.5 text-right tabular-nums">
                    {fmt(t.dailyMax)} {t.unit}
                  </td>
                  <td className="px-3 py-2.5">
                    <Source source={t.source} />
                  </td>
                  <td className="px-3 py-2.5">{date(t.since)}</td>
                  <td className="px-5 py-2.5 text-muted">{t.note ?? '—'}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

function Labs() {
  const labs = useLabs();
  return (
    <Card as="section" aria-labelledby="labs-title" padding="none" className="overflow-hidden">
      <div className="px-5 pt-5">
        <CardHeader id="labs-title" title="Lab results" subtitle="Newest first, compared with the range printed on each slip." />
      </div>
      {labs.isPending ? (
        <LoadingRegion label="Loading lab results">
          <Skeleton className="mx-5 mb-5 h-40" />
        </LoadingRegion>
      ) : labs.isError ? (
        <ErrorState title="We couldn’t load the lab results" message={errorMessage(labs.error)} onRetry={() => void labs.refetch()} />
      ) : labs.data.length === 0 ? (
        <p className="px-5 pb-5 text-[13.5px] text-muted">No lab results yet.</p>
      ) : (
        <div className="overflow-x-auto" tabIndex={0} role="region" aria-label="Lab results table, scrolls sideways">
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <caption className="sr-only">The patient’s lab results</caption>
            <thead className="bg-[#f8fafc] text-[12px] text-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-semibold">Test</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Result</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Slip range</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Collected</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Laboratory</th>
                <th scope="col" className="px-5 py-2.5 font-semibold">Source</th>
              </tr>
            </thead>
            <tbody>
              {labs.data.map((l) => {
                const kind = labStatus(l.value, l.refLow, l.refHigh);
                return (
                  <tr key={l.id} className="border-t border-line">
                    <th scope="row" className="px-5 py-2.5 font-semibold">{l.label}</th>
                    <td className="px-3 py-2.5">
                      <StatusLabel kind={kind}>
                        {l.value} {l.unit}
                        <span className="sr-only"> · {labStatusText(kind)}</span>
                      </StatusLabel>
                    </td>
                    <td className="px-3 py-2.5">{rangeText(l.refLow, l.refHigh)}</td>
                    <td className="px-3 py-2.5">{date(l.collectedOn)}</td>
                    <td className="px-3 py-2.5 text-muted">{l.labName ?? '—'}</td>
                    <td className="px-5 py-2.5">
                      <Source source={l.source} />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </Card>
  );
}

export function LabsTab() {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="sr-only">Labs and targets</h2>
      <Targets />
      <Labs />
    </div>
  );
}
