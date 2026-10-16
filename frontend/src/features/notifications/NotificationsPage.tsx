import { Link, useNavigate } from 'react-router-dom';
import { Bell, BellRing, CircleUser, Sparkles } from 'lucide-react';
import { Button, Card, EmptyState, ErrorState, LoadingRegion, PageHeader, Skeleton } from '@/components/ui';
import { errorMessage } from '@/lib/api';
import { cn } from '@/lib/cn';
import { useMarkAllRead, useMarkRead, useNotifications, type AppNotification } from './api';

const ICONS = { meal_reminder: BellRing, analysis_ready: Sparkles, account: CircleUser } as const;

function when(iso: string) {
  const d = new Date(iso);
  const time = d.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });
  return d.toDateString() === new Date().toDateString() ? `Today, ${time}` : `${d.toLocaleDateString('en-PH', { day: 'numeric', month: 'short' })}, ${time}`;
}

export function NotificationsPage() {
  const navigate = useNavigate();
  const list = useNotifications();
  const markRead = useMarkRead();
  const markAll = useMarkAllRead();

  const open = async (n: AppNotification) => {
    if (!n.read) await markRead.mutateAsync(n.id).catch(() => undefined);
    if (n.link) navigate(n.link);
  };

  return (
    <div className="flex max-w-3xl flex-col gap-5">
      <PageHeader
        title="Notifications"
        description={
          <>
            Logging reminders are set in your <Link to="/patient/profile">profile</Link>.
          </>
        }
        actions={
          list.data && list.data.unread > 0 ? (
            <Button variant="secondary" size="sm" onClick={() => markAll.mutate()} loading={markAll.isPending}>
              Mark all as read
            </Button>
          ) : undefined
        }
      />
      {list.isPending ? (
        <LoadingRegion label="Loading notifications">
          <Skeleton className="h-20 rounded-card" />
        </LoadingRegion>
      ) : list.isError ? (
        <Card padding="none">
          <ErrorState title="We couldn’t load your notifications" message={errorMessage(list.error)} onRetry={() => void list.refetch()} />
        </Card>
      ) : list.data.items.length === 0 ? (
        <Card padding="none">
          <EmptyState icon={Bell} title="Nothing here yet" description="Reminders you turn on will show up here." />
        </Card>
      ) : (
        <ul className="flex flex-col gap-2">
          {list.data.items.map((n) => {
            const Icon = ICONS[n.type];
            return (
              <li key={n.id}>
                <button
                  type="button"
                  onClick={() => void open(n)}
                  className={cn(
                    'flex w-full cursor-pointer items-start gap-3.5 rounded-card border p-4 text-left',
                    n.read ? 'border-line bg-surface' : 'border-primary-line bg-primary-soft',
                  )}
                >
                  <span className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white text-primary-dark">
                    <Icon className="size-5" aria-hidden />
                  </span>
                  <span className="flex min-w-0 flex-1 flex-col gap-0.5">
                    <span className="font-semibold">
                      {!n.read && <span className="sr-only">Unread: </span>}
                      {n.title}
                    </span>
                    <span className="text-[13.5px] text-[#475569]">{n.body}</span>
                    <span className="text-[12px] text-muted">{when(n.createdAt)}</span>
                  </span>
                  {!n.read && <span aria-hidden className="mt-1.5 size-2.5 shrink-0 rounded-full bg-primary" />}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
