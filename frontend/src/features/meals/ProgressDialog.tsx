import { useEffect, useId, useRef, useState } from 'react';
import { Check, Loader2 } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ProgressKind = 'analyse' | 'reanalyse' | 'save';

const STEPS: Record<ProgressKind, string[]> = {
  analyse: [
    'Saving your meal',
    'Reading what you ate',
    'Matching each food to the food tables',
    'Working out sodium, potassium, phosphorus and protein',
    'Checking against your targets and writing suggestions',
  ],
  reanalyse: [
    'Reading what you ate',
    'Matching each food to the food tables',
    'Working out sodium, potassium, phosphorus and protein',
    'Checking against your targets and writing suggestions',
  ],
  save: ['Saving your meal'],
};

const STEP_MS = 1400;
const SLOW_MS = 12_000;

export function ProgressDialog({ kind, title }: { kind: ProgressKind | null; title: string }) {
  const ref = useRef<HTMLDialogElement>(null);
  const titleId = useId();
  const [step, setStep] = useState(0);
  const [slow, setSlow] = useState(false);
  const steps = kind ? STEPS[kind] : [];

  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (kind && !dialog.open) dialog.showModal();
    if (!kind && dialog.open) dialog.close();
    setStep(0);
    setSlow(false);
    if (!kind) return;
    const last = STEPS[kind].length - 1;
    const tick = window.setInterval(() => setStep((s) => Math.min(s + 1, last)), STEP_MS);
    const slowTimer = window.setTimeout(() => setSlow(true), SLOW_MS);
    return () => {
      window.clearInterval(tick);
      window.clearTimeout(slowTimer);
    };
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
            {steps.map((label, i) => {
              const state = i < step ? 'done' : i === step ? 'current' : 'todo';
              return (
                <li key={label} className={cn('flex items-center gap-3 text-[14px]', state === 'todo' && 'text-muted')}>
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
                  <span className={cn(state === 'current' && 'font-semibold')}>{label}</span>
                </li>
              );
            })}
          </ol>
          <p className="sr-only" aria-live="polite">
            {steps[step]}
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
