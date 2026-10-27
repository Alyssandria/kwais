import { useState } from 'react';
import { Plus } from 'lucide-react';
import { Badge, Button, Card, CardHeader, ErrorState, LoadingRegion, Skeleton, StatusLabel, useToast } from '@/components/ui';
import { LabFormModal } from '@/features/labs/LabForm';
import { ckdLabel } from '@/features/profile/options';
import { useLabs, useTargets, type Lab, type Target, type ValueSource, type Verification } from '@/features/profile/api';
import { errorMessage } from '@/lib/api';
import { NUTRIENTS, fmt, labStatus, labStatusText, rangeText } from '@/lib/nutrition';
import { verifiedText } from '@/lib/verification';
import { StageModal, TargetModal, type DefiniteStage } from './ClinicalForms';
import { useAddPatientLab, useCorrectPatientLab, useSetPatientTarget, useSetStage, useVerifyPatientLab } from './clinical';
import { usePatientRecordContext } from './PatientRecordLayout';

const date = (iso: string) =>
  new Date(iso.length === 10 ? `${iso}T12:00:00Z` : iso).toLocaleDateString('en-PH', { day: 'numeric', month: 'short', year: 'numeric', timeZone: iso.length === 10 ? 'UTC' : undefined });

function Source({ source, verified }: { source: ValueSource; verified: Verification | null }) {
  return source === 'clinician_verified' ? <Badge tone="good">{verifiedText(verified, 'a clinician')}</Badge> : <Badge>Entered by patient</Badge>;
}

function useRun() {
  const toast = useToast();
  const [busy, setBusy] = useState<string | null>(null);
  const run = async (key: string, work: () => Promise<unknown>, done: string) => {
    setBusy(key);
    try {
      await work();
      toast.success(done);
    } catch (err) {
      toast.error('That didn’t save', errorMessage(err));
    } finally {
      setBusy(null);
    }
  };
  return { busy, run };
}

function Stage() {
  const r = usePatientRecordContext();
  const setStage = useSetStage(r.patient.patientId);
  const { busy, run } = useRun();
  const [open, setOpen] = useState(false);
  const stage = r.profile.ckdStage;
  const canVerify = stage && stage.source === 'patient_entered' && stage.value !== 'not_sure';

  return (
    <Card as="section" aria-labelledby="stage-title">
      <CardHeader
        id="stage-title"
        title="CKD stage"
        action={
          <div className="flex flex-wrap gap-2">
            {canVerify && (
              <Button size="sm" loading={busy === 'stage'} onClick={() => void run('stage', () => setStage.mutateAsync(stage.value as DefiniteStage), 'Stage verified')}>
                Verify {ckdLabel(stage.value)}
              </Button>
            )}
            <Button size="sm" variant="secondary" onClick={() => setOpen(true)}>
              {stage ? 'Change stage' : 'Set stage'}
            </Button>
          </div>
        }
      />
      {stage ? (
        <div className="flex flex-wrap items-center gap-2.5">
          <p className="text-[20px] font-extrabold">{ckdLabel(stage.value)}</p>
          <Source source={stage.source} verified={stage.verified} />
        </div>
      ) : (
        <p className="text-[13.5px] text-muted">The patient hasn’t entered a stage.</p>
      )}
      <StageModal open={open} current={stage?.value ?? null} onClose={() => setOpen(false)} onSave={(s) => setStage.mutateAsync(s)} />
    </Card>
  );
}

function Targets() {
  const r = usePatientRecordContext();
  const targets = useTargets();
  const setTarget = useSetPatientTarget(r.patient.patientId);
  const { busy, run } = useRun();
  const [modal, setModal] = useState<{ editing: Target | null } | null>(null);

  return (
    <Card as="section" aria-labelledby="targets-title" padding="none" className="overflow-hidden">
      <div className="px-5 pt-5">
        <CardHeader
          id="targets-title"
          title="Daily targets"
          subtitle="Meal scores use these. Without one, sodium falls back to general CKD guidance."
          action={
            <Button size="sm" variant="secondary" iconLeft={<Plus className="size-4" aria-hidden />} onClick={() => setModal({ editing: null })}>
              Set a target
            </Button>
          }
        />
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
          <table className="w-full min-w-[720px] text-left text-[13.5px]">
            <caption className="sr-only">The patient’s daily nutrient targets</caption>
            <thead className="bg-[#f8fafc] text-[12px] text-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-semibold">Nutrient</th>
                <th scope="col" className="px-3 py-2.5 text-right font-semibold">Daily max</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Source</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Since</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Note</th>
                <th scope="col" className="px-5 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {targets.data.map((t) => {
                const label = NUTRIENTS[t.nutrient].label;
                return (
                  <tr key={t.nutrient} className="border-t border-line">
                    <th scope="row" className="px-5 py-2.5 font-semibold">{label}</th>
                    <td className="px-3 py-2.5 text-right tabular-nums">
                      {fmt(t.dailyMax)} {t.unit}
                    </td>
                    <td className="px-3 py-2.5">
                      <Source source={t.source} verified={t.verified} />
                    </td>
                    <td className="px-3 py-2.5">{date(t.since)}</td>
                    <td className="px-3 py-2.5 text-muted">{t.note ?? '—'}</td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">
                      {t.source === 'patient_entered' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Verify ${label.toLowerCase()} target`}
                          loading={busy === t.nutrient}
                          onClick={() =>
                            void run(t.nutrient, () => setTarget.mutateAsync({ nutrient: t.nutrient, dailyMax: t.dailyMax, note: t.note }), `${label} target verified`)
                          }
                        >
                          Verify
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" aria-label={`Change ${label.toLowerCase()} target`} onClick={() => setModal({ editing: t })}>
                        Change
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <TargetModal
        open={modal != null}
        editing={modal?.editing ?? null}
        existing={targets.data ?? []}
        onClose={() => setModal(null)}
        onSave={(v) => setTarget.mutateAsync(v)}
      />
    </Card>
  );
}

function Labs() {
  const r = usePatientRecordContext();
  const labs = useLabs();
  const addLab = useAddPatientLab(r.patient.patientId);
  const correctLab = useCorrectPatientLab(r.patient.patientId);
  const verifyLab = useVerifyPatientLab(r.patient.patientId);
  const { busy, run } = useRun();
  const [form, setForm] = useState<{ editing: Lab | null } | null>(null);
  const editing = form?.editing ?? null;

  return (
    <Card as="section" aria-labelledby="labs-title" padding="none" className="overflow-hidden">
      <div className="px-5 pt-5">
        <CardHeader
          id="labs-title"
          title="Lab results"
          subtitle="Newest first, compared with the range printed on each slip."
          action={
            <Button size="sm" variant="secondary" iconLeft={<Plus className="size-4" aria-hidden />} onClick={() => setForm({ editing: null })}>
              Add a result
            </Button>
          }
        />
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
          <table className="w-full min-w-[860px] text-left text-[13.5px]">
            <caption className="sr-only">The patient’s lab results</caption>
            <thead className="bg-[#f8fafc] text-[12px] text-muted">
              <tr>
                <th scope="col" className="px-5 py-2.5 font-semibold">Test</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Result</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Slip range</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Collected</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Laboratory</th>
                <th scope="col" className="px-3 py-2.5 font-semibold">Source</th>
                <th scope="col" className="px-5 py-2.5">
                  <span className="sr-only">Actions</span>
                </th>
              </tr>
            </thead>
            <tbody>
              {labs.data.map((l) => {
                const kind = labStatus(l.value, l.refLow, l.refHigh);
                const what = `${l.label} result from ${date(l.collectedOn)}`;
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
                    <td className="px-3 py-2.5">
                      <Source source={l.source} verified={l.verified} />
                    </td>
                    <td className="px-5 py-2.5 text-right whitespace-nowrap">
                      {l.source === 'patient_entered' && (
                        <Button
                          size="sm"
                          variant="ghost"
                          aria-label={`Verify ${what}`}
                          loading={busy === l.id}
                          onClick={() => void run(l.id, () => verifyLab.mutateAsync(l.id), `${l.label} result verified`)}
                        >
                          Verify
                        </Button>
                      )}
                      <Button size="sm" variant="ghost" aria-label={`Correct ${what}`} onClick={() => setForm({ editing: l })}>
                        Correct
                      </Button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
      <LabFormModal
        open={form != null}
        editing={editing}
        title={editing ? `Correct ${editing.label} result` : `Add a result for ${r.patient.name}`}
        description="Copy the values from the lab slip. The result is marked as verified by you, and the patient is told."
        onClose={() => setForm(null)}
        onSave={(input) => (editing ? correctLab.mutateAsync({ id: editing.id, input }) : addLab.mutateAsync(input))}
      />
    </Card>
  );
}

export function LabsTab() {
  return (
    <div className="flex flex-col gap-5">
      <h2 className="sr-only">Labs and targets</h2>
      <Stage />
      <Targets />
      <Labs />
    </div>
  );
}
