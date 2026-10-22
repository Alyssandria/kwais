import { useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { Button, Checkbox, Input, Notice, RadioCards } from '@/components/ui';
import { errorMessage, fieldErrors } from '@/lib/api';
import { homeFor, useAuth } from '@/features/auth/AuthProvider';
import { safeNext } from '@/features/auth/guards';
import { registerSchema, type RegisterValues } from '@/features/auth/schemas';
import { AuthLayout } from './AuthLayout';

export function RegisterPage() {
  const { register: signUp } = useAuth();
  const navigate = useNavigate();
  const [params] = useSearchParams();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    setValue,
    watch,
    formState: { errors, isSubmitting },
  } = useForm<RegisterValues>({
    resolver: zodResolver(registerSchema),
    defaultValues: {
      role: params.get('role') === 'doctor' ? 'doctor' : 'patient',
      prcLicense: '',
      specialty: '',
      clinic: '',
      firstName: '',
      lastName: '',
      email: '',
      password: '',
      confirmPassword: '',
      acceptTerms: false,
      acceptHealthData: false,
    },
  });

  const role = watch('role');

  const onSubmit = handleSubmit(async (values) => {
    setFormError(null);
    try {
      const user = await signUp(values);
      navigate(user.role === 'patient' ? '/patient/onboarding' : safeNext(params.get('next'), homeFor(user)), { replace: true });
    } catch (err) {
      const fields = fieldErrors(err);
      const known = Object.entries(fields).filter(([k]) => k in values);
      known.forEach(([k, message]) => setError(k as keyof RegisterValues, { message }));
      if (!known.length) setFormError(errorMessage(err));
    }
  });

  return (
    <AuthLayout
      title="Create your account"
      subtitle={
        <>
          Already have one? <Link to="/login">Sign in</Link>
        </>
      }
    >
      <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
        {formError && (
          <div role="alert">
            <Notice tone="bad">{formError}</Notice>
          </div>
        )}
        <RadioCards
          legend="I’m signing up as"
          name="role"
          value={role}
          onChange={(v) => setValue('role', v)}
          options={[
            { value: 'patient', label: 'A patient', description: 'Log meals and track your kidney health' },
            { value: 'doctor', label: 'A doctor or dietitian', description: 'Follow patients who share their records with you' },
          ]}
        />
        <div className="grid gap-4 sm:grid-cols-2">
          <Input label="First name" autoComplete="given-name" error={errors.firstName?.message} {...register('firstName')} />
          <Input label="Last name" autoComplete="family-name" error={errors.lastName?.message} {...register('lastName')} />
        </div>
        <Input label="Email" type="email" autoComplete="email" error={errors.email?.message} {...register('email')} />
        <Input
          label="Password"
          type="password"
          autoComplete="new-password"
          hint="At least 10 characters, with a letter and a number."
          error={errors.password?.message}
          {...register('password')}
        />
        <Input
          label="Confirm password"
          type="password"
          autoComplete="new-password"
          error={errors.confirmPassword?.message}
          {...register('confirmPassword')}
        />

        {role === 'doctor' && (
          <fieldset className="flex flex-col gap-4">
            <legend className="mb-1 text-[13px] font-semibold">Your practice</legend>
            <p className="-mt-2 text-[12.5px] text-muted">Patients see these details when you ask to follow them. They are shown as entered by you.</p>
            <Input label="PRC licence number" optional inputMode="numeric" error={errors.prcLicense?.message} {...register('prcLicense')} />
            <div className="grid gap-4 sm:grid-cols-2">
              <Input label="Specialty" optional placeholder="e.g. Nephrology, Renal nutrition" error={errors.specialty?.message} {...register('specialty')} />
              <Input label="Clinic or hospital" optional error={errors.clinic?.message} {...register('clinic')} />
            </div>
          </fieldset>
        )}

        <fieldset className="mt-1 flex flex-col gap-3 rounded-card border border-line bg-canvas p-4">
          <legend className="px-1 text-[13px] font-bold">Your consent</legend>
          <Checkbox
            label={
              <>
                I agree to the <Link to="/terms" target="_blank">terms of use</Link> and have read the{' '}
                <Link to="/privacy" target="_blank">privacy notice</Link>
              </>
            }
            {...register('acceptTerms')}
          />
          {errors.acceptTerms && <p className="text-[12.5px] font-semibold text-bad">{errors.acceptTerms.message}</p>}
          {role === 'patient' ? (
            <>
              <Checkbox
                label="I agree that K-WAIS may store and process my health information"
                description="Meals, lab results and health details are sensitive personal information. You can withdraw consent and request deletion at any time."
                {...register('acceptHealthData')}
              />
              {errors.acceptHealthData && <p className="text-[12.5px] font-semibold text-bad">{errors.acceptHealthData.message}</p>}
            </>
          ) : (
            <p className="text-[12.5px] text-muted">
              You will only see a patient’s records after they approve, and they can stop sharing at any time. Every view is recorded in their account activity.
            </p>
          )}
        </fieldset>

        <Button type="submit" variant="accent" size="lg" fullWidth loading={isSubmitting}>
          Create account
        </Button>
      </form>
    </AuthLayout>
  );
}
