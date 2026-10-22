import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Mail, UserRound } from 'lucide-react';
import { Button, ConfirmDialog, ErrorState, Input, Notice, Skeleton, Textarea, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { doctorDetails, shortDate, useCancelInvite, useCareAction, useInviteDoctor, usePatientCare, type CareAction, type DoctorCard } from './api';

const initials = (name: string) =>
  name
    .replace(/^Dr\.\s*/, '')
    .split(/\s+/)
    .map((w) => w[0] ?? '')
    .join('')
    .slice(0, 2)
    .toUpperCase();

function DoctorLine({ doctor }: { doctor: DoctorCard }) {
  return (
    <div className="flex items-center gap-3">
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-primary-soft font-extrabold text-primary-dark">
        {initials(doctor.name)}
      </span>
      <div className="min-w-0">
        <p className="font-bold">{doctor.name}</p>
        <p className="text-[13px] text-muted">{doctorDetails(doctor) || 'No specialty or clinic given'}</p>
      </div>
    </div>
  );
}

const inviteSchema = z.object({
  email: z.string().trim().min(1, 'Enter your doctor’s email').email('Enter a valid email address'),
  message: z.string().trim().max(300, 'Keep the message under 300 characters'),
});
type InviteValues = z.infer<typeof inviteSchema>;

function InviteForm() {
  const toast = useToast();
  const invite = useInviteDoctor();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<InviteValues>({ resolver: zodResolver(inviteSchema), defaultValues: { email: '', message: '' } });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      const out = await invite.mutateAsync({ email: v.email, ...(v.message ? { message: v.message } : {}) });
      reset();
      toast.success(out.message);
    } catch (err) {
      setFormError(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-3 border-t border-line pt-4" aria-labelledby="invite-title">
      <h3 id="invite-title" className="font-bold">
        Invite your doctor
      </h3>
      {formError && (
        <div role="alert">
          <Notice tone="bad">{formError}</Notice>
        </div>
      )}
      <Input label="Your doctor’s email" type="email" autoComplete="off" error={errors.email?.message} {...register('email')} />
      <Textarea label="Message" optional rows={2} error={errors.message?.message} {...register('message')} />
      <p className="text-[12.5px] text-muted">If they don’t use K-WAIS yet, they get an email to sign up. Sharing starts once they accept.</p>
      <div>
        <Button type="submit" variant="accent" loading={isSubmitting} iconLeft={<Mail className="size-4" aria-hidden />}>
          Send invite
        </Button>
      </div>
    </form>
  );
}

export function CareTeam() {
  const care = usePatientCare();
  const act = useCareAction('patient');
  const cancelInvite = useCancelInvite();
  const toast = useToast();
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

  const cancel = async (id: string, kind: 'link' | 'invite') => {
    setError(null);
    try {
      if (kind === 'invite') await cancelInvite.mutateAsync(id);
      else await act.mutateAsync({ id, action: 'cancel' });
      toast.info('Invitation cancelled');
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  if (care.isPending) return <Skeleton className="h-40 w-full" />;
  if (care.isError) return <ErrorState title="We couldn’t load your care team" message={errorMessage(care.error)} onRetry={() => void care.refetch()} />;
  const { requests, team, waiting } = care.data;

  return (
    <div className="flex flex-col gap-4">
      {error && (
        <div role="alert">
          <Notice tone="bad">{error}</Notice>
        </div>
      )}

      {requests.map((r) => (
        <section key={r.id} aria-label={`Request from ${r.doctor.name}`} className="flex flex-col gap-3 rounded-card border-2 border-accent bg-[#fff7ed] p-4">
          <p className="text-[12px] font-extrabold tracking-wide text-[#9a3412] uppercase">New request · {shortDate(r.createdAt)}</p>
          <DoctorLine doctor={r.doctor} />
          {r.message && <p className="rounded-field bg-surface px-3 py-2 text-[13.5px]">“{r.message}”</p>}
          <p className="text-[12.5px] text-muted">These details were entered by the doctor. K-WAIS has not checked them. Only approve someone you know.</p>
          <details className="text-[13.5px]">
            <summary className="cursor-pointer font-bold text-primary-dark">What {r.doctor.name} will see and do</summary>
            <ul className="mt-2 list-disc space-y-1 pl-5">
              <li>Your meals, scores, trends, labs and targets</li>
              <li>Verify or set your CKD stage, targets and labs, and add lab results</li>
              <li>Leave notes you can read</li>
              <li>Every view is listed in your account activity</li>
            </ul>
          </details>
          <div className="flex flex-wrap gap-2.5">
            <Button variant="secondary" onClick={() => void run(r.id, 'decline', 'Request declined')} disabled={act.isPending}>
              Decline
            </Button>
            <Button variant="primary" onClick={() => void run(r.id, 'approve', `${r.doctor.name} can now see your records`)} loading={act.isPending}>
              Approve
            </Button>
          </div>
        </section>
      ))}

      <div>
        <h3 className="mb-2 font-bold">Sharing with</h3>
        {team.length === 0 ? (
          <p className="flex items-center gap-2 rounded-card border border-dashed border-line px-4 py-3 text-[13.5px] text-muted">
            <UserRound className="size-4" aria-hidden />
            You’re not sharing your records with anyone.
          </p>
        ) : (
          <ul className="flex flex-col gap-2">
            {team.map((t) => (
              <li key={t.id} className="flex flex-wrap items-center gap-3 rounded-card border border-line px-4 py-3">
                <div className="flex-1">
                  <DoctorLine doctor={t.doctor} />
                  <p className="mt-1 text-[12.5px] text-muted">Since {shortDate(t.since)}</p>
                </div>
                <Button variant="secondary" size="sm" className="border-[#fca5a5] text-bad" onClick={() => setConfirm({ id: t.id, name: t.doctor.name })}>
                  Stop sharing
                </Button>
              </li>
            ))}
          </ul>
        )}
      </div>

      {waiting.length > 0 && (
        <div>
          <h3 className="mb-2 font-bold">Waiting for a reply</h3>
          <ul className="flex flex-col gap-2">
            {waiting.map((w) => (
              <li key={w.id} className="flex flex-wrap items-center gap-3 rounded-card bg-canvas px-4 py-3">
                <div className="flex-1">
                  <p className="font-semibold">{w.label}</p>
                  <p className="text-[12.5px] text-muted">
                    Invited {shortDate(w.createdAt)}
                    {w.expiresAt ? ` · link works until ${shortDate(w.expiresAt)}` : ''}
                  </p>
                </div>
                <Button variant="secondary" size="sm" onClick={() => void cancel(w.id, w.kind)}>
                  Cancel invitation
                </Button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <InviteForm />

      <ConfirmDialog
        open={confirm != null}
        title={`Stop sharing with ${confirm?.name ?? ''}?`}
        description="They will no longer see your meals, labs or targets. Notes they already wrote stay in your account."
        confirmLabel="Stop sharing"
        destructive
        loading={act.isPending}
        onConfirm={() => confirm && void run(confirm.id, 'end', `Stopped sharing with ${confirm.name}`)}
        onCancel={() => setConfirm(null)}
      />
    </div>
  );
}
