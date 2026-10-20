import { cn } from '@/lib/cn';

export function Logo({ tone = 'dark', showTagline = true }: { tone?: 'dark' | 'light'; showTagline?: boolean }) {
  const onDark = tone === 'dark';
  return (
    <span className="flex items-center gap-2.5">
      <span className="flex size-9 shrink-0 items-center justify-center rounded-field bg-accent">
        <svg aria-hidden width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="#0b3b40" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
          <path d="M15 3c-3.5 0-6 3-6 7 0 2 1 3 1 5s-2 3-2 5" />
          <path d="M15 3c3 0 5 2.5 5 6s-2 7-5 7c-1.5 0-2.5-1-2.5-2.5" />
        </svg>
      </span>
      <span className="flex flex-col leading-tight">
        <span className={cn('text-[17px] font-extrabold tracking-wide', onDark ? 'text-white' : 'text-primary-dark')}>K-WAIS</span>
        {showTagline && (
          <span className={cn('text-[11.5px]', onDark ? 'text-[#d7eeeb]' : 'text-muted')}>Kidney care companion</span>
        )}
      </span>
    </span>
  );
}
