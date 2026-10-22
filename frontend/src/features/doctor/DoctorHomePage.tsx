import { Link } from 'react-router-dom';
import { IdCard, Users } from 'lucide-react';
import { Card, CardHeader, EmptyState, ErrorState, LoadingRegion, Notice, PageHeader, Skeleton } from '@/components/ui';
import { useAuth } from '@/features/auth/AuthProvider';
import { errorMessage } from '@/lib/api';
import { displayName, useDoctorProfile } from './api';

export function DoctorHomePage() {
  const { user } = useAuth();
  const profile = useDoctorProfile();

  return (
    <div className="flex max-w-4xl flex-col gap-5">
      <PageHeader title={`Good day, Dr. ${user?.lastName ?? ''}`} description="Patients who share their K-WAIS records with you appear here." />

      {profile.isPending && (
        <LoadingRegion label="Loading your profile">
          <Skeleton className="h-28 w-full" />
        </LoadingRegion>
      )}
      {profile.isError && (
        <Card padding="none">
          <ErrorState title="We couldn’t load your profile" message={errorMessage(profile.error)} onRetry={() => void profile.refetch()} />
        </Card>
      )}
      {profile.data && (
        <Card as="section" aria-labelledby="seen-title">
          <CardHeader
            id="seen-title"
            title="What patients see about you"
            action={
              <Link to="/doctor/profile" className="inline-flex items-center gap-1.5 text-[13px] font-semibold">
                <IdCard className="size-4" aria-hidden />
                Edit profile
              </Link>
            }
          />
          <p className="text-lg font-extrabold">{displayName(profile.data)}</p>
          <p className="text-[13.5px] text-muted">
            {[profile.data.specialty, profile.data.clinic].filter(Boolean).join(' · ') || 'No specialty or clinic yet'}
            {profile.data.prcLicense ? ` · PRC ${profile.data.prcLicense}` : ''}
          </p>
          {(!profile.data.prcLicense || !profile.data.clinic) && (
            <Notice className="mt-3">Patients decide whether to share their records with you. A PRC number and clinic help them recognise you.</Notice>
          )}
        </Card>
      )}

      <Card as="section" aria-labelledby="patients-title" padding="none">
        <div className="px-5 pt-5">
          <CardHeader id="patients-title" title="Your patients" />
        </div>
        <EmptyState
          icon={Users}
          title="No patients yet"
          description="A patient appears here once they approve your request to follow their records, or invite you themselves."
        />
      </Card>
    </div>
  );
}
