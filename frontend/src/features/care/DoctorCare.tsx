import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, CardHeader, ConfirmDialog, ErrorState, Input, LoadingRegion, Modal, Notice, Skeleton, Textarea, useToast } from '@/components/ui';
import { PatientList } from '@/features/doctor/PatientList';
import { errorMessage, fieldErrors } from '@/lib/api';
import { shortDate, useCareAction, useDoctorCare, useRequestPatient, type CareAction } from './api';
import { patientMeta } from './format';

const initials = (name: string) =>
  name
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

export { patientMeta } from './format';

const requestSchema = z.object({
  patientCode: z
    .string()
    .trim()
    .toUpperCase()
    .regex(/^KW-\d{6}$/, 'Patient codes look like KW-000123'),
  message: z.string().trim().max(300, 'Keep the message under 300 characters'),
});
type RequestValues = z.infer<typeof requestSchema>;

export function AddPatientDialog({ open, onClose }: { open: boolean; onClose: () => void }) {
  const toast = useToast();
  const send = useRequestPatient();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<RequestValues>({ resolver: zodResolver(requestSchema), defaultValues: { patientCode: '', message: '' } });

  const close = () => {
    reset();
    setFormError(null);
    onClose();
  };

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      const out = await send.mutateAsync({ patientCode: v.patientCode, ...(v.message ? { message: v.message } : {}) });
      toast.success(out.message);
      close();
    } catch (err) {
      const fields = Object.entries(fieldErrors(err)).filter(([k]) => k in v);
      fields.forEach(([k, message]) => setError(k as keyof RequestValues, { message }));
      if (!fields.length) setFormError(errorMessage(err));
    }
  });

  return (
    <Modal
      open={open}
      onClose={close}
      title="Add a patient"
      description="Nothing is shared until the patient approves."
      footer={
        <>
          <Button variant="secondary" onClick={close}>
            Cancel
          </Button>
          <Button type="submit" form="add-patient-form" loading={isSubmitting}>
            Send request
          </Button>
        </>
      }
    >
      <form id="add-patient-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <div role="alert">
            <Notice tone="bad">{formError}</Notice>
          </div>
        )}
        <Input
          label="Patient code"
          autoComplete="off"
          autoCapitalize="characters"
          spellCheck={false}
          placeholder="KW-000123"
          hint="Patients find it in their profile, under their name."
          className="font-mono font-bold tracking-wider"
          error={errors.patientCode?.message}
          {...register('patientCode')}
        />
        <Textarea label="Message" optional rows={3} placeholder="e.g. This is Dr. Reyes from your check-up last week." error={errors.message?.message} {...register('message')} />
        <div className="rounded-card bg-canvas px-4 py-3 text-[13.5px]">
          <p className="mb-1 font-bold">If they approve, you can</p>
          <ul className="list-disc space-y-0.5 pl-5">
            <li>See their meals, analyses, trends, labs and targets</li>
            <li>Verify or set their CKD stage, targets and labs</li>
            <li>Add lab results and leave notes they can read</li>
          </ul>
        </div>
      </form>
    </Modal>
  );
}

export function DoctorCarePanels() {
  const care = useDoctorCare();
  const act = useCareAction('doctor');
  const toast = useToast();
  const [adding, setAdding] = useState(false);
  const [confirm, setConfirm] = useState<{ id: string; name: string } | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (id: string, action: CareAction, done: string) => {
    setError(null);
    try {
      await act.mutateAsync({ id, action });
      toast.success(done);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setConfirm(null);
    }
  };

  if (care.isPending) {
    return (
      <LoadingRegion label="Loading your patients">
        <Skeleton className="h-48 w-full" />
      </LoadingRegion>
    );
  }
  if (care.isError) {
    return (
      <Card padding="none">
        <ErrorState title="We couldn’t load your patients" message={errorMessage(care.error)} onRetry={() => void care.refetch()} />
      </Card>
    );
  }
  const { requests, waiting } = care.data;

  return (
    <>
      {error && (
        <div role="alert">
          <Notice tone="bad">{error}</Notice>
        </div>
      )}

      {(requests.length > 0 || waiting.length > 0) && (
        <Card as="section" aria-labelledby="req-title">
          <CardHeader id="req-title" title={`Requests · ${requests.length + waiting.length}`} />
          <ul className="flex flex-col gap-2.5">
            {requests.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center gap-3 rounded-field bg-primary-soft px-4 py-3">
                <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full bg-surface font-bold text-primary-dark">
                  {initials(r.patient.name)}
                </span>
                <div className="min-w-[220px] flex-1">
                  <p className="font-bold">{r.patient.name} invited you to follow their records</p>
                  <p className="text-[13px] text-muted">
                    {patientMeta(r.patient)} · {shortDate(r.createdAt)}
                  </p>
                  {r.message && <p className="mt-1 text-[13.5px]">“{r.message}”</p>}
                </div>
                <Button variant="secondary" size="sm" onClick={() => void run(r.id, 'decline', 'Invitation declined')} disabled={act.isPending}>
                  Decline
                </Button>
                <Button size="sm" onClick={() => void run(r.id, 'approve', `You can now see ${r.patient.name}’s records`)} disabled={act.isPending}>
                  Accept
                </Button>
              </li>
            ))}
            {waiting.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-3 rounded-field bg-canvas px-4 py-3">
                <span aria-hidden className="flex size-9 shrink-0 items-center justify-center rounded-full border border-dashed border-[#94a3b8] bg-surface font-bold text-muted">
                  ?
                </span>
                <div className="min-w-[220px] flex-1">
                  <p className="font-bold">Waiting for {w.patientCode} to approve</p>
                  <p className="text-[13px] text-muted">Sent {shortDate(w.createdAt)}. Their name appears once they approve.</p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => void run(w.id, 'cancel', 'Request cancelled')} disabled={act.isPending}>
                  Cancel request
                </Button>
              </li>
            ))}
          </ul>
        </Card>
      )}

      <PatientList onAdd={() => setAdding(true)} onStop={(id, name) => setConfirm({ id, name })} />

      <AddPatientDialog open={adding} onClose={() => setAdding(false)} />
      <ConfirmDialog
        open={confirm != null}
        title={`Stop following ${confirm?.name ?? ''}?`}
        description="You will no longer see their records. They are told, and can invite you again later."
        confirmLabel="Stop following"
        destructive
        loading={act.isPending}
        onConfirm={() => confirm && void run(confirm.id, 'end', `Stopped following ${confirm.name}`)}
        onCancel={() => setConfirm(null)}
      />
    </>
  );
}
