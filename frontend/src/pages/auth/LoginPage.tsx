import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Input, Notice } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { homeFor, useAuth } from '@/features/auth/AuthProvider';
import { safeNext } from '@/features/auth/guards';
import { loginSchema, type LoginValues } from '@/features/auth/schemas';
import { AuthLayout } from './AuthLayout';

export function LoginPage() {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const next = params.get('next');
  const invited = safeNext(next, '').startsWith('/doctor/invite');
  const registerLink = invited ? `/register?role=doctor&next=${encodeURIComponent(next!)}` : '/register';
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    formState: { errors, isSubmitting },
  } = useForm<LoginValues>({ resolver: zodResolver(loginSchema), defaultValues: { email: '', password: '' } });

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await login(values);
      navigate(safeNext(params.get('next'), homeFor(user)), { replace: true });
    } catch (err) {
      setFormError(errorMessage(err));
    }
  });

  return (
    <AuthLayout
      title="Welcome back"
      subtitle={
        <>
          New to K-WAIS? <Link to={registerLink}>{invited ? 'Create a doctor account' : 'Create a free account'}</Link>
        </>
      }
    >
      {params.get('reset') === '1' && (
        <Notice className="mb-4">Your password was changed. Sign in with your new password.</Notice>
      )}
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <div role="alert">
            <Notice tone="bad">{formError}</Notice>
          </div>
        )}
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Password"
          type="password"
          autoComplete="current-password"
          error={errors.password?.message}
          {...register('password')}
        />
        <div className="-mt-1 text-right">
          <Link to="/forgot-password" className="text-[13px] font-semibold">
            Forgot your password?
          </Link>
        </div>
        <Button type="submit" variant="accent" size="lg" fullWidth loading={isSubmitting}>
          Sign in
        </Button>
      </form>
    </AuthLayout>
  );
}
