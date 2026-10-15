import type { ReactNode } from 'react';
import { ArrowDown, ArrowUp, Check, CircleDot, Database, Minus, Sparkles, EqualApproximately } from 'lucide-react';
import { cn } from '@/lib/cn';

/** Small neutral or tinted label. Status meaning must come from StatusLabel, not colour alone. */
export function Badge({
  children,
  tone = 'neutral',
  className,
}: {
  children: ReactNode;
  tone?: 'neutral' | 'mint' | 'good' | 'warn' | 'bad' | 'info' | 'ai';
  className?: string;
}) {
  const tones = {
    neutral: 'bg-[#f1f5f9] text-[#475569]',
    mint: 'bg-primary-soft text-primary-dark',
    good: 'bg-good-soft text-good',
    warn: 'bg-warn-soft text-warn',
    bad: 'bg-bad-soft text-bad',
    info: 'bg-info-soft text-info',
    ai: 'bg-ai-soft text-ai',
  } as const;
  return (
    <span className={cn('inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-[11.5px] font-semibold', tones[tone], className)}>
      {children}
    </span>
  );
}

/**
 * Nutrient or lab status: always icon + words + colour.
 *   within   ✓ green   (within a target or slip range the user supplied)
 *   near     ● amber   (≥ 80 % of a target)
 *   above    ▲ red
 *   below    ▼ red     (below a slip range)
 *   none     –  grey   (no target: estimate only)
 */
export type StatusKind = 'within' | 'near' | 'above' | 'below' | 'none';

export function StatusLabel({ kind, children, className }: { kind: StatusKind; children: ReactNode; className?: string }) {
  const map = {
    within: { icon: Check, cls: 'text-good' },
    near: { icon: CircleDot, cls: 'text-warn' },
    above: { icon: ArrowUp, cls: 'text-bad' },
    below: { icon: ArrowDown, cls: 'text-bad' },
    none: { icon: Minus, cls: 'text-[#475569]' },
  } as const;
  const { icon: Icon, cls } = map[kind];
  return (
    <span className={cn('inline-flex items-center gap-1.5 text-[12.5px] font-semibold', cls, className)}>
      <Icon className="size-3.5 shrink-0" strokeWidth={2.6} aria-hidden />
      {children}
    </span>
  );
}

/**
 * Where a number came from. Shown next to every nutrient value.
 *   verified  from the food composition dataset (PhilFCT / USDA)
 *   estimated from a recipe or a guessed amount
 *   missing   no data for this food
 *   ai        text written by the AI from computed numbers
 */
export type Provenance = 'verified' | 'estimated' | 'missing' | 'ai';

export function SourceTag({ kind, detail }: { kind: Provenance; detail?: string }) {
  const map = {
    verified: { icon: Database, label: 'Verified', cls: 'text-good' },
    estimated: { icon: EqualApproximately, label: 'Estimated', cls: 'text-warn' },
    missing: { icon: Minus, label: 'No data', cls: 'text-[#475569]' },
    ai: { icon: Sparkles, label: 'AI-generated', cls: 'text-ai' },
  } as const;
  const { icon: Icon, label, cls } = map[kind];
  return (
    <span className={cn('inline-flex items-center gap-1 text-[12px] font-semibold', cls)}>
      <Icon className="size-3.5 shrink-0" aria-hidden />
      {label}
      {detail && <span className="font-normal text-muted">· {detail}</span>}
    </span>
  );
}

/** Horizontal bar. `value` 0–100 (clamped). Pass `label` for screen readers. */
export function ProgressBar({
  value,
  label,
  tone = 'primary',
  className,
}: {
  value: number;
  label: string;
  tone?: 'primary' | 'warn' | 'bad';
  className?: string;
}) {
  const pct = Math.max(0, Math.min(100, value));
  const fill = { primary: 'bg-primary', warn: 'bg-warn-mark', bad: 'bg-bad' }[tone];
  return (
    <div
      role="progressbar"
      aria-label={label}
      aria-valuemin={0}
      aria-valuemax={100}
      aria-valuenow={Math.round(pct)}
      className={cn('h-2 overflow-hidden rounded-full bg-[#f1f5f9]', className)}
    >
      <div className={cn('h-full rounded-full transition-[width]', fill)} style={{ width: `${pct}%` }} />
    </div>
  );
}

/** Dashed bar shown when there is no target to compare against. */
export function NoTargetBar() {
  return (
    <div
      aria-hidden
      className="h-2 rounded-full"
      style={{ background: 'repeating-linear-gradient(90deg, #e2e8f0 0 6px, transparent 6px 10px)' }}
    />
  );
}
