import { useId, useState, type ReactNode } from 'react';
import { ChevronDown, Clock } from 'lucide-react';
import { Chip } from '@/components/ui';
import { cn } from '@/lib/cn';
import { startOfDay } from './options';

/** White card with a tinted icon tile, a title and a hint, for each group of chips. */
export function ChipSection({
  id,
  icon,
  tile,
  title,
  optional,
  hint,
  children,
}: {
  id: string;
  icon: ReactNode;
  tile: string;
  title: string;
  optional?: boolean;
  hint: string;
  children: ReactNode;
}) {
  return (
    <section aria-labelledby={id} className="flex flex-col gap-3.5 rounded-panel border border-line bg-surface p-5 sm:p-[22px]">
      <div className="flex items-start gap-3.5">
        <span aria-hidden className={cn('flex size-11 shrink-0 items-center justify-center rounded-card', tile)}>
          {icon}
        </span>
        <div>
          <h2 id={id} className="text-[17px] font-extrabold">
            {title} {optional && <span className="text-[13px] font-medium text-muted">optional</span>}
          </h2>
          <p className="text-[13px] text-muted">{hint}</p>
        </div>
      </div>
      {children}
    </section>
  );
}

/** A row of on/off chips for a list of string keys. */
export function ChipGroup({
  label,
  options,
  selected,
  onToggle,
}: {
  label: string;
  options: { value: string; label: string }[];
  selected: string[];
  onToggle: (value: string) => void;
}) {
  return (
    <div role="group" aria-label={label} className="flex flex-wrap gap-2">
      {options.map((o) => (
        <Chip key={o.value} selected={selected.includes(o.value)} onToggle={() => onToggle(o.value)}>
          {o.label}
        </Chip>
      ))}
    </div>
  );
}

const DAYS_BACK = 7;
const pad = (n: number) => String(n).padStart(2, '0');

/**
 * "Today · 12:40 PM ▾" chip on the hero. Opens a day list (today and the 6 days before)
 * and a time field. Times later than now are refused, matching the server rule.
 */
export function WhenPicker({ value, onChange, now = new Date() }: { value: Date; onChange: (d: Date) => void; now?: Date }) {
  const [open, setOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const panelId = useId();
  const dayId = useId();
  const timeId = useId();

  const today = startOfDay(now);
  const dayOffset = Math.round((today.getTime() - startOfDay(value).getTime()) / 86_400_000);
  const dayName = (offset: number) => {
    if (offset === 0) return 'Today';
    if (offset === 1) return 'Yesterday';
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    return d.toLocaleDateString('en-PH', { weekday: 'short', day: 'numeric', month: 'short' });
  };
  const timeText = value.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' });

  const apply = (offset: number, hhmm: string) => {
    const [h, m] = hhmm.split(':').map(Number);
    const d = new Date(today);
    d.setDate(d.getDate() - offset);
    d.setHours(h ?? 0, m ?? 0, 0, 0);
    if (d.getTime() > now.getTime() + 60_000) {
      setError('That time hasn’t happened yet');
      return;
    }
    setError(null);
    onChange(d);
  };

  return (
    <div className="flex flex-col items-start gap-2">
      <button
        type="button"
        aria-expanded={open}
        aria-controls={panelId}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex h-[34px] cursor-pointer items-center gap-1.5 rounded-full border border-[#2a8c96] bg-[#0a6b76] px-3 text-[13px] font-semibold text-[#d7eeeb]"
      >
        <Clock className="size-3.5" aria-hidden />
        <span>
          <span className="sr-only">Eaten </span>
          {dayName(dayOffset)} · {timeText}
        </span>
        <ChevronDown className={cn('size-3.5 transition-transform', open && 'rotate-180')} aria-hidden />
      </button>
      {open && (
        <div id={panelId} className="flex flex-wrap items-end gap-3 rounded-card bg-white p-3 text-ink shadow-pop">
          <div className="flex flex-col gap-1">
            <label htmlFor={dayId} className="text-[12px] font-semibold">
              Day
            </label>
            <select
              id={dayId}
              value={dayOffset}
              onChange={(e) => apply(Number(e.target.value), `${pad(value.getHours())}:${pad(value.getMinutes())}`)}
              className="h-10 rounded-field border border-[#cbd5e1] bg-surface px-2.5 text-sm"
            >
              {Array.from({ length: DAYS_BACK }, (_, i) => (
                <option key={i} value={i}>
                  {dayName(i)}
                </option>
              ))}
            </select>
          </div>
          <div className="flex flex-col gap-1">
            <label htmlFor={timeId} className="text-[12px] font-semibold">
              Time
            </label>
            <input
              id={timeId}
              type="time"
              value={`${pad(value.getHours())}:${pad(value.getMinutes())}`}
              onChange={(e) => e.target.value && apply(dayOffset, e.target.value)}
              aria-invalid={error ? true : undefined}
              className="h-10 rounded-field border border-[#cbd5e1] bg-surface px-2.5 text-sm"
            />
          </div>
          <button type="button" onClick={() => setOpen(false)} className="h-10 cursor-pointer rounded-field px-3 text-sm font-semibold text-primary-dark hover:bg-primary-soft">
            Done
          </button>
          {error && (
            <p role="alert" className="basis-full text-[12.5px] font-semibold text-bad">
              {error}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
