import { useState } from 'react';
import { Link } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { MailCheck } from 'lucide-react';
import { Button, Input, Notice } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { forgotSchema, type ForgotValues } from '@/features/auth/schemas';
import { AuthLayout } from './AuthLayout';

export function ForgotPasswordPage() {
  const [sentTo, setSentTo] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ForgotValues>({ resolver: zodResolver(forgotSchema), defaultValues: { email: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.post('/auth/forgot-password', values);
      setSentTo(values.email);
    } catch (err) {
      setFormError(errorMessage(err));
    }
  });

  if (sentTo) {
    return (
      <AuthLayout title="Check your email">
        <div role="status" className="flex flex-col items-start gap-4">
          <span className="flex size-12 items-center justify-center rounded-card bg-primary-soft text-primary-dark">
            <MailCheck className="size-6" aria-hidden />
          </span>
          <p>
            If an account exists for <strong>{sentTo}</strong>, we sent a link to reset the password. The link expires
            in 30 minutes.
          </p>
          <p className="text-[13px] text-muted">Didn’t get it? Check your spam folder, or try again in a few minutes.</p>
          <Link to="/login" className="font-semibold">
            Back to sign in
          </Link>
        </div>
      </AuthLayout>
    );
  }

  return (
    <AuthLayout title="Forgot your password?" subtitle="Enter your email and we’ll send you a link to set a new one.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <div role="alert">
            <Notice tone="bad">{formError}</Notice>
          </div>
        )}
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Button type="submit" variant="accent" size="lg" fullWidth loading={isSubmitting}>
          Send reset link
        </Button>
        <Link to="/login" className="text-center text-[13px] font-semibold">
          Back to sign in
        </Link>
      </form>
    </AuthLayout>
  );
}
