import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '@/lib/cn';

/** White card with a hairline border. `padding` none | sm | md | lg. */
export interface CardProps extends HTMLAttributes<HTMLElement> {
  as?: 'div' | 'section' | 'article';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  tone?: 'surface' | 'mint' | 'ai' | 'warn';
}

const pad = { none: '', sm: 'p-4', md: 'p-5', lg: 'p-6' } as const;
const tones = {
  surface: 'bg-surface border-line',
  mint: 'bg-primary-soft border-primary-line',
  ai: 'bg-ai-soft border-[#ddd6fe]',
  warn: 'bg-[#fff7ed] border-[#fed7aa]',
} as const;

export function Card({ as: Tag = 'div', padding = 'md', tone = 'surface', className, ...rest }: CardProps) {
  return <Tag className={cn('rounded-card border shadow-card', tones[tone], pad[padding], className)} {...rest} />;
}

/** Card heading row: title (+ optional subtitle) on the left, an action on the right. */
export function CardHeader({
  title,
  subtitle,
  action,
  id,
  level = 2,
}: {
  title: ReactNode;
  subtitle?: ReactNode;
  action?: ReactNode;
  id?: string;
  level?: 2 | 3;
}) {
  const H = level === 2 ? 'h2' : 'h3';
  return (
    <div className="mb-4 flex flex-wrap items-start justify-between gap-3">
      <div>
        <H id={id} className="text-base font-bold">
          {title}
        </H>
        {subtitle && <p className="text-[12.5px] text-muted">{subtitle}</p>}
      </div>
      {action}
    </div>
  );
}

/**
 * The deep-teal band that opens each main screen, with decorative circles
 * and an apricot dot. Put the page title and the main action inside.
 */
export function HeroBand({ className, children }: { className?: string; children: ReactNode }) {
  return (
    <section className={cn('relative overflow-hidden rounded-hero bg-primary-dark p-6 text-white sm:p-7', className)}>
      <div aria-hidden className="pointer-events-none absolute -top-24 -right-16 size-72 rounded-full bg-[#0a7480]" />
      <div aria-hidden className="pointer-events-none absolute -bottom-16 right-56 hidden size-36 rounded-full bg-[#0c6b75] sm:block" />
      <div aria-hidden className="pointer-events-none absolute top-8 right-20 size-4 rounded-full bg-accent" />
      <div className="relative">{children}</div>
    </section>
  );
}

/** Title block used at the top of pages without a hero band. */
export function PageHeader({
  title,
  description,
  actions,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}) {
  return (
    <div className="flex flex-wrap items-end justify-between gap-4">
      <div className="max-w-2xl">
        <h1 className="text-[26px] font-extrabold tracking-tight">{title}</h1>
        {description && <p className="mt-1 text-muted">{description}</p>}
      </div>
      {actions && <div className="flex flex-wrap gap-2.5">{actions}</div>}
    </div>
  );
}
