import { forwardRef, useId, type InputHTMLAttributes, type ReactNode } from 'react';
import { Check, Plus } from 'lucide-react';
import { cn } from '@/lib/cn';

export interface CheckboxProps extends Omit<InputHTMLAttributes<HTMLInputElement>, 'type'> {
  label: ReactNode;
  description?: ReactNode;
}

export const Checkbox = forwardRef<HTMLInputElement, CheckboxProps>(function Checkbox(
  { label, description, className, id: idProp, ...rest },
  ref,
) {
  const autoId = useId();
  const id = idProp ?? autoId;
  return (
    <div className={cn('flex items-start gap-3', className)}>
      <input
        ref={ref}
        id={id}
        type="checkbox"
        className="mt-0.5 size-5 shrink-0 cursor-pointer rounded accent-primary"
        aria-describedby={description ? `${id}-desc` : undefined}
        {...rest}
      />
      <div className="flex flex-col">
        <label htmlFor={id} className="cursor-pointer font-semibold">
          {label}
        </label>
        {description && (
          <span id={`${id}-desc`} className="text-[12.5px] text-muted">
            {description}
          </span>
        )}
      </div>
    </div>
  );
});

export interface SwitchProps {
  checked: boolean;
  onChange: (next: boolean) => void;
  label: ReactNode;
  description?: ReactNode;
  disabled?: boolean;
  tone?: 'light' | 'dark';
  className?: string;
}

export function Switch({ checked, onChange, label, description, disabled, tone = 'light', className }: SwitchProps) {
  const dark = tone === 'dark';
  return (
    <button
      type="button"
      role="switch"
      aria-checked={checked}
      disabled={disabled}
      onClick={() => onChange(!checked)}
      className={cn(
        'inline-flex min-h-12 cursor-pointer items-center gap-3 rounded-card px-3.5 text-left disabled:cursor-not-allowed disabled:opacity-60',
        dark ? 'border border-[#2e6a70] bg-[#13494f] text-white' : 'border border-line bg-surface text-ink',
        className,
      )}
    >
      <span
        aria-hidden
        className={cn(
          'relative h-[26px] w-11 shrink-0 rounded-full transition-colors',
          checked ? (dark ? 'bg-accent' : 'bg-primary') : dark ? 'bg-[#4b7f84]' : 'bg-[#cbd5e1]',
        )}
      >
        <span
          className={cn(
            'absolute top-[3px] size-5 rounded-full bg-white shadow-card transition-[left]',
            checked ? 'left-[21px]' : 'left-[3px]',
          )}
        />
      </span>
      <span className="flex flex-col">
        <span className="font-semibold">{label}</span>
        {description && <span className={cn('text-[11.5px]', dark ? 'text-[#d7eeeb]' : 'text-muted')}>{description}</span>}
      </span>
    </button>
  );
}

export interface ChipProps {
  selected: boolean;
  onToggle: () => void;
  children: ReactNode;
  disabled?: boolean;
}

export function Chip({ selected, onToggle, children, disabled }: ChipProps) {
  return (
    <button
      type="button"
      aria-pressed={selected}
      disabled={disabled}
      onClick={onToggle}
      className={cn(
        'inline-flex min-h-11 cursor-pointer items-center gap-1.5 rounded-full border-[1.5px] px-4 text-sm font-semibold transition-colors',
        'disabled:cursor-not-allowed disabled:opacity-60',
        selected
          ? 'border-primary bg-primary-soft text-primary-dark'
          : 'border-line bg-surface text-[#334155] hover:border-[#94a3b8]',
      )}
    >
      {selected ? <Check className="size-4" aria-hidden /> : <Plus className="size-4" aria-hidden />}
      {children}
    </button>
  );
}

export interface SegmentedProps<T extends string> {
  label: string;
  value: T;
  options: { value: T; label: string }[];
  onChange: (value: T) => void;
}

export function Segmented<T extends string>({ label, value, options, onChange }: SegmentedProps<T>) {
  return (
    <div role="radiogroup" aria-label={label} className="inline-flex flex-wrap gap-1 rounded-card border border-line bg-surface p-1">
      {options.map((o) => {
        const on = o.value === value;
        return (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={on}
            onClick={() => onChange(o.value)}
            className={cn(
              'min-h-9 cursor-pointer rounded-[9px] px-3 text-[13px] font-semibold transition-colors',
              on ? 'bg-primary text-white' : 'text-[#475569] hover:bg-canvas',
            )}
          >
            {o.label}
          </button>
        );
      })}
    </div>
  );
}
