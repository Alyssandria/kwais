import { useEffect, useId, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';
import type { AnalysisStep } from './api';

export type ProgressKind = 'analyse' | 'reanalyse' | 'save';
export type ProgressStep = 'saving' | AnalysisStep;

const LABELS: Record<ProgressStep, string> = {
  saving: 'Saving your meal',
  reading: 'Reading what you ate',
  calculating: 'Matching foods and working out nutrients',
  scoring: 'Checking against your targets and writing suggestions',
  storing: 'Saving the analysis',
};

const STEPS: Record<ProgressKind, ProgressStep[]> = {
  analyse: ['saving', 'reading', 'calculating', 'scoring', 'storing'],
  reanalyse: ['reading', 'calculating', 'scoring', 'storing'],
  save: ['saving'],
};

const SLOW_MS = 12_000;

export function ProgressDialog({ kind, step, title }: { kind: ProgressKind | null; step: ProgressStep | null; title: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [slow, setSlow] = useState(false);
  const steps = kind ? STEPS[kind] : [];
  const current = Math.max(0, step ? steps.indexOf(step) : 0);

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (kind && !dialog.open) dialog.showModal();
    if (!kind && dialog.open) dialog.close();
    setSlow(false);
    if (!kind) return;
    const timer = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => window.clearTimeout(timer);
  }, [kind]);

  return (
    <dialog
      ref={ref}
      aria-labelledby={titleId}
      onCancel={(e) => e.preventDefault()}
      className="m-auto w-[calc(100%-2rem)] max-w-md rounded-panel bg-surface p-0 text-ink shadow-pop backdrop:bg-[#0b3b40]/60"
    >
      {kind && (
        <div className="flex flex-col">
          <div className="relative overflow-hidden rounded-t-panel bg-primary-dark px-6 py-6 text-white">
            <div aria-hidden className="absolute -top-16 -right-10 size-44 rounded-full bg-[#0a7480]" />
            <div aria-hidden className="absolute top-6 right-14 size-3 rounded-full bg-accent" />
            <div className="relative flex items-center gap-4">
              <span aria-hidden className="flex size-12 shrink-0 items-center justify-center rounded-full bg-white/10">
                <Loader2 className="size-6 motion-safe:animate-spin" />
              </span>
              <div>
                <h2 id={titleId} className="text-lg font-extrabold">
                  {title}
                </h2>
                <p className="text-[13px] text-[#bfe3df]">Please keep this page open.</p>
              </div>
            </div>
          </div>
          <ol className="flex flex-col gap-3 px-6 py-5">
            {steps.map((key, i) => {
              const state = i < current ? 'done' : i === current ? 'current' : 'todo';
              return (
                <li key={key} className={cn('flex items-center gap-3 text-[14px]', state === 'todo' && 'text-muted')}>
                  <span
                    aria-hidden
                    className={cn(
                      'flex size-6 shrink-0 items-center justify-center rounded-full',
                      state === 'done' && 'bg-good-soft text-good',
                      state === 'current' && 'bg-primary-soft text-primary-dark',
                      state === 'todo' && 'border border-line',
                    )}
                  >
                    {state === 'done' && <Check className="size-3.5" strokeWidth={3} />}
                    {state === 'current' && <Loader2 className="size-3.5 motion-safe:animate-spin" />}
                  </span>
                  <span className={cn(state === 'current' && 'font-semibold')}>
                    {LABELS[key]}
                    {state === 'done' && <span className="sr-only"> (done)</span>}
                  </span>
                </li>
              );
            })}
          </ol>
          <p className="sr-only" aria-live="polite">
            {steps[current] ? LABELS[steps[current]] : ''}
          </p>
          {slow && (
            <p role="status" className="mx-6 mb-5 rounded-field bg-canvas px-3.5 py-2.5 text-[13px] text-muted">
              Still working. AI analysis can take up to 20 seconds.
            </p>
          )}
        </div>
      )}
    </dialog>
  );
}
