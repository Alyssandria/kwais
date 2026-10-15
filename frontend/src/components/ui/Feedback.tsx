import type { ReactNode } from 'react';
import { CircleAlert, Info, Loader2, TriangleAlert, type LucideIcon } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Button } from './Button';

/** Grey placeholder block while data loads. Size it with className (h-*, w-*). */
export function Skeleton({ className }: { className?: string }) {
  return <div aria-hidden className={cn('animate-pulse rounded-field bg-[#e8eef0]', className)} />;
}

/** Wraps skeletons so screen readers hear one "Loading" instead of nothing. */
export function LoadingRegion({ label = 'Loading', children }: { label?: string; children: ReactNode }) {
  return (
    <div role="status" aria-live="polite" aria-busy="true">
      <span className="sr-only">{label}</span>
      {children}
    </div>
  );
}

export function Spinner({ label = 'Loading', className }: { label?: string; className?: string }) {
  return (
    <span role="status" className={cn('inline-flex items-center gap-2 text-muted', className)}>
      <Loader2 className="size-4 animate-spin" aria-hidden />
      <span className="text-sm">{label}</span>
    </span>
  );
}

/** Nothing here yet: one icon, one sentence, at most one action. */
export function EmptyState({
  icon: Icon,
  title,
  description,
  action,
  className,
}: {
  icon: LucideIcon;
  title: string;
  description?: ReactNode;
  action?: ReactNode;
  className?: string;
}) {
  return (
    <div className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      <span className="flex size-12 items-center justify-center rounded-card bg-primary-soft text-primary-dark">
        <Icon className="size-6" aria-hidden />
      </span>
      <div className="max-w-sm">
        <p className="font-bold">{title}</p>
        {description && <p className="mt-1 text-[13px] text-muted">{description}</p>}
      </div>
      {action}
    </div>
  );
}

/** Something failed: say what, and offer Retry when it makes sense. */
export function ErrorState({
  title = 'We couldn’t load this',
  message,
  onRetry,
  className,
}: {
  title?: string;
  message?: string;
  onRetry?: () => void;
  className?: string;
}) {
  return (
    <div role="alert" className={cn('flex flex-col items-center gap-3 px-4 py-10 text-center', className)}>
      <span className="flex size-12 items-center justify-center rounded-card bg-bad-soft text-bad">
        <CircleAlert className="size-6" aria-hidden />
      </span>
      <div className="max-w-sm">
        <p className="font-bold">{title}</p>
        {message && <p className="mt-1 text-[13px] text-muted">{message}</p>}
      </div>
      {onRetry && (
        <Button variant="secondary" size="sm" onClick={onRetry}>
          Try again
        </Button>
      )}
    </div>
  );
}

/** Inline notice. Use `info` for sample-data banners, `warn` for data-quality notes. */
export function Notice({
  tone = 'info',
  title,
  children,
  className,
}: {
  tone?: 'info' | 'warn' | 'bad';
  title?: string;
  children: ReactNode;
  className?: string;
}) {
  const map = {
    info: { icon: Info, cls: 'bg-info-soft border-[#bfdbfe] text-info' },
    warn: { icon: TriangleAlert, cls: 'bg-warn-soft border-[#fde68a] text-[#78350f]' },
    bad: { icon: CircleAlert, cls: 'bg-bad-soft border-[#fca5a5] text-bad' },
  } as const;
  const { icon: Icon, cls } = map[tone];
  return (
    <div role="note" className={cn('flex gap-2.5 rounded-field border px-3.5 py-2.5 text-[13px]', cls, className)}>
      <Icon className="mt-0.5 size-4 shrink-0" aria-hidden />
      <div>
        {title && <p className="font-bold">{title}</p>}
        <div>{children}</div>
      </div>
    </div>
  );
}
