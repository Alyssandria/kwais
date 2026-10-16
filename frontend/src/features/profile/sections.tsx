import { useState, type FormEvent, type ReactNode } from 'react';
import { Info } from 'lucide-react';
import { Button, Input, Notice, RadioCards, Select, Switch, TagPicker } from '@/components/ui';
import { NutrientIcon } from '@/components/domain/NutrientIcon';
import { errorMessage } from '@/lib/api';
import { NUTRIENT_KEYS, NUTRIENTS, type NutrientKey } from '@/lib/nutrition';
import type { CkdStage, Consents, Dialysis, Profile, ProfilePatch, Sex, Target } from './api';
import {
  ALLERGY_SUGGESTIONS,
  CKD_STAGE_OPTIONS,
  DIALYSIS_OPTIONS,
  PREFERENCE_SUGGESTIONS,
  RESTRICTION_SUGGESTIONS,
  SEX_OPTIONS,
} from './options';

interface SectionProps<T> {
  onSubmit: (value: T) => Promise<unknown>;
  submitLabel: string;
  actions?: ReactNode;
}

function useSubmit<T>(onSubmit: (v: T) => Promise<unknown>) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const run = async (v: T) => {
    setBusy(true);
    setError(null);
    try {
      await onSubmit(v);
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };
  return { busy, error, run };
}

function Footer({ busy, submitLabel, actions, error }: { busy: boolean; submitLabel: string; actions?: ReactNode; error: string | null }) {
  return (
    <>
      {error && (
        <div role="alert">
          <Notice tone="bad">{error}</Notice>
        </div>
      )}
      <div className="flex flex-wrap items-center justify-end gap-2.5 border-t border-[#f1f5f9] pt-4">
        {actions}
        <Button type="submit" variant="accent" loading={busy}>
          {submitLabel}
        </Button>
      </div>
    </>
  );
}

export function AboutYouSection({ profile, ...p }: SectionProps<ProfilePatch> & { profile: Profile }) {
  const [firstName, setFirstName] = useState(profile.firstName);
  const [lastName, setLastName] = useState(profile.lastName);
  const [birthYear, setBirthYear] = useState(profile.birthYear ? String(profile.birthYear) : '');
  const [sex, setSex] = useState<Sex | ''>(profile.sex ?? '');
  const [fieldError, setFieldError] = useState<Record<string, string>>({});
  const { busy, error, run } = useSubmit(p.onSubmit);
  const year = new Date().getFullYear();

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const errs: Record<string, string> = {};
    if (!firstName.trim()) errs.firstName = 'Enter your first name';
    if (!lastName.trim()) errs.lastName = 'Enter your last name';
    const by = birthYear ? Number(birthYear) : null;
    if (by !== null && (!Number.isInteger(by) || by < year - 120 || by > year)) errs.birthYear = `Enter a year between ${year - 120} and ${year}`;
    setFieldError(errs);
    if (Object.keys(errs).length) return;
    void run({ firstName: firstName.trim(), lastName: lastName.trim(), birthYear: by, sex: sex || null });
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <div className="grid gap-4 sm:grid-cols-2">
        <Input label="First name" value={firstName} onChange={(e) => setFirstName(e.target.value)} error={fieldError.firstName} autoComplete="given-name" />
        <Input label="Last name" value={lastName} onChange={(e) => setLastName(e.target.value)} error={fieldError.lastName} autoComplete="family-name" />
        <Input
          label="Year of birth"
          optional
          inputMode="numeric"
          maxLength={4}
          placeholder="e.g. 1972"
          value={birthYear}
          onChange={(e) => setBirthYear(e.target.value.replace(/\D/g, ''))}
          error={fieldError.birthYear}
          hint="We only keep the year."
        />
        <Select label="Sex" optional value={sex} onChange={(e) => setSex(e.target.value as Sex | '')}>
          <option value="">Not specified</option>
          {SEX_OPTIONS.map((o) => (
            <option key={o.value} value={o.value}>
              {o.label}
            </option>
          ))}
        </Select>
      </div>
      <Footer busy={busy} submitLabel={p.submitLabel} actions={p.actions} error={error} />
    </form>
  );
}

export function DietSection({ profile, ...p }: SectionProps<ProfilePatch> & { profile: Profile }) {
  const [restrictions, setRestrictions] = useState(profile.restrictions);
  const [allergies, setAllergies] = useState(profile.allergies);
  const [preferences, setPreferences] = useState(profile.dietaryPreferences);
  const { busy, error, run } = useSubmit(p.onSubmit);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run({ restrictions, allergies, dietaryPreferences: preferences });
      }}
      className="flex flex-col gap-6"
    >
      <TagPicker
        label="Restrictions from your care team"
        hint="Only what your doctor or dietitian told you. Meal scores check meals against these."
        value={restrictions}
        onChange={setRestrictions}
        suggestions={RESTRICTION_SUGGESTIONS}
      />
      <TagPicker label="Food allergies" value={allergies} onChange={setAllergies} suggestions={ALLERGY_SUGGESTIONS} />
      <TagPicker label="Dietary preferences" value={preferences} onChange={setPreferences} suggestions={PREFERENCE_SUGGESTIONS} />
      <Footer busy={busy} submitLabel={p.submitLabel} actions={p.actions} error={error} />
    </form>
  );
}

export function KidneySection({ profile, ...p }: SectionProps<ProfilePatch> & { profile: Profile }) {
  const [stage, setStage] = useState<CkdStage | null>(profile.ckdStage?.value ?? null);
  const [dialysis, setDialysis] = useState<Dialysis>(profile.dialysisStatus);
  const { busy, error, run } = useSubmit(p.onSubmit);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run({ ckdStage: stage, dialysisStatus: dialysis });
      }}
      className="flex flex-col gap-6"
    >
      <Notice>
        Enter only what your doctor has told you. K-WAIS never works out a CKD stage from your answers or lab results.
      </Notice>
      <RadioCards legend="CKD stage" name="ckd-stage" value={stage} onChange={setStage} options={CKD_STAGE_OPTIONS} columns={3} />
      {stage && (
        <button type="button" onClick={() => setStage(null)} className="-mt-3 self-start text-[13px] font-semibold text-primary-dark underline">
          Clear stage
        </button>
      )}
      <RadioCards legend="Dialysis" name="dialysis" value={dialysis} onChange={setDialysis} options={DIALYSIS_OPTIONS} columns={2} />
      {profile.ckdStage?.source === 'clinician_verified' && (
        <p className="flex items-center gap-1.5 text-[12.5px] text-muted">
          <Info className="size-3.5" aria-hidden />
          Your clinician verified your stage. Changing it here marks it as entered by you.
        </p>
      )}
      <Footer busy={busy} submitLabel={p.submitLabel} actions={p.actions} error={error} />
    </form>
  );
}

export type TargetChanges = Partial<Record<NutrientKey, number | null>>;

export function TargetsSection({ targets, ...p }: SectionProps<TargetChanges> & { targets: Target[] }) {
  const initial = Object.fromEntries(
    NUTRIENT_KEYS.map((n) => [n, targets.find((t) => t.nutrient === n)?.dailyMax?.toString() ?? '']),
  ) as Record<NutrientKey, string>;
  const [values, setValues] = useState(initial);
  const [errs, setErrs] = useState<Partial<Record<NutrientKey, string>>>({});
  const { busy, error, run } = useSubmit(p.onSubmit);

  const submit = (e: FormEvent) => {
    e.preventDefault();
    const changes: TargetChanges = {};
    const nextErrs: Partial<Record<NutrientKey, string>> = {};
    for (const n of NUTRIENT_KEYS) {
      const raw = values[n].trim();
      if (raw === initial[n]) continue;
      if (raw === '') {
        changes[n] = null;
        continue;
      }
      const num = Number(raw);
      if (!Number.isFinite(num) || num <= 0) nextErrs[n] = 'Enter an amount above zero, or leave it blank';
      else changes[n] = num;
    }
    setErrs(nextErrs);
    if (Object.keys(nextErrs).length) return;
    void run(changes);
  };

  return (
    <form onSubmit={submit} noValidate className="flex flex-col gap-4">
      <Notice>
        Use the daily amounts your doctor or dietitian gave you. Leave a nutrient blank if you don’t have one; K-WAIS
        will show the estimate without judging it.
      </Notice>
      <div className="grid gap-4 sm:grid-cols-2">
        {NUTRIENT_KEYS.map((n) => (
          <div key={n} className="flex items-end gap-3">
            <NutrientIcon nutrient={n} />
            <Input
              containerClassName="flex-1"
              label={`${NUTRIENTS[n].label}, daily maximum (${NUTRIENTS[n].unit})`}
              inputMode="decimal"
              placeholder="No target"
              value={values[n]}
              onChange={(e) => setValues((v) => ({ ...v, [n]: e.target.value.replace(/[^\d.]/g, '') }))}
              error={errs[n]}
            />
          </div>
        ))}
      </div>
      <Footer busy={busy} submitLabel={p.submitLabel} actions={p.actions} error={error} />
    </form>
  );
}

export interface PreferenceValues {
  aiProcessing: boolean;
  reminders: boolean;
  reminderTime: string | null;
}

export function PreferencesSection({ consents, profile, ...p }: SectionProps<PreferenceValues> & { consents: Consents; profile: Profile }) {
  const [ai, setAi] = useState(consents.ai_processing?.granted ?? false);
  const [reminders, setReminders] = useState(consents.reminders?.granted ?? false);
  const [time, setTime] = useState(profile.reminderTime ?? '19:00');
  const { busy, error, run } = useSubmit(p.onSubmit);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        void run({ aiProcessing: ai, reminders, reminderTime: reminders ? time : null });
      }}
      className="flex flex-col gap-5"
    >
      <div className="flex flex-col gap-2">
        <Switch
          checked={ai}
          onChange={setAi}
          label="Allow AI meal analysis"
          description={ai ? 'On' : 'Off: meals are saved without analysis'}
        />
        <p className="text-[12.5px] text-muted">
          When you analyse a meal, its description and the targets, restrictions and lab values needed for the
          analysis are sent to Google’s Gemini AI service, without your name or email. You can turn this off at any
          time.
        </p>
      </div>
      <div className="flex flex-col gap-2">
        <Switch checked={reminders} onChange={setReminders} label="Daily logging reminder" description={reminders ? 'On' : 'Off'} />
        {reminders && (
          <Input
            containerClassName="max-w-[200px]"
            label="Remind me if nothing is logged by"
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
          />
        )}
      </div>
      <Footer busy={busy} submitLabel={p.submitLabel} actions={p.actions} error={error} />
    </form>
  );
}
