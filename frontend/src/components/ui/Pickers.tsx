import { useId, useState, type KeyboardEvent } from 'react';
import { Check, Plus, X } from 'lucide-react';
import { cn } from '@/lib/cn';
import { Chip } from './Toggles';

/**
 * Pick from suggestions or type your own. Selected values show as removable chips.
 * Used for allergies, care-team restrictions and dietary preferences.
 */
export function TagPicker({
  label,
  hint,
  value,
  onChange,
  suggestions,
  placeholder = 'Type and press Enter',
  max = 30,
}: {
  label: string;
  hint?: string;
  value: string[];
  onChange: (next: string[]) => void;
  suggestions: string[];
  placeholder?: string;
  max?: number;
}) {
  const [draft, setDraft] = useState('');
  const id = useId();
  const has = (v: string) => value.some((x) => x.toLowerCase() === v.toLowerCase());

  const add = (raw: string) => {
    const v = raw.trim().slice(0, 60);
    if (!v || has(v) || value.length >= max) return;
    onChange([...value, v]);
  };
  const remove = (v: string) => onChange(value.filter((x) => x !== v));
  const toggle = (v: string) => (has(v) ? onChange(value.filter((x) => x.toLowerCase() !== v.toLowerCase())) : add(v));

  const onKey = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === ',') {
      e.preventDefault();
      add(draft);
      setDraft('');
    } else if (e.key === 'Backspace' && !draft && value.length) {
      onChange(value.slice(0, -1));
    }
  };

  const custom = value.filter((v) => !suggestions.some((s) => s.toLowerCase() === v.toLowerCase()));

  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-1 text-[13px] font-semibold">{label}</legend>
      {hint && <p className="-mt-1 text-[12.5px] text-muted">{hint}</p>}
      <div role="group" aria-label={`Common ${label.toLowerCase()}`} className="flex flex-wrap gap-2">
        {suggestions.map((s) => (
          <Chip key={s} selected={has(s)} onToggle={() => toggle(s)}>
            {s}
          </Chip>
        ))}
      </div>
      {custom.length > 0 && (
        <ul aria-label={`Your own ${label.toLowerCase()}`} className="flex flex-wrap gap-2">
          {custom.map((v) => (
            <li key={v} className="inline-flex min-h-9 items-center gap-1.5 rounded-full bg-primary-soft py-1 pr-1 pl-3 text-sm font-semibold text-primary-dark">
              <Check className="size-3.5" aria-hidden />
              {v}
              <button
                type="button"
                onClick={() => remove(v)}
                aria-label={`Remove ${v}`}
                className="flex size-7 cursor-pointer items-center justify-center rounded-full hover:bg-white"
              >
                <X className="size-3.5" aria-hidden />
              </button>
            </li>
          ))}
        </ul>
      )}
      <div className="flex gap-2">
        <label htmlFor={id} className="sr-only">
          Add your own
        </label>
        <input
          id={id}
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          onKeyDown={onKey}
          placeholder={placeholder}
          maxLength={60}
          className="h-11 min-w-0 flex-1 rounded-field border border-[#cbd5e1] bg-surface px-3 text-sm focus:border-primary focus:outline-none"
        />
        <button
          type="button"
          onClick={() => {
            add(draft);
            setDraft('');
          }}
          disabled={!draft.trim()}
          className="inline-flex h-11 cursor-pointer items-center gap-1.5 rounded-field border border-line bg-surface px-3.5 font-semibold disabled:cursor-not-allowed disabled:opacity-50"
        >
          <Plus className="size-4" aria-hidden />
          Add
        </button>
      </div>
    </fieldset>
  );
}

/** One choice from a short list, shown as large tappable cards (radio semantics). */
export function RadioCards<T extends string>({
  legend,
  hint,
  name,
  value,
  options,
  onChange,
  columns = 2,
}: {
  legend: string;
  hint?: string;
  name: string;
  value: T | null;
  options: { value: T; label: string; description?: string }[];
  onChange: (v: T) => void;
  columns?: 1 | 2 | 3 | 4;
}) {
  const cols = { 1: '', 2: 'sm:grid-cols-2', 3: 'sm:grid-cols-3', 4: 'sm:grid-cols-4' }[columns];
  return (
    <fieldset className="flex flex-col gap-2.5">
      <legend className="mb-1 text-[13px] font-semibold">{legend}</legend>
      {hint && <p className="-mt-1 text-[12.5px] text-muted">{hint}</p>}
      <div className={cn('grid gap-2', cols)}>
        {options.map((o) => {
          const checked = o.value === value;
          return (
            <label
              key={o.value}
              className={cn(
                'flex min-h-12 cursor-pointer items-start gap-3 rounded-card border-[1.5px] px-3.5 py-3 transition-colors',
                checked ? 'border-primary bg-primary-soft' : 'border-line bg-surface hover:border-[#94a3b8]',
              )}
            >
              <input
                type="radio"
                name={name}
                value={o.value}
                checked={checked}
                onChange={() => onChange(o.value)}
                className="mt-0.5 size-4 shrink-0 accent-primary"
              />
              <span className="flex flex-col">
                <span className="font-semibold">{o.label}</span>
                {o.description && <span className="text-[12.5px] text-muted">{o.description}</span>}
              </span>
            </label>
          );
        })}
      </div>
    </fieldset>
  );
}
