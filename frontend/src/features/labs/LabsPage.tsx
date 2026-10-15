import { useMemo, useState } from 'react';
import { FlaskConical, Lock, Pencil, Plus, Trash2 } from 'lucide-react';
import { CartesianGrid, Line, LineChart, ReferenceArea, ReferenceLine, ResponsiveContainer, Tooltip, XAxis, YAxis } from 'recharts';
import {
  Badge,
  Button,
  Card,
  ConfirmDialog,
  EmptyState,
  ErrorState,
  HeroBand,
  IconButton,
  LoadingRegion,
  Skeleton,
  StatusLabel,
  useToast,
} from '@/components/ui';
import { cn } from '@/lib/cn';
import { errorMessage } from '@/lib/api';
import { labStatus, labStatusText, rangeText } from '@/lib/nutrition';
import { useCreateLab, useDeleteLab, useLabs, useUpdateLab, type Lab, type LabTest } from '@/features/profile/api';
import { LabFormModal } from './LabForm';

const shortDate = (iso: string) =>
  new Date(`${iso}T12:00:00`).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric' });

/** Groups results by test (custom "other" tests by their name), newest first inside each group. */
function groupLabs(labs: Lab[]) {
  const groups = new Map<string, Lab[]>();
  for (const l of labs) {
    const key = l.test === 'other' ? `other:${l.label.toLowerCase()}` : l.test;
    groups.set(key, [...(groups.get(key) ?? []), l]);
  }
  return [...groups.entries()].map(([key, items]) => ({ key, items, latest: items[0]! }));
}

export function LabsPage() {
  const toast = useToast();
  const labs = useLabs();
  const createLab = useCreateLab();
  const updateLab = useUpdateLab();
  const deleteLab = useDeleteLab();

  const [selectedKey, setSelectedKey] = useState<string | null>(null);
  const [formOpen, setFormOpen] = useState(false);
  const [editing, setEditing] = useState<Lab | null>(null);
  const [deleting, setDeleting] = useState<Lab | null>(null);

  const groups = useMemo(() => groupLabs(labs.data ?? []), [labs.data]);
  const selected = groups.find((g) => g.key === selectedKey) ?? groups[0];

  const openAdd = () => {
    setEditing(null);
    setFormOpen(true);
  };

  return (
    <div className="flex flex-col gap-5">
      <HeroBand>
        <div className="flex flex-wrap items-end justify-between gap-4">
          <div className="max-w-2xl">
            <h1 className="text-[30px] font-extrabold tracking-tight">Lab results</h1>
            <p className="mt-1 text-[#d7eeeb]">
              Copy values exactly as printed on your lab slip. K-WAIS shows them and uses them in meal scores, but never
              interprets them as a diagnosis.
            </p>
            <p className="mt-3 inline-flex items-center gap-1.5 rounded-full bg-primary-soft px-3 py-1 text-[12.5px] font-bold text-primary-dark">
              <Lock className="size-3.5" aria-hidden />
              Encrypted at rest
            </p>
          </div>
          <Button variant="accent" size="lg" onClick={openAdd} iconLeft={<Plus className="size-[18px]" strokeWidth={2.4} />}>
            Add a result
          </Button>
        </div>
      </HeroBand>

      {labs.isPending ? (
        <LoadingRegion label="Loading lab results">
          <div className="grid gap-4 lg:grid-cols-[280px_1fr]">
            <Skeleton className="h-72 rounded-card" />
            <Skeleton className="h-72 rounded-card" />
          </div>
        </LoadingRegion>
      ) : labs.isError ? (
        <Card padding="none">
          <ErrorState title="We couldn’t load your lab results" message={errorMessage(labs.error)} onRetry={() => void labs.refetch()} />
        </Card>
      ) : groups.length === 0 ? (
        <Card padding="none">
          <EmptyState
            icon={FlaskConical}
            title="No lab results yet"
            description="Add values from your latest lab slip. With the reference range printed next to each value, K-WAIS can show whether it was in range and use it in meal scores."
            action={
              <Button variant="accent" onClick={openAdd} iconLeft={<Plus className="size-4" />}>
                Add your first result
              </Button>
            }
          />
        </Card>
      ) : (
        <div className="flex flex-col gap-4 lg:flex-row lg:items-start">
          <nav aria-label="Tests" className="lg:w-[280px] lg:shrink-0">
            <Card padding="sm" className="flex flex-col gap-1">
              {groups.map((g) => {
                const kind = labStatus(g.latest.value, g.latest.refLow, g.latest.refHigh);
                const on = g.key === selected?.key;
                return (
                  <button
                    key={g.key}
                    type="button"
                    aria-pressed={on}
                    onClick={() => setSelectedKey(g.key)}
                    className={cn(
                      'flex min-h-[60px] w-full cursor-pointer items-center justify-between gap-3 rounded-field border px-3.5 py-2.5 text-left',
                      on ? 'border-primary bg-primary-soft' : 'border-transparent hover:bg-canvas',
                    )}
                  >
                    <span className="flex flex-col">
                      <span className="font-bold">{g.latest.label}</span>
                      <span className="text-[12px] text-muted">{shortDate(g.latest.collectedOn)}</span>
                    </span>
                    <span className="flex flex-col items-end">
                      <span className="font-extrabold">{g.latest.value}</span>
                      <StatusLabel kind={kind} className="text-[11.5px]">
                        {kind === 'none' ? 'No range' : kind === 'within' ? 'In range' : kind === 'above' ? 'Above' : 'Below'}
                      </StatusLabel>
                    </span>
                  </button>
                );
              })}
            </Card>
          </nav>

          {selected && (
            <TestDetail
              items={selected.items}
              onEdit={(l) => {
                setEditing(l);
                setFormOpen(true);
              }}
              onDelete={setDeleting}
            />
          )}
        </div>
      )}

      <LabFormModal
        open={formOpen}
        editing={editing}
        defaultTest={(selected?.latest.test as LabTest | undefined) ?? 'potassium'}
        onClose={() => setFormOpen(false)}
        onSave={async (input) => {
          if (editing) {
            await updateLab.mutateAsync({ id: editing.id, input });
            toast.success('Result updated');
          } else {
            await createLab.mutateAsync(input);
            toast.success('Result saved', 'It’s encrypted and visible only to you.');
          }
        }}
      />

      <ConfirmDialog
        open={deleting != null}
        title="Delete this result?"
        description={deleting ? `${deleting.label} ${deleting.value} ${deleting.unit} from ${shortDate(deleting.collectedOn)} will be removed permanently.` : ''}
        confirmLabel="Delete result"
        destructive
        loading={deleteLab.isPending}
        onCancel={() => setDeleting(null)}
        onConfirm={async () => {
          if (!deleting) return;
          try {
            await deleteLab.mutateAsync(deleting.id);
            toast.success('Result deleted');
          } catch (err) {
            toast.error('Couldn’t delete', errorMessage(err));
          } finally {
            setDeleting(null);
          }
        }}
      />
    </div>
  );
}

function TestDetail({ items, onEdit, onDelete }: { items: Lab[]; onEdit: (l: Lab) => void; onDelete: (l: Lab) => void }) {
  const latest = items[0]!;
  const kind = labStatus(latest.value, latest.refLow, latest.refHigh);
  const chronological = [...items].reverse();
  const data = chronological.map((l) => ({ date: shortDate(l.collectedOn), value: l.value }));
  const values = items.map((l) => l.value).concat([latest.refLow, latest.refHigh].filter((v): v is number => v != null));
  const lo = Math.min(...values);
  const hi = Math.max(...values);
  const pad = (hi - lo) * 0.2 || Math.abs(hi) * 0.2 || 1;
  const summary = `${latest.label} results over time: ${data.map((d) => `${d.date} ${d.value}`).join(', ')}. Slip range ${rangeText(latest.refLow, latest.refHigh)} ${latest.unit}.`;

  return (
    <Card as="section" padding="lg" aria-labelledby="test-title" className="flex min-w-0 flex-1 flex-col gap-5">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h2 id="test-title" className="text-xl font-extrabold">
            {latest.label}
          </h2>
          <p className="text-[13px] text-muted">
            {latest.unit} · slip range {rangeText(latest.refLow, latest.refHigh)}
          </p>
        </div>
        <div className="text-right">
          <p className="text-[30px] leading-none font-extrabold">{latest.value}</p>
          <StatusLabel kind={kind}>
            {labStatusText(kind)} · {shortDate(latest.collectedOn)}
          </StatusLabel>
        </div>
      </div>

      {items.length > 1 ? (
        <div role="img" aria-label={summary} className="h-56">
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={data} margin={{ top: 12, right: 16, bottom: 0, left: -8 }}>
              <CartesianGrid vertical={false} stroke="#f1f5f9" />
              {latest.refLow != null && latest.refHigh != null ? (
                <ReferenceArea y1={latest.refLow} y2={latest.refHigh} fill="#ecfdf5" fillOpacity={1} label={{ value: 'Slip range', position: 'insideTopRight', fill: '#047857', fontSize: 11, fontWeight: 600 }} />
              ) : latest.refLow != null ? (
                <ReferenceLine y={latest.refLow} stroke="#047857" strokeDasharray="5 4" label={{ value: `Range above ${latest.refLow}`, position: 'insideTopRight', fill: '#047857', fontSize: 11 }} />
              ) : latest.refHigh != null ? (
                <ReferenceLine y={latest.refHigh} stroke="#047857" strokeDasharray="5 4" label={{ value: `Range below ${latest.refHigh}`, position: 'insideTopRight', fill: '#047857', fontSize: 11 }} />
              ) : null}
              <XAxis dataKey="date" tickLine={false} axisLine={{ stroke: '#e2e8f0' }} tick={{ fill: '#64748b', fontSize: 11 }} />
              <YAxis tickLine={false} axisLine={false} tick={{ fill: '#64748b', fontSize: 11 }} domain={[Math.max(0, lo - pad), hi + pad]} />
              <Tooltip formatter={(v: number) => [`${v} ${latest.unit}`, latest.label]} contentStyle={{ borderRadius: 12, border: '1px solid #e2e8f0', fontSize: 12 }} />
              <Line type="monotone" dataKey="value" stroke="#087f8c" strokeWidth={2.5} dot={{ r: 4, fill: '#fff', stroke: '#087f8c', strokeWidth: 2 }} isAnimationActive={false} />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p className="rounded-card bg-canvas p-4 text-[13px] text-muted">Add another {latest.label} result to see how it changes over time.</p>
      )}

      <div className="overflow-x-auto rounded-card border border-line">
        <table className="w-full min-w-[560px] border-collapse text-[13px]">
          <caption className="sr-only">All {latest.label} results</caption>
          <thead>
            <tr className="bg-canvas text-left text-[#475569]">
              <th scope="col" className="px-3.5 py-2.5 font-semibold">Collected</th>
              <th scope="col" className="px-3.5 py-2.5 font-semibold">Result</th>
              <th scope="col" className="px-3.5 py-2.5 font-semibold">Slip range</th>
              <th scope="col" className="px-3.5 py-2.5 font-semibold">Entered by</th>
              <th scope="col" className="px-3.5 py-2.5"><span className="sr-only">Actions</span></th>
            </tr>
          </thead>
          <tbody>
            {items.map((l) => {
              const k = labStatus(l.value, l.refLow, l.refHigh);
              return (
                <tr key={l.id} className="border-t border-line">
                  <td className="px-3.5 py-2.5">
                    {shortDate(l.collectedOn)}
                    {l.labName && <span className="block text-[12px] text-muted">{l.labName}</span>}
                  </td>
                  <td className="px-3.5 py-2.5">
                    <span className="font-bold">
                      {l.value} {l.unit}
                    </span>
                    <StatusLabel kind={k} className="block text-[11.5px]">
                      {labStatusText(k)}
                    </StatusLabel>
                  </td>
                  <td className="px-3.5 py-2.5">{rangeText(l.refLow, l.refHigh)}</td>
                  <td className="px-3.5 py-2.5">
                    {l.source === 'clinician_verified' ? <Badge tone="good">Clinician-verified</Badge> : <Badge>You · not verified</Badge>}
                  </td>
                  <td className="px-2 py-1.5 text-right whitespace-nowrap">
                    <IconButton label={`Edit ${l.label} result from ${shortDate(l.collectedOn)}`} variant="ghost" size="sm" icon={<Pencil className="size-4" />} onClick={() => onEdit(l)} />
                    <IconButton label={`Delete ${l.label} result from ${shortDate(l.collectedOn)}`} variant="ghost" size="sm" icon={<Trash2 className="size-4" />} onClick={() => onDelete(l)} />
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <p className="text-[12px] text-muted">
        “Above” or “below” only compares with the range printed on your slip. Your doctor decides what a result means for you.
      </p>
    </Card>
  );
}
