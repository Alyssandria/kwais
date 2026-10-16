import { Link } from 'react-router-dom';
import { Copy, RefreshCw, Sparkles } from 'lucide-react';
import { NutrientIcon } from '@/components/domain/NutrientIcon';
import { ScoreRing } from '@/components/domain/ScoreRing';
import { Badge, Button, Card, CardHeader, SourceTag, StatusLabel, useToast } from '@/components/ui';
import { useTargets } from '@/features/profile/api';
import { cn } from '@/lib/cn';
import { NUTRIENTS, NUTRIENT_KEYS, fmt, percentOfTarget, targetStatus, type NutrientKey } from '@/lib/nutrition';
import type { AnalysedItem, MealAnalysis } from './api';
import { amountLabel } from './options';

export const amount = (n: number, unit: 'mg' | 'g') => (unit === 'g' ? n.toFixed(1) : fmt(n));

function AiLabel({ status }: { status: MealAnalysis['ai']['status'] }) {
  if (status === 'mock') return <Badge>Sample text, not AI · numbers from the food tables</Badge>;
  return <SourceTag kind="ai" detail="numbers from the food tables" />;
}

function DeductionMark({ value }: { value: number | null }) {
  const text = value == null ? '—' : value === 0 ? '0' : `−${value}`;
  const label = value == null ? 'not scored' : value === 0 ? 'no points off' : `${value} ${value === 1 ? 'point' : 'points'} off`;
  return (
    <span
      aria-label={label}
      className={cn(
        'flex h-7 min-w-10 shrink-0 items-center justify-center rounded-full px-2 text-[13px] font-extrabold',
        value ? 'bg-bad-soft text-bad' : 'bg-[#f1f5f9] text-[#475569]',
      )}
    >
      {text}
    </span>
  );
}

export function ScoreCard({
  analysis,
  onAllowAi,
  onRetry,
  busy,
}: {
  analysis: MealAnalysis;
  onAllowAi: () => void;
  onRetry: () => void;
  busy: boolean;
}) {
  const { ai, score } = analysis;

  if (ai.status === 'unavailable') {
    const noConsent = ai.reason === 'no_consent';
    return (
      <Card as="section" tone="ai" aria-labelledby="score-title">
        <CardHeader
          id="score-title"
          title={
            <span className="inline-flex items-center gap-2">
              <Sparkles className="size-4 text-ai" aria-hidden />
              {noConsent ? 'AI analysis is off' : 'AI analysis couldn’t run this time'}
            </span>
          }
        />
        <p className="max-w-2xl text-[14px]">
          {noConsent
            ? 'This meal has its nutrient numbers, but no score or suggestions. If you allow AI processing, the meal and the health details you entered are sent to Google Gemini for analysis. Your name and contact details are never sent.'
            : 'The nutrient numbers below are complete. Only the score and suggestions are missing.'}
        </p>
        <Button className="mt-4" onClick={noConsent ? onAllowAi : onRetry} loading={busy}>
          {noConsent ? 'Allow AI and analyse' : 'Try again'}
        </Button>
      </Card>
    );
  }

  const out = ai.output;
  return (
    <Card as="section" aria-labelledby="score-title" padding="lg" className="grid gap-6 md:grid-cols-[220px_1fr]">
      <div className="flex flex-col gap-3">
        <h2 id="score-title" className="text-base font-bold">
          Meal score
        </h2>
        {score != null ? (
          <>
            <ScoreRing score={score} size={104} />
            <p className="text-[12.5px] text-muted">Starts at 10. Points come off only for things you told us: your targets, restrictions, allergies and lab ranges.</p>
          </>
        ) : (
          <>
            <p className="text-[22px] font-extrabold">No score yet</p>
            <p className="text-[13px] text-muted">
              Add a <Link to="/patient/profile">daily target</Link> or a <Link to="/patient/labs">lab result</Link> with its range, and
              the next analysis will include a score.
            </p>
          </>
        )}
      </div>
      <div className="flex flex-col gap-3">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <h3 className="font-bold">{score != null ? 'Why this score' : 'What we looked at'}</h3>
          <AiLabel status={ai.status} />
        </div>
        {out?.summary && <p className="text-[14px]">{out.summary}</p>}
        <ul className="flex flex-col gap-2.5">
          {out?.scoreReasons.map((r, i) => (
            <li key={i} className="flex items-start gap-3">
              <DeductionMark value={r.deduction} />
              <p className="text-[14px]">
                <strong>{r.title}.</strong> {r.detail}
              </p>
            </li>
          ))}
        </ul>
      </div>
    </Card>
  );
}

export function NutrientTotals({ analysis }: { analysis: MealAnalysis }) {
  const targets = useTargets();
  const targetFor = (n: NutrientKey) => targets.data?.find((t) => t.nutrient === n)?.dailyMax ?? null;
  return (
    <section aria-labelledby="totals-title" className="flex flex-col gap-3">
      <h2 id="totals-title" className="text-lg font-extrabold">
        Estimated nutrients in this meal
      </h2>
      <ul className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {NUTRIENT_KEYS.map((n) => {
          const t = analysis.totals[n];
          const meta = NUTRIENTS[n];
          const target = targetFor(n);
          const today = analysis.day?.totalsWithMeal[n];
          const pct = today != null ? percentOfTarget(today, target) : null;
          return (
            <li key={n}>
              <Card as="article" aria-label={meta.label} padding="sm" className="flex h-full flex-col gap-2">
                <div className="flex items-center gap-2.5">
                  <NutrientIcon nutrient={n} size="sm" />
                  <span className="font-bold">{meta.label}</span>
                </div>
                <p className="text-[26px] leading-none font-extrabold">
                  {t.value == null ? (
                    '—'
                  ) : (
                    <>
                      {!t.complete && <span className="text-[15px] font-semibold text-muted">at least </span>}
                      {amount(t.value, t.unit)}
                    </>
                  )}{' '}
                  <span className="text-sm font-semibold text-muted">{t.unit}</span>
                </p>
                <SourceTag kind={t.source} />
                {today != null && target != null ? (
                  <StatusLabel kind={targetStatus(pct)}>
                    Today {amount(today, meta.unit)} of {fmt(target)} {meta.unit}
                  </StatusLabel>
                ) : (
                  <p className="text-[12.5px] text-muted">
                    {today != null ? `Today ${amount(today, meta.unit)} ${meta.unit} · ` : ''}no target set
                  </p>
                )}
              </Card>
            </li>
          );
        })}
      </ul>
      {analysis.day && (
        <p className="text-[12.5px] text-muted">
          “Today” counts this meal and {analysis.day.earlierMeals === 1 ? '1 earlier analysed meal' : `${analysis.day.earlierMeals} earlier analysed meals`} on{' '}
          {new Date(`${analysis.day.date}T00:00:00`).toLocaleDateString('en-PH', { day: 'numeric', month: 'short' })}.
        </p>
      )}
    </section>
  );
}

const SERIES = ['#087f8c', '#f59e0b', '#7c3aed', '#0284c7', '#e11d48', '#64748b'];

export function Contribution({ items }: { items: AnalysedItem[] }) {
  const counted = items.filter((i) => i.match && i.grams != null);
  if (counted.length < 2) return null;
  const shown = counted.slice(0, SERIES.length);
  const share = (n: NutrientKey) => {
    const total = shown.reduce((s, i) => s + (i.nutrients[n].value ?? 0), 0);
    return shown.map((i) => (total > 0 ? ((i.nutrients[n].value ?? 0) / total) * 100 : 0));
  };
  const sodium = share('sodium');
  const top = sodium.indexOf(Math.max(...sodium));
  const headline = sodium[top]! > 50 ? `${shown[top]!.label} alone gave more than half of this meal’s sodium` : null;

  return (
    <Card as="section" aria-labelledby="contrib-title">
      <CardHeader id="contrib-title" title="What each food contributed" subtitle={headline ?? undefined} />
      <ul aria-label="Foods" className="mb-4 flex flex-wrap gap-x-4 gap-y-1.5 text-[12.5px]">
        {shown.map((i, k) => (
          <li key={`${i.label}-${k}`} className="inline-flex items-center gap-1.5">
            <span aria-hidden className="size-2.5 rounded-sm" style={{ background: SERIES[k] }} />
            {i.label}
          </li>
        ))}
      </ul>
      <div className="flex flex-col gap-2.5">
        {NUTRIENT_KEYS.map((n) => {
          const parts = share(n);
          const label = `${NUTRIENTS[n].label}: ${shown.map((i, k) => `${i.label} ${Math.round(parts[k]!)} percent`).join(', ')}`;
          return (
            <div key={n} className="grid grid-cols-[90px_1fr] items-center gap-3">
              <span className="text-[13px] font-semibold">{NUTRIENTS[n].label}</span>
              <div role="img" aria-label={label} className="flex h-3.5 overflow-hidden rounded-full bg-[#f1f5f9]">
                {parts.map((p, k) => (
                  <div key={k} style={{ width: `${p}%`, background: SERIES[k] }} />
                ))}
              </div>
            </div>
          );
        })}
      </div>
    </Card>
  );
}

function itemAmount(i: AnalysedItem): string {
  if (i.kind === 'condiment') return amountLabel(i.unit);
  return `${Math.round(i.quantity * 100) / 100} ${i.unit}`;
}

export function ItemsTable({ items }: { items: AnalysedItem[] }) {
  if (items.length === 0) return null;
  return (
    <Card as="section" aria-labelledby="items-title" padding="none" className="overflow-hidden">
      <div className="px-5 pt-5">
        <CardHeader id="items-title" title="Food by food" subtitle="How each food was matched and weighed. Amounts marked “assumed” were not in what you typed." />
      </div>
      <div className="overflow-x-auto">
        <table className="w-full min-w-[720px] text-left text-[13.5px]">
          <caption className="sr-only">Nutrients for each food in this meal</caption>
          <thead className="bg-[#f8fafc] text-[12px] text-muted">
            <tr>
              <th scope="col" className="px-5 py-2.5 font-semibold">Food</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Amount</th>
              <th scope="col" className="px-3 py-2.5 font-semibold">Matched to</th>
              {NUTRIENT_KEYS.map((n) => (
                <th key={n} scope="col" className="px-3 py-2.5 text-right font-semibold">
                  {NUTRIENTS[n].label} ({NUTRIENTS[n].unit})
                </th>
              ))}
            </tr>
          </thead>
          <tbody>
            {items.map((i, idx) => (
              <tr key={`${i.label}-${idx}`} className="border-t border-line align-top">
                <th scope="row" className="px-5 py-3 font-semibold">
                  {i.label}
                  {i.preparation && <span className="block text-[12px] font-normal text-muted">{i.preparation}</span>}
                </th>
                <td className="px-3 py-3">
                  {itemAmount(i)}
                  {i.grams != null && <span className="block text-[12px] text-muted">≈ {fmt(i.grams)} g{i.amountGuessed ? ' · assumed' : ''}</span>}
                </td>
                <td className="px-3 py-3">
                  {i.match ? (
                    <>
                      {i.match.name}
                      <span className="block">
                        <SourceTag kind={i.match.verified ? 'verified' : 'estimated'} detail={i.match.source === 'recipe' ? 'recipe' : undefined} />
                      </span>
                    </>
                  ) : (
                    <span className="text-muted">Not found · not counted</span>
                  )}
                </td>
                {NUTRIENT_KEYS.map((n) => {
                  const v = i.nutrients[n].value;
                  return (
                    <td key={n} className="px-3 py-3 text-right tabular-nums">
                      {v == null ? <span className="text-muted">—</span> : amount(v, NUTRIENTS[n].unit)}
                    </td>
                  );
                })}
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </Card>
  );
}

export function DataQuality({ analysis }: { analysis: MealAnalysis }) {
  const ai = analysis.ai.output?.dataQuality;
  if (!ai && analysis.notes.length === 0) return null;
  return (
    <section role="note" aria-labelledby="dq-title" className="flex flex-col gap-2 rounded-panel border border-[#fde68a] bg-warn-soft px-5 py-4 text-[#78350f]">
      <h2 id="dq-title" className="text-[15px] font-extrabold">
        How sure are these numbers?
      </h2>
      {ai && <p className="text-[14px]">{ai}</p>}
      {analysis.notes.length > 0 && (
        <ul className="list-disc space-y-1 pl-4 text-[13px]">
          {analysis.notes.map((n) => (
            <li key={`${n.code}-${n.nutrient ?? ''}`}>{n.message}</li>
          ))}
        </ul>
      )}
    </section>
  );
}

export function Insights({ analysis }: { analysis: MealAnalysis }) {
  const toast = useToast();
  const out = analysis.ai.output;
  if (!out) return null;
  const { observations, concerns, clinicianQuestions } = out;
  if (!observations.length && !concerns.length && !clinicianQuestions.length) return null;

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(clinicianQuestions.map((q, i) => `${i + 1}. ${q}`).join('\n'));
      toast.success('Questions copied');
    } catch {
      toast.error('Couldn’t copy', 'Select the questions and copy them instead.');
    }
  };

  return (
    <div className="grid gap-5 lg:grid-cols-3">
      {observations.length > 0 && (
        <Card as="section" aria-labelledby="obs-title">
          <CardHeader id="obs-title" title="Observations and ideas" action={<AiLabel status={analysis.ai.status} />} />
          <ul className="list-disc space-y-1.5 pl-4 text-[14px]">
            {observations.map((o) => (
              <li key={o}>{o}</li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-muted">Educational only. Talk to your care team before changing your diet.</p>
        </Card>
      )}
      {concerns.length > 0 && (
        <Card as="section" aria-labelledby="rev-title">
          <CardHeader id="rev-title" title="Worth raising with your care team" />
          <ul className="list-disc space-y-1.5 pl-4 text-[14px]">
            {concerns.map((c) => (
              <li key={c}>{c}</li>
            ))}
          </ul>
          <p className="mt-3 text-[12px] text-muted">These are not alerts or a diagnosis.</p>
        </Card>
      )}
      {clinicianQuestions.length > 0 && (
        <Card as="section" aria-labelledby="q-title">
          <CardHeader id="q-title" title="Questions to ask at your next visit" />
          <ol className="list-decimal space-y-1.5 pl-5 text-[14px]">
            {clinicianQuestions.map((q) => (
              <li key={q}>{q}</li>
            ))}
          </ol>
          <Button variant="secondary" size="sm" className="mt-3" onClick={copy} iconLeft={<Copy className="size-3.5" aria-hidden />}>
            Copy questions
          </Button>
        </Card>
      )}
    </div>
  );
}

export function AnalysisFooter({ analysis, onReanalyse, busy }: { analysis: MealAnalysis; onReanalyse: () => void; busy: boolean }) {
  const { ai } = analysis;
  const by = ai.status === 'ok' ? `Gemini (${ai.model}) · prompt ${ai.promptVersion}` : ai.status === 'mock' ? 'sample rules, not AI' : 'no AI';
  return (
    <div className="flex flex-col gap-3 border-t border-line pt-4 text-[12.5px] text-muted">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-1.5">
        <SourceTag kind="verified" detail="from a food composition table" />
        <SourceTag kind="estimated" detail="recipe, unverified record or assumed amount" />
        <SourceTag kind="ai" detail="text written by Gemini from these numbers" />
      </div>
      <div className="flex flex-wrap items-center gap-3">
        <span>
          Analysed {new Date(analysis.createdAt).toLocaleString('en-PH', { dateStyle: 'medium', timeStyle: 'short' })} · {by} · {analysis.engineVersion}
          {analysis.version > 1 ? ` · version ${analysis.version}` : ''}
        </span>
        <Button variant="ghost" size="sm" onClick={onReanalyse} loading={busy} iconLeft={<RefreshCw className="size-3.5" aria-hidden />}>
          Analyse again
        </Button>
      </div>
      <p>Nutrient values are estimates and may be inaccurate. They do not replace advice from your doctor or dietitian.</p>
    </div>
  );
}
