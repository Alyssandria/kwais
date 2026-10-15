import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Notice } from '@/components/ui';
import { api, errorMessage } from '@/lib/api';
import { resetSchema, type ResetValues } from '@/features/auth/schemas';
import { AuthLayout } from './AuthLayout';

export function ResetPasswordPage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<ResetValues>({ resolver: zodResolver(resetSchema), defaultValues: { password: '', confirmPassword: '' } });

  if (!token) {
    return (
      <AuthLayout title="This link is incomplete">
        <p className="mb-4">The reset link is missing its code. Open the link from the email again, or request a new one.</p>
        <Link to="/forgot-password" className="font-semibold">
          Request a new link
        </Link>
      </AuthLayout>
    );
  }

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      await api.post('/auth/reset-password', { token, password: values.password });
      navigate('/login?reset=1', { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    }
  });

  return (
    <AuthLayout title="Set a new password" subtitle="You’ll be signed out on every device after this.">
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <div role="alert">
            <Notice tone="bad">
              {formError} <Link to="/forgot-password">Request a new link</Link>
            </Notice>
          </div>
        )}
        <Input
          label="New password"
          type="password"
          autoComplete="new-password"
          hint="At least 10 characters, with a letter and a number."
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm new password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />
        <Button type="submit" variant="accent" size="lg" fullWidth loading={isSubmitting}>
          Save new password
        </Button>
      </form>
    </AuthLayout>
  );
}
