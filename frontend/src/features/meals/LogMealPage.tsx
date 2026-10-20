import { useEffect, useId, useRef, useState } from 'react';
import { Link, useNavigate, useSearchParams } from 'react-router-dom';
import { Apple, ArrowRight, ChevronLeft, CupSoda, Flame, History, Moon, Sun, Sunrise, UtensilsCrossed } from 'lucide-react';
import { Button, ConfirmDialog, HeroBand, Input, Notice, Segmented, Switch, useToast } from '@/components/ui';
import { errorMessage, fieldErrors } from '@/lib/api';
import { cn } from '@/lib/cn';
import {
  useCreateMeal,
  useDeleteMeal,
  useLatestDraft,
  useMeal,
  useRecentMeals,
  useAnalyseMeal,
  useUpdateMeal,
  type Meal,
  type MealCategory,
  type MealCondiment,
  type MealInput,
  type RecentMeal,
} from './api';
import { ChipGroup, ChipSection, WhenPicker } from './components';
import { ProgressDialog, type ProgressKind, type ProgressStep } from './ProgressDialog';
import { AMOUNTS, CONDIMENTS, COOKING, DRINKS, MEAL_TYPES, condimentLabel, defaultCategory, summaryOf, whenText } from './options';

const MEAL_ICONS = { breakfast: Sunrise, lunch: Sun, dinner: Moon, snack: Apple } as const;

const toggle = (list: string[], v: string) => (list.includes(v) ? list.filter((x) => x !== v) : [...list, v]);

export function LogMealPage() {
  const navigate = useNavigate();
  const toast = useToast();
  const [params, setParams] = useSearchParams();
  const textId = useId();
  const textHintId = useId();
  const textErrorId = useId();
  const textRef = useRef<HTMLTextAreaElement>(null);

  const [eatenAt, setEatenAt] = useState(() => new Date());
  const [category, setCategory] = useState<MealCategory>(() => defaultCategory(new Date()));
  const [rawText, setRawText] = useState('');
  const [condiments, setCondiments] = useState<MealCondiment[]>([]);
  const [drinks, setDrinks] = useState<string[]>([]);
  const [cookingMethods, setCookingMethods] = useState<string[]>([]);
  const [notes, setNotes] = useState('');
  const [analyse, setAnalyse] = useState(true);

  const [draftId, setDraftId] = useState<string | null>(params.get('draft'));
  const [draftSavedAt, setDraftSavedAt] = useState<Date | null>(null);
  const [draftOfferDismissed, setDraftOfferDismissed] = useState(false);
  const [confirmDiscard, setConfirmDiscard] = useState(false);
  const [textError, setTextError] = useState<string | null>(null);
  const [formError, setFormError] = useState<string | null>(null);
  const [announce, setAnnounce] = useState('');
  const [progress, setProgress] = useState<ProgressKind | null>(null);
  const [step, setStep] = useState<ProgressStep | null>(null);

  const recent = useRecentMeals();
  const latestDraft = useLatestDraft();
  const draftFromUrl = useMeal(params.get('draft') ?? undefined);
  const createMeal = useCreateMeal();
  const updateMeal = useUpdateMeal();
  const deleteMeal = useDeleteMeal();
  const analyseMeal = useAnalyseMeal();
  const busy = createMeal.isPending || updateMeal.isPending;

  const fillFrom = (m: Pick<Meal, 'category' | 'rawText' | 'condiments' | 'drinks' | 'cookingMethods'> & { notes?: string | null }) => {
    setCategory(m.category);
    setRawText(m.rawText);
    setCondiments(m.condiments.map((c) => ({ name: c.name, amount: c.amount })));
    setDrinks(m.drinks);
    setCookingMethods(m.cookingMethods);
    if (m.notes !== undefined) setNotes(m.notes ?? '');
    setTextError(null);
  };

  const loadedDraft = useRef<string | null>(null);
  useEffect(() => {
    const d = draftFromUrl.data;
    if (d && d.status === 'draft' && loadedDraft.current !== d.id) {
      loadedDraft.current = d.id;
      fillFrom(d);
      setEatenAt(new Date(d.eatenAt));
      setDraftId(d.id);
    }
  }, [draftFromUrl.data]);

  const form = { category, rawText, condiments, drinks, cookingMethods, notes };
  const isEmpty = summaryOf(form) === 'Nothing entered yet.';
  const mealWord = MEAL_TYPES.find((m) => m.value === category)!.label.toLowerCase();
  const offerDraft = !draftId && !draftOfferDismissed && isEmpty && latestDraft.data ? latestDraft.data : null;

  const payload = (status: 'draft' | 'saved'): MealInput => ({
    category,
    eatenAt: eatenAt.toISOString(),
    rawText: rawText.trim(),
    condiments,
    drinks,
    cookingMethods,
    notes: notes.trim() || null,
    status,
    analyse: false,
  });

  const persist = async (status: 'draft' | 'saved'): Promise<Meal> => {
    const input = payload(status);
    return draftId ? updateMeal.mutateAsync({ id: draftId, input }) : createMeal.mutateAsync(input);
  };

  const showServerError = (err: unknown) => {
    const fields = fieldErrors(err);
    if (fields.rawText) {
      setTextError(fields.rawText);
      textRef.current?.focus();
    }
    setFormError(errorMessage(err));
  };

  const saveDraft = async () => {
    setFormError(null);
    try {
      const m = await persist('draft');
      setDraftId(m.id);
      setDraftSavedAt(new Date());
      loadedDraft.current = m.id;
      if (!params.get('draft')) setParams({ draft: m.id }, { replace: true });
    } catch (err) {
      showServerError(err);
    }
  };

  const save = async () => {
    setFormError(null);
    if (rawText.trim().length < 2) {
      setTextError('Tell us what you ate');
      textRef.current?.focus();
      return;
    }
    setProgress(analyse ? 'analyse' : 'save');
    setStep('saving');
    let saved: Meal;
    try {
      saved = await persist('saved');
    } catch (err) {
      setProgress(null);
      showServerError(err);
      return;
    }
    try {
      if (analyse) {
        await analyseMeal.mutateAsync({ id: saved.id, onStep: setStep });
        navigate(`/patient/meals/${saved.id}`);
      } else {
        toast.success('Meal saved', 'Added to your log without analysis. You can analyse it later.');
        navigate('/patient/dashboard');
      }
    } catch (err) {
      toast.error('Saved, but not analysed', errorMessage(err));
      navigate(`/patient/meals/${saved.id}`);
    }
  };

  const discardDraft = async () => {
    if (!offerDraft) return;
    try {
      await deleteMeal.mutateAsync(offerDraft.id);
    } finally {
      setConfirmDiscard(false);
      setDraftOfferDismissed(true);
    }
  };

  const logAgain = (r: RecentMeal) => {
    fillFrom(r);
    setAnnounce(`Filled in from ${whenText(r.category, r.eatenAt)}. Check the time before saving.`);
    textRef.current?.focus();
  };

  const toggleCondiment = (name: string) =>
    setCondiments((cs) => (cs.some((c) => c.name === name) ? cs.filter((c) => c.name !== name) : [...cs, { name, amount: 'konti' }]));
  const setAmount = (name: string, amount: MealCondiment['amount']) =>
    setCondiments((cs) => cs.map((c) => (c.name === name ? { ...c, amount } : c)));

  return (
    <div className="mx-auto flex max-w-[920px] flex-col gap-5 pb-4">
      <div className="flex flex-wrap items-center gap-4">
        <Link to="/patient/dashboard" className="inline-flex min-h-11 items-center gap-2 font-semibold no-underline">
          <ChevronLeft className="size-[18px]" aria-hidden />
          Back to dashboard
        </Link>
        <p className="ml-auto text-[12.5px] text-muted" aria-live="polite">
          {draftSavedAt && `Draft saved ${draftSavedAt.toLocaleTimeString('en-PH', { hour: 'numeric', minute: '2-digit' })}`}
        </p>
      </div>

      {offerDraft && (
        <Notice tone="info" title="You have an unfinished draft">
          <p>
            {whenText(offerDraft.category, offerDraft.eatenAt)}
            {offerDraft.rawText && <>: “{offerDraft.rawText}”</>}
          </p>
          <div className="mt-2 flex flex-wrap gap-2">
            <Button size="sm" onClick={() => setParams({ draft: offerDraft.id })}>
              Continue draft
            </Button>
            <Button size="sm" variant="secondary" onClick={() => setConfirmDiscard(true)}>
              Discard draft
            </Button>
          </div>
        </Notice>
      )}

      <HeroBand>
        <div className="flex flex-col gap-5">
          <div className="flex flex-col items-start gap-1.5">
            <WhenPicker value={eatenAt} onChange={setEatenAt} />
            <h1 className="text-[26px] font-extrabold tracking-tight sm:text-[30px]">What did you have for {mealWord}?</h1>
          </div>

          <div role="radiogroup" aria-label="Meal" className="grid grid-cols-2 gap-2.5 md:grid-cols-4">
            {MEAL_TYPES.map((m) => {
              const on = m.value === category;
              const Icon = MEAL_ICONS[m.value];
              return (
                <button
                  key={m.value}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  onClick={() => setCategory(m.value)}
                  className={cn(
                    'flex min-h-[60px] cursor-pointer items-center gap-3 rounded-[16px] border-2 px-3.5 py-2.5 text-left',
                    on ? 'border-accent bg-white text-primary-dark' : 'border-[#2a8c96] bg-[#0a6b76] text-white',
                  )}
                >
                  <Icon className="size-[22px] shrink-0" aria-hidden />
                  <span className="flex flex-col">
                    <span className="text-[14.5px] font-bold">{m.label}</span>
                    <span className="text-[11.5px] opacity-80">{m.hint}</span>
                  </span>
                </button>
              );
            })}
          </div>

          <div className="flex flex-col gap-2.5 rounded-[18px] bg-white p-4 pb-3 text-ink shadow-[0_8px_24px_rgba(4,47,52,.25)]">
            <label htmlFor={textId} className="text-[12px] font-bold tracking-[0.04em] text-primary-dark uppercase">
              What you ate · English, Tagalog or Taglish
            </label>
            <textarea
              ref={textRef}
              id={textId}
              rows={3}
              value={rawText}
              maxLength={1000}
              onChange={(e) => {
                setRawText(e.target.value);
                if (textError) setTextError(null);
              }}
              aria-invalid={textError ? true : undefined}
              aria-describedby={cn(textHintId, textError && textErrorId)}
              placeholder="e.g. 1 tasa kanin, isang hita ng inihaw na manok, kalahating tasa pinakbet"
              className="resize-none border-0 bg-transparent p-0 text-[17px] leading-normal outline-none placeholder:text-[#94a3b8] sm:text-[18px]"
            />
            {textError && (
              <p id={textErrorId} className="text-[13px] font-semibold text-bad">
                {textError}
              </p>
            )}
            <p id={textHintId} className="border-t border-[#f1f5f9] pt-2.5 text-[12px] text-muted">
              Tip: amounts help, like tasa, sandok, piraso or mangkok. Add sauces and drinks below.
            </p>
          </div>

          {recent.data && recent.data.length > 0 && (
            <div className="flex flex-col gap-2">
              <p id="again-title" className="text-[12.5px] font-semibold text-[#bfe3df]">
                Eat this before? Log it again
              </p>
              <ul aria-labelledby="again-title" className="grid gap-2 sm:grid-cols-3">
                {recent.data.slice(0, 3).map((r) => (
                  <li key={r.mealId}>
                    <button
                      type="button"
                      onClick={() => logAgain(r)}
                      className="flex min-h-[52px] w-full cursor-pointer items-center gap-2.5 rounded-[14px] border border-[#2a8c96] bg-[#0a6b76] px-3 py-2 text-left text-white"
                    >
                      <History className="size-[18px] shrink-0 text-accent" aria-hidden />
                      <span className="flex min-w-0 flex-col">
                        <span className="truncate text-[13px] font-semibold">{r.rawText}</span>
                        <span className="text-[11.5px] text-[#bfe3df]">{whenText(r.category, r.eatenAt)}</span>
                      </span>
                    </button>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      </HeroBand>
      <p className="sr-only" aria-live="polite">
        {announce}
      </p>

      <ChipSection
        id="cond-title"
        icon={<UtensilsCrossed className="size-[22px]" />}
        tile="bg-sodium-soft text-sodium"
        title="Sawsawan and condiments"
        hint="Easy to forget, but they often carry most of a meal’s sodium. Tap any you used."
      >
        <ChipGroup label="Condiments" options={CONDIMENTS} selected={condiments.map((c) => c.name)} onToggle={toggleCondiment} />
        {condiments.length > 0 && (
          <div className="flex flex-col gap-2 rounded-card bg-[#f8fafc] p-3">
            <p className="text-[12.5px] font-bold text-[#475569]">How much?</p>
            {condiments.map((c) => (
              <div key={c.name} className="flex flex-wrap items-center gap-2.5">
                <span className="min-w-[110px] font-bold">{condimentLabel(c.name)}</span>
                <Segmented
                  label={`Amount of ${condimentLabel(c.name)}`}
                  value={c.amount}
                  options={AMOUNTS}
                  onChange={(a) => setAmount(c.name, a)}
                />
              </div>
            ))}
          </div>
        )}
      </ChipSection>

      <div className="grid gap-5 md:grid-cols-2">
        <ChipSection
          id="drink-title"
          icon={<CupSoda className="size-[22px]" />}
          tile="bg-phosphorus-soft text-phosphorus"
          title="Drinks"
          hint="Some drinks add phosphorus or potassium."
        >
          <ChipGroup label="Drinks" options={DRINKS} selected={drinks} onToggle={(v) => setDrinks((d) => toggle(d, v))} />
        </ChipSection>
        <ChipSection
          id="cook-title"
          icon={<Flame className="size-[22px]" />}
          tile="bg-protein-soft text-protein"
          title="How was it cooked?"
          optional
          hint="Pick all that apply."
        >
          <ChipGroup
            label="Cooking methods"
            options={COOKING}
            selected={cookingMethods}
            onToggle={(v) => setCookingMethods((k) => toggle(k, v))}
          />
        </ChipSection>
      </div>

      <Input
        label="Note"
        optional
        value={notes}
        maxLength={300}
        onChange={(e) => setNotes(e.target.value)}
        placeholder="e.g. ate at a carinderia, shared the pinakbet"
      />

      <section aria-labelledby="sum-title" className="flex flex-col gap-1.5 rounded-panel border border-[#fed7aa] bg-[#fff7ed] px-5 py-[18px]">
        <h2 id="sum-title" className="text-sm font-extrabold text-[#9a3412]">
          Check before saving
        </h2>
        <p className="text-[15px]">
          <strong>{MEAL_TYPES.find((m) => m.value === category)!.label}:</strong> {summaryOf(form)}
        </p>
        <p className="text-[12.5px] text-[#7c2d12]">
          This is exactly what will be saved
          {analyse ? ', then K-WAIS matches each food to the food tables and estimates its nutrients.' : ' to your history. No analysis.'}
        </p>
      </section>

      {formError && (
        <div role="alert">
          <Notice tone="bad" title="Not saved">
            {formError}
          </Notice>
        </div>
      )}

      <div className="sticky bottom-[80px] z-20 rounded-panel bg-primary-deep p-3 text-white shadow-pop md:bottom-4 md:px-5 md:py-4">
        <div className="flex flex-wrap items-center gap-3 md:gap-4">
          <Switch
            tone="dark"
            checked={analyse}
            onChange={setAnalyse}
            label="Analyse with AI"
            description={analyse ? 'On · nutrients and a score' : 'Off · just save it to my log'}
          />
          <p className="hidden max-w-[340px] text-[12.5px] text-[#d7eeeb] lg:block">
            {analyse
              ? 'Compared only with the targets and lab results you entered. Nothing else is assumed.'
              : 'Counts toward your history and streak. You can analyse it later.'}
          </p>
          <div className="ml-auto flex flex-wrap items-center gap-2.5">
            <Button variant="ghost" onClick={saveDraft} disabled={busy || isEmpty} className="text-[#cfe7e4] underline hover:bg-white/10">
              Save as draft
            </Button>
            <Button variant="accent" size="lg" onClick={save} loading={busy} iconRight={<ArrowRight className="size-[18px]" aria-hidden />}>
              {analyse ? 'Save and analyse' : 'Save meal'}
            </Button>
          </div>
        </div>
      </div>

      <ProgressDialog kind={progress} step={step} title={progress === 'save' ? 'Saving your meal' : `Analysing your ${mealWord}`} />

      <ConfirmDialog
        open={confirmDiscard}
        title="Discard this draft?"
        description="The unfinished meal will be removed from your drafts."
        confirmLabel="Discard draft"
        destructive
        loading={deleteMeal.isPending}
        onConfirm={discardDraft}
        onCancel={() => setConfirmDiscard(false)}
      />
    </div>
  );
}
