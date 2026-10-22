import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { AxiosError } from 'axios';
import { MailCheck } from 'lucide-react';
import { Button, Card, ErrorState, LoadingRegion, Notice, PageHeader, Skeleton, useToast } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { shortDate, useClaimInvite, useInvitePreview } from './api';

export function InvitePage() {
  const [params] = useSearchParams();
  const token = params.get('token');
  const navigate = useNavigate();
  const toast = useToast();
  const preview = useInvitePreview(token);
  const claim = useClaimInvite();

  const accept = async () => {
    if (!token) return;
    try {
      const out = await claim.mutateAsync(token);
      toast.success(`You can now see ${out.patient.name}’s records`);
      navigate('/doctor/dashboard', { replace: true });
    } catch {
      return;
    }
  };

  const unavailable = !token || (preview.error instanceof AxiosError && preview.error.response?.status === 404);

  return (
    <div className="flex max-w-xl flex-col gap-5">
      <PageHeader title="Invitation to follow a patient" />
      <Card padding="lg">
        {unavailable ? (
          <ErrorState
            title="This invitation can’t be used"
            message="It may have expired, been cancelled by the patient, or already been accepted. Ask them to send a new one."
          />
        ) : preview.isPending ? (
          <LoadingRegion label="Loading the invitation">
            <Skeleton className="h-32 w-full" />
          </LoadingRegion>
        ) : preview.isError ? (
          <ErrorState title="We couldn’t load the invitation" message={errorMessage(preview.error)} onRetry={() => void preview.refetch()} />
        ) : (
          <div className="flex flex-col gap-4">
            <div className="flex items-center gap-3">
              <span aria-hidden className="flex size-12 items-center justify-center rounded-full bg-primary-soft text-primary-dark">
                <MailCheck className="size-6" />
              </span>
              <div>
                <p className="text-lg font-extrabold">{preview.data.patientName} invited you</p>
                <p className="text-[13px] text-muted">Link works until {shortDate(preview.data.expiresAt)}</p>
              </div>
            </div>
            {preview.data.message && <p className="rounded-field bg-canvas px-3 py-2">“{preview.data.message}”</p>}
            <p className="text-[13.5px]">
              Accepting lets you see their meals, analyses, trends, labs and targets, verify values and leave notes. They can stop sharing at any time, and each
              view appears in their account activity.
            </p>
            {claim.isError && (
              <div role="alert">
                <Notice tone="bad">{errorMessage(claim.error)}</Notice>
              </div>
            )}
            <div className="flex flex-wrap gap-2.5">
              <Button variant="accent" onClick={() => void accept()} loading={claim.isPending}>
                Accept and start following
              </Button>
              <Link to="/doctor/dashboard" className="inline-flex min-h-11 items-center px-2 font-semibold">
                Not now
              </Link>
            </div>
          </div>
        )}
      </Card>
    </div>
  );
}
