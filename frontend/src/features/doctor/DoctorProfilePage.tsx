import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { Button, Card, ErrorState, Input, LoadingRegion, Notice, PageHeader, Skeleton, useToast } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { prcLicenseRule } from '@/features/auth/schemas';
import { errorMessage, fieldErrors } from '@/lib/api';
import { useDoctorProfile, useUpdateDoctorProfile, type DoctorProfile } from './api';

const schema = z.object({
  firstName: z.string().trim().min(1, 'Enter your first name').max(80),
  lastName: z.string().trim().min(1, 'Enter your last name').max(80),
  prcLicense: prcLicenseRule,
  specialty: z.string().trim().max(80, 'Specialty is too long'),
  clinic: z.string().trim().max(120, 'Clinic or hospital is too long'),
});
type Values = z.infer<typeof schema>;

function ProfileForm({ profile }: { profile: DoctorProfile }) {
  const { refreshUser } = useAuth();
  const toast = useToast();
  const update = useUpdateDoctorProfile();
  const [formError, setFormError] = useState<string | null>(null);
  const {
    register,
    handleSubmit,
    setError,
    formState: { errors, isSubmitting, isDirty },
    reset,
  } = useForm<Values>({
    resolver: zodResolver(schema),
    defaultValues: {
      firstName: profile.firstName,
      lastName: profile.lastName,
      prcLicense: profile.prcLicense ?? '',
      specialty: profile.specialty ?? '',
      clinic: profile.clinic ?? '',
    },
  });

  const onSubmit = handleSubmit(async (v) => {
    setFormError(null);
    try {
      const saved = await update.mutateAsync(v);
      reset({ firstName: saved.firstName, lastName: saved.lastName, prcLicense: saved.prcLicense ?? '', specialty: saved.specialty ?? '', clinic: saved.clinic ?? '' });
      await refreshUser();
      toast.success('Profile saved');
    } catch (err) {
      const fields = Object.entries(fieldErrors(err)).filter(([k]) => k in v);
      fields.forEach(([k, message]) => setError(k as keyof Values, { message }));
      if (!fields.length) setFormError(errorMessage(err));
    }
  });

  return (
    <form onSubmit={onSubmit} noValidate className="flex flex-col gap-4">
      {formError && (
        <div role="alert">
          <Notice tone="bad">{formError}</Notice>
        </div>
      )}
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" autoComplete="given-name" error={errors.firstName?.message} {...register('firstName')} />
        <Input label="Last name" autoComplete="family-name" error={errors.lastName?.message} {...register('lastName')} />
      </div>
      <Input label="PRC licence number" optional inputMode="numeric" error={errors.prcLicense?.message} {...register('prcLicense')} />
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="Specialty" optional placeholder="e.g. Nephrology, Renal nutrition" error={errors.specialty?.message} {...register('specialty')} />
        <Input label="Clinic or hospital" optional error={errors.clinic?.message} {...register('clinic')} />
      </div>
      <div>
        <Button type="submit" variant="accent" loading={isSubmitting} disabled={!isDirty}>
          Save changes
        </Button>
      </div>
    </form>
  );
}

export function DoctorProfilePage() {
  const profile = useDoctorProfile();
  return (
    <div className="flex max-w-2xl flex-col gap-5">
      <PageHeader title="Your profile" description="Patients see your name, specialty, clinic and PRC number when you ask to follow them. These details are self-reported." />
      <Card padding="lg">
        {profile.isPending && (
          <LoadingRegion label="Loading your profile">
            <Skeleton className="h-64 w-full" />
          </LoadingRegion>
        )}
        {profile.isError && <ErrorState title="We couldn’t load your profile" message={errorMessage(profile.error)} onRetry={() => void profile.refetch()} />}
        {profile.data && <ProfileForm key={profile.data.updatedAt} profile={profile.data} />}
      </Card>
    </div>
  );
}
