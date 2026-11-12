import { Link } from 'react-router-dom';
import { Badge, Card, NoTargetBar, ProgressBar, StatusLabel } from '@/components/ui';
import { NutrientIcon } from '@/components/domain/NutrientIcon';
import { ScoreRing } from '@/components/domain/ScoreRing';
import { FLUID_NOTE, fmt, goalStatusText, isGoal, NUTRIENTS, percentOfTarget, targetStatus, targetStatusText, type NutrientKey } from '@/lib/nutrition';
import type { TodayNutrient } from '../types';

export function TodayScoreCard({ score, scoredMeals }: { score: number | null; scoredMeals: number }) {
  return (
    <Card tone="mint" className="flex flex-col gap-3">
      <h3 className="text-[13px] font-semibold text-muted">Today’s meal score</h3>
      {score == null ? (
        <div className="flex flex-1 flex-col justify-center gap-2">
          <p className="font-bold">No score yet</p>
          <p className="text-[13px] text-muted">
            Scores appear once you analyse a meal. Add targets from your care team for a score that fits you.
          </p>
          <Link to="/patient/labs" className="text-[13px] font-semibold">
            Add lab results
          </Link>
        </div>
      ) : (
        <>
          <ScoreRing score={score} size={88} />
          <p className="text-[12.5px] text-muted">
            Average of {scoredMeals} {scoredMeals === 1 ? 'meal' : 'meals'}, out of 10
          </p>
        </>
      )}
      <p className="mt-auto border-t border-primary-line pt-2.5 text-[12px] text-muted">
        Scored against the targets you entered, or general CKD guidance
      </p>
    </Card>
  );
}

export function NutrientCard({ nutrient, data }: { nutrient: NutrientKey; data: TodayNutrient }) {
  const meta = NUTRIENTS[nutrient];
  const goal = isGoal(nutrient);
  const pct = percentOfTarget(data.value, data.target);
  const kind = targetStatus(pct);
  // a calorie goal is something to reach, so it is never shown in warning colours
  const barTone = goal ? 'primary' : kind === 'above' ? 'bad' : kind === 'near' ? 'warn' : 'primary';

  return (
    <Card as="article" className="flex flex-col gap-2.5" aria-labelledby={`nutrient-${nutrient}`}>
      <div className="flex items-center justify-between gap-2">
        <span className="flex items-center gap-2.5">
          <NutrientIcon nutrient={nutrient} />
          <h3 id={`nutrient-${nutrient}`} className="font-bold">
            {meta.label}
          </h3>
        </span>
        {data.hasEstimates && <Badge>Estimated</Badge>}
      </div>
      <p className="flex items-baseline gap-1.5">
        <span className="text-[28px] font-extrabold tracking-tight">{fmt(data.value)}</span>
        <span className="font-semibold text-muted">{data.unit}</span>
      </p>
      {pct == null ? (
        <>
          <NoTargetBar />
          <StatusLabel kind="none">Estimate only · no {goal ? 'goal' : 'target'} set</StatusLabel>
          <Link to="/patient/profile" className="text-[12.5px] font-semibold">
            Add a {goal ? 'goal' : 'target'}
          </Link>
        </>
      ) : (
        <>
          <ProgressBar value={pct} tone={barTone} label={`${meta.label}: ${pct} percent of your daily ${goal ? 'goal' : 'target'}`} />
          {goal ? <p className="text-[13px] font-semibold">{goalStatusText(pct)}</p> : <StatusLabel kind={kind}>{targetStatusText(pct)}</StatusLabel>}
          <p className="text-[12px] text-muted">
            {goal ? 'Goal' : 'Target'} {fmt(data.target ?? 0)} {data.unit}/day ·{' '}
            {data.targetSource === 'clinician_verified' ? 'set by your clinician' : 'entered by you'}
          </p>
        </>
      )}
      {nutrient === 'fluid' && <p className="text-[12px] text-muted">{FLUID_NOTE}</p>}
    </Card>
  );
}
