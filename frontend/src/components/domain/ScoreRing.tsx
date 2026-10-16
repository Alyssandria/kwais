import { CircleCheck, Contrast, TriangleAlert } from 'lucide-react';
import { cn } from '@/lib/cn';

export type ScoreBand = 'good' | 'mixed' | 'attention';

export function bandFor(score: number): ScoreBand {
  if (score >= 8) return 'good';
  if (score >= 5) return 'mixed';
  return 'attention';
}

const BAND = {
  good: { label: 'Good fit', stroke: '#047857', text: 'text-good', icon: CircleCheck },
  mixed: { label: 'Mixed', stroke: '#b45309', text: 'text-warn', icon: Contrast },
  attention: { label: 'Needs attention', stroke: '#b91c1c', text: 'text-bad', icon: TriangleAlert },
} as const;

export function ScoreRing({ score, size = 96, showBand = true }: { score: number; size?: number; showBand?: boolean }) {
  const band = BAND[bandFor(score)];
  const r = 50;
  const c = 2 * Math.PI * r;
  const filled = (Math.max(0, Math.min(10, score)) / 10) * c;
  const Icon = band.icon;
  return (
    <div className="flex items-center gap-4">
      <svg role="img" aria-label={`Score ${score} out of 10, ${band.label}`} width={size} height={size} viewBox="0 0 120 120">
        <circle cx="60" cy="60" r={r} fill="none" stroke="#e2e8f0" strokeWidth="12" />
        <circle
          cx="60"
          cy="60"
          r={r}
          fill="none"
          stroke={band.stroke}
          strokeWidth="12"
          strokeLinecap="round"
          strokeDasharray={`${filled} ${c}`}
          transform="rotate(-90 60 60)"
        />
        <text x="60" y="70" textAnchor="middle" fontSize="32" fontWeight="800" fill="#172b36">
          {score}
        </text>
      </svg>
      {showBand && (
        <span className={cn('inline-flex items-center gap-1.5 font-bold', band.text)}>
          <Icon className="size-4" aria-hidden />
          {band.label}
        </span>
      )}
    </div>
  );
}
