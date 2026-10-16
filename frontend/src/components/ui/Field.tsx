import {
  forwardRef,
  useId,
  type InputHTMLAttributes,
  type ReactNode,
  type SelectHTMLAttributes,
  type TextareaHTMLAttributes,
} from 'react';
import { CircleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

interface FieldShellProps {
  label: string;
  hint?: ReactNode;
  error?: string;
  optional?: boolean;
  className?: string;
  children: (ids: { id: string; describedBy: string | undefined; invalid: boolean }) => ReactNode;
}

export function FieldShell({ label, hint, error, optional, className, children }: FieldShellProps) {
  const id = useId();
  const hintId = hint ? `${id}-hint` : undefined;
  const errorId = error ? `${id}-error` : undefined;
  const describedBy = [hintId, errorId].filter(Boolean).join(' ') || undefined;

  return (
    <div className={cn('flex flex-col gap-1.5', className)}>
      <label htmlFor={id} className="text-[13px] font-semibold text-ink">
        {label}
        {optional && <span className="ml-1.5 font-normal text-muted">optional</span>}
      </label>
      {children({ id, describedBy, invalid: Boolean(error) })}
      {hint && !error && (
        <p id={hintId} className="text-[12.5px] text-muted">
          {hint}
        </p>
      )}
      {error && (
        <p id={errorId} className="flex items-center gap-1.5 text-[12.5px] font-semibold text-bad">
          <CircleAlert className="size-3.5 shrink-0" aria-hidden />
          {error}
        </p>
      )}
    </div>
  );
}

const control =
  'w-full rounded-field border bg-surface px-3 text-sm text-ink placeholder:text-[#94a3b8] ' +
  'transition-colors focus:border-primary focus:outline-none focus-visible:outline-2 focus-visible:outline-primary-dark ' +
  'disabled:cursor-not-allowed disabled:bg-canvas disabled:text-muted';

const borderFor = (invalid: boolean) => (invalid ? 'border-bad' : 'border-[#cbd5e1]');

type Common = { label: string; hint?: ReactNode; error?: string; optional?: boolean; containerClassName?: string };

export type InputProps = InputHTMLAttributes<HTMLInputElement> & Common;

export const Input = forwardRef<HTMLInputElement, InputProps>(function Input(
  { label, hint, error, optional, containerClassName, className, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={containerClassName}>
      {({ id, describedBy, invalid }) => (
        <input
          ref={ref}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(control, 'h-11', borderFor(invalid), className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
});

export type TextareaProps = TextareaHTMLAttributes<HTMLTextAreaElement> & Common;

export const Textarea = forwardRef<HTMLTextAreaElement, TextareaProps>(function Textarea(
  { label, hint, error, optional, containerClassName, className, rows = 3, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={containerClassName}>
      {({ id, describedBy, invalid }) => (
        <textarea
          ref={ref}
          id={id}
          rows={rows}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(control, 'resize-y py-2.5 leading-relaxed', borderFor(invalid), className)}
          {...rest}
        />
      )}
    </FieldShell>
  );
});

export type SelectProps = SelectHTMLAttributes<HTMLSelectElement> & Common;

export const Select = forwardRef<HTMLSelectElement, SelectProps>(function Select(
  { label, hint, error, optional, containerClassName, className, children, ...rest },
  ref,
) {
  return (
    <FieldShell label={label} hint={hint} error={error} optional={optional} className={containerClassName}>
      {({ id, describedBy, invalid }) => (
        <select
          ref={ref}
          id={id}
          aria-describedby={describedBy}
          aria-invalid={invalid || undefined}
          className={cn(control, 'h-11 pr-8', borderFor(invalid), className)}
          {...rest}
        >
          {children}
        </select>
      )}
    </FieldShell>
  );
});
