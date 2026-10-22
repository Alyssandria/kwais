import { useState, type ReactNode } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AxiosError } from 'axios';
import { z } from 'zod';
import { Download, History, KeyRound, LogOut, ShieldAlert, Trash2 } from 'lucide-react';
import { Badge, Button, Card, ConfirmDialog, EmptyState, ErrorState, Input, LoadingRegion, Modal, Notice, PageHeader, Skeleton, useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { passwordRule } from '@/features/auth/schemas';
import { useConsents, type Consents } from '@/features/profile/api';
import { errorMessage, type ApiErrorBody } from '@/lib/api';
import { cn } from '@/lib/cn';
import { describeActivity, isWarning } from './activity';
import { useActivity, useChangePassword, useDeleteAccount, useDownloadMyData, useLogoutEverywhere } from './api';

const errorCode = (err: unknown) => (err instanceof AxiosError ? (err.response?.data as ApiErrorBody | undefined)?.error?.code : undefined);

function Section({ id, title, description, tone, children }: { id: string; title: string; description?: ReactNode; tone?: 'danger'; children: ReactNode }) {
  return (
    <Card as="section" padding="lg" aria-labelledby={id} className={cn(tone === 'danger' && 'border-[#fca5a5]')}>
      <h2 id={id} className={cn('text-lg font-extrabold', tone === 'danger' && 'text-bad')}>
        {title}
      </h2>
      {description && <p className="mt-1 mb-4 text-[13.5px] text-muted">{description}</p>}
      {!description && <div className="mb-4" />}
      {children}
    </Card>
  );
}

const when = (iso: string) =>
  new Date(iso).toLocaleString('en-PH', { day: 'numeric', month: 'short', year: 'numeric', hour: 'numeric', minute: '2-digit' });

const passwordSchema = z
  .object({ currentPassword: z.string().min(1, 'Enter your current password'), newPassword: passwordRule, confirmPassword: z.string() })
  .refine((v) => v.newPassword === v.confirmPassword, { path: ['confirmPassword'], message: 'Passwords do not match' })
  .refine((v) => v.newPassword !== v.currentPassword, { path: ['newPassword'], message: 'Choose a password that is different from your current one' });
type PasswordValues = z.infer<typeof passwordSchema>;

function ChangePasswordForm() {
  const { acceptSession } = useAuth();
  const toast = useToast();
  const change = useChangePassword();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<PasswordValues>({ resolver: zodResolver(passwordSchema), defaultValues: { currentPassword: '', newPassword: '', confirmPassword: '' } });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      acceptSession(await change.mutateAsync({ currentPassword: v.currentPassword, newPassword: v.newPassword }));
      reset();
      toast.success('Password changed. Other devices were signed out.');
    } catch (err) {
      if (errorCode(err) === 'invalid_password') setError('currentPassword', { message: 'That password is not correct' });
      else setFormError(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex max-w-md flex-col gap-4" aria-labelledby="password-title">
      <h3 id="password-title" className="flex items-center gap-2 font-bold">
        <KeyRound className="size-4 text-primary-dark" aria-hidden />
        Change password
      </h3>
      {formError && (
        <div role="alert">
          <Notice tone="bad">{formError}</Notice>
        </div>
      )}
      <Input label="Current password" type="password" autoComplete="current-password" error={errors.currentPassword?.message} {...register('currentPassword')} />
      <Input
        label="New password"
        type="password"
        autoComplete="new-password"
        hint="At least 10 characters, with a letter and a number."
        error={errors.newPassword?.message}
        {...register('newPassword')}
      />
      <Input label="Confirm new password" type="password" autoComplete="new-password" error={errors.confirmPassword?.message} {...register('confirmPassword')} />
      <div>
        <Button type="submit" variant="primary" loading={isSubmitting}>
          Change password
        </Button>
      </div>
    </form>
  );
}

function SignOutEverywhere() {
  const { endSession } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const logoutAll = useLogoutEverywhere();
  const [confirm, setConfirm] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    try {
      await logoutAll.mutateAsync();
      endSession();
      toast.info('Signed out on every device');
      navigate('/login', { replace: true });
    } catch (err) {
      setConfirm(false);
      setError(errorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div role="alert">
          <Notice tone="bad">{error}</Notice>
        </div>
      )}
      <p className="text-[13.5px]">Lost a phone, or signed in on a shared computer? This ends every session, including this one.</p>
      <div>
        <Button variant="secondary" onClick={() => setConfirm(true)} iconLeft={<LogOut className="size-4" aria-hidden />}>
          Sign out on every device
        </Button>
      </div>
      <ConfirmDialog
        open={confirm}
        title="Sign out on every device?"
        description="You will need your password to sign in again. Pages already open elsewhere may keep working for up to 15 minutes."
        confirmLabel="Sign out everywhere"
        loading={logoutAll.isPending}
        onConfirm={run}
        onCancel={() => setConfirm(false)}
      />
    </div>
  );
}

const CONSENT_ROWS: { key: keyof Consents; label: string; required?: boolean }[] = [
  { key: 'terms', label: 'Terms of use', required: true },
  { key: 'health_data', label: 'Storing your health information', required: true },
  { key: 'ai_processing', label: 'AI meal analysis' },
  { key: 'reminders', label: 'Logging reminders' },
];

function PrivacyChoices() {
  const consents = useConsents();
  if (consents.isPending) return <Skeleton className="h-32 w-full" />;
  if (consents.isError) return <ErrorState title="We couldn’t load your choices" message={errorMessage(consents.error)} onRetry={() => void consents.refetch()} />;
  return (
    <div className="flex flex-col gap-3">
      <ul className="divide-y divide-line rounded-card border border-line">
        {CONSENT_ROWS.map(({ key, label, required }) => {
          const c = consents.data[key];
          return (
            <li key={key} className="flex flex-wrap items-center justify-between gap-2 px-4 py-3 text-[14px]">
              <div>
                <p className="font-semibold">{label}</p>
                <p className="text-[12.5px] text-muted">
                  {c ? `${c.granted ? 'Allowed' : 'Not allowed'} on ${when(c.at)} · policy ${c.policyVersion}` : 'Never asked'}
                  {required && ' · needed to use K-WAIS'}
                </p>
              </div>
              <Badge tone={c?.granted ? 'good' : undefined}>{c?.granted ? 'On' : 'Off'}</Badge>
            </li>
          );
        })}
      </ul>
      <p className="text-[13px] text-muted">
        Turn AI analysis and reminders on or off in your <Link to="/patient/profile">profile</Link>. To withdraw the two required consents, delete your account below.
      </p>
    </div>
  );
}

function YourData({ isPatient }: { isPatient: boolean }) {
  const toast = useToast();
  const download = useDownloadMyData();
  const [error, setError] = useState<string | null>(null);

  const run = async () => {
    setError(null);
    try {
      const name = await download.mutateAsync();
      toast.success(`Downloaded ${name}`);
    } catch (err) {
      setError(errorMessage(err));
    }
  };

  return (
    <div className="flex flex-col gap-3">
      {error && (
        <div role="alert">
          <Notice tone="bad">{error}</Notice>
        </div>
      )}
      <p className="text-[13.5px]">
        {isPatient
          ? 'One JSON file with your profile, targets (including old ones), lab results, meals with every analysis, what was sent to the AI, consents, notifications and account activity.'
          : 'One JSON file with your account, your doctor profile, consents, notifications and account activity.'}
      </p>
      <div>
        <Button variant="primary" onClick={run} loading={download.isPending} iconLeft={<Download className="size-4" aria-hidden />}>
          Download my data
        </Button>
      </div>
      {isPatient && <p className="text-[12.5px] text-muted">Meals you delete are kept for 30 days in case of mistakes, then removed for good.</p>}
    </div>
  );
}

function Activity() {
  const activity = useActivity(30);
  if (activity.isPending) {
    return (
      <LoadingRegion label="Loading account activity">
        <Skeleton className="h-40 w-full" />
      </LoadingRegion>
    );
  }
  if (activity.isError) return <ErrorState title="We couldn’t load your activity" message={errorMessage(activity.error)} onRetry={() => void activity.refetch()} />;
  if (activity.data.length === 0) return <EmptyState icon={History} title="No activity yet" description="Sign-ins and changes to your records will show here." />;
  return (
    <ol className="divide-y divide-line rounded-card border border-line">
      {activity.data.map((e) => (
        <li key={e.id} className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-0.5 px-4 py-2.5 text-[14px]">
          <span className={cn('flex items-center gap-2', isWarning(e) && 'font-semibold text-bad')}>
            {isWarning(e) && <ShieldAlert className="size-4 shrink-0" aria-hidden />}
            {describeActivity(e)}
          </span>
          <span className="text-[12.5px] text-muted">
            <time dateTime={e.at}>{when(e.at)}</time>
            {e.device && ` · ${e.device}`}
          </span>
        </li>
      ))}
    </ol>
  );
}

const deleteSchema = z.object({
  password: z.string().min(1, 'Enter your password'),
  confirm: z.string().refine((v): boolean => v === 'DELETE', 'Type DELETE in capital letters'),
});
type DeleteValues = z.infer<typeof deleteSchema>;

function DeleteAccount({ isPatient }: { isPatient: boolean }) {
  const { endSession } = useAuth();
  const navigate = useNavigate();
  const toast = useToast();
  const remove = useDeleteAccount();
  const [open, setOpen] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<DeleteValues>({ resolver: zodResolver(deleteSchema), defaultValues: { password: '', confirm: '' } });

  const close = () => {
    setOpen(false);
    setFormError(null);
    reset();
  };

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      await remove.mutateAsync({ password: v.password, confirm: 'DELETE' });
      endSession();
      toast.info('Your account and records were deleted');
      navigate('/', { replace: true });
    } catch (err) {
      if (errorCode(err) === 'invalid_password') setError('password', { message: 'That password is not correct' });
      else setFormError(errorMessage(err));
    }
  });

  return (
    <div className="flex flex-col gap-3">
      <p className="text-[13.5px]">
        {isPatient
          ? 'This permanently deletes your profile, meals, analyses, lab results, targets and notifications. It cannot be undone.'
          : 'This permanently deletes your account and doctor profile. It cannot be undone.'}{' '}
        A minimal security log (what happened and when, without your health data) is kept for up to a year.
      </p>
      <div>
        <Button variant="danger" onClick={() => setOpen(true)} iconLeft={<Trash2 className="size-4" aria-hidden />}>
          Delete my account
        </Button>
      </div>
      <Modal
        open={open}
        onClose={close}
        title="Delete your account?"
        description="Download your data first if you want a copy. This cannot be undone."
        footer={
          <>
            <Button variant="secondary" onClick={close}>
              Cancel
            </Button>
            <Button variant="danger" type="submit" form="delete-account-form" loading={isSubmitting}>
              Delete everything
            </Button>
          </>
        }
      >
        <form id="delete-account-form" onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
          {formError && (
            <div role="alert">
              <Notice tone="bad">{formError}</Notice>
            </div>
          )}
          <Input label="Your password" type="password" autoComplete="current-password" error={errors.password?.message} {...register('password')} />
          <Input label="Type DELETE to confirm" autoComplete="off" autoCapitalize="characters" spellCheck={false} error={errors.confirm?.message} {...register('confirm')} />
        </form>
      </Modal>
    </div>
  );
}

export function SettingsPage() {
  const { user } = useAuth();
  const isPatient = user?.role === 'patient';
  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader title="Settings" description="Your sign-in, privacy choices and the data K-WAIS keeps about you." />

      <Section id="account" title="Account">
        <dl className="mb-6 grid gap-x-4 gap-y-1.5 text-[14px] sm:grid-cols-[140px_1fr]">
          <dt className="font-semibold text-muted">Email</dt>
          <dd>{user?.email}</dd>
          {user?.patientCode && (
            <>
              <dt className="font-semibold text-muted">Patient code</dt>
              <dd className="font-mono font-bold tracking-wider">{user.patientCode}</dd>
            </>
          )}
        </dl>
        <ChangePasswordForm />
      </Section>

      <Section id="sessions" title="Signed-in devices">
        <SignOutEverywhere />
      </Section>

      {isPatient && (
        <Section id="privacy" title="Privacy choices" description="What you agreed to, and when.">
          <PrivacyChoices />
        </Section>
      )}

      <Section id="data" title="Your data" description="You can take a copy of everything at any time.">
        <YourData isPatient={isPatient} />
      </Section>

      <Section id="activity" title="Account activity" description="Sign-ins and changes to your records, newest first. If something looks wrong, change your password.">
        <Activity />
      </Section>

      <Section id="delete" title="Delete account" tone="danger">
        <DeleteAccount isPatient={isPatient} />
      </Section>
    </div>
  );
}
