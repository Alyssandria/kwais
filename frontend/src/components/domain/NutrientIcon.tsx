import { cn } from '@/lib/cn';
import { NUTRIENTS, type NutrientKey } from '@/lib/nutrition';

const PATHS: Record<NutrientKey, string> = {
  sodium: 'M8 9h8l-1 12H9zM9 9l1-5h4l1 5M11 6.5h.01M13 6.5h.01',
  potassium: 'M5 13c2 5 10 6 15-3M5 13c4 1 9 0 12-5M17 8l1.5-3',
  phosphorus: 'M8 3h8v3l2 3v12H6V9l2-3zM6 13h12',
  protein: 'M12 3c4 0 7 6 7 11a7 7 0 0 1-14 0c0-5 3-11 7-11z',
};

export function NutrientIcon({ nutrient, size = 'md' }: { nutrient: NutrientKey; size?: 'sm' | 'md' }) {
  return (
    <span
      aria-hidden
      className={cn(
        'flex shrink-0 items-center justify-center',
        NUTRIENTS[nutrient].tile,
        size === 'md' ? 'size-[38px] rounded-card' : 'size-7 rounded-field',
      )}
    >
      <svg
        width={size === 'md' ? 20 : 16}
        height={size === 'md' ? 20 : 16}
        viewBox="0 0 24 24"
        fill="none"
        stroke="currentColor"
        strokeWidth="2"
        strokeLinecap="round"
        strokeLinejoin="round"
      >
        <path d={PATHS[nutrient]} />
      </svg>
    </span>
  );
}
