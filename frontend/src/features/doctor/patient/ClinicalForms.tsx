import { useEffect, useState, type FormEvent } from 'react';
import { Button, Input, Modal, Notice, Select, Textarea } from '@/components/ui';
import { CKD_STAGE_OPTIONS } from '@/features/profile/options';
import type { CkdStage, Target } from '@/features/profile/api';
import { errorMessage, fieldErrors } from '@/lib/api';
import { NUTRIENTS, NUTRIENT_KEYS, type NutrientKey } from '@/lib/nutrition';

export type DefiniteStage = Exclude<CkdStage, 'not_sure'>;
export const STAGES = CKD_STAGE_OPTIONS.filter((o): o is { value: DefiniteStage; label: string } => o.value !== 'not_sure');

function Actions({ busy, label, onCancel }: { busy: boolean; label: string; onCancel: () => void }) {
  return (
    <div className="flex justify-end gap-2.5 pt-1">
      <Button variant="secondary" onClick={onCancel}>
        Cancel
      </Button>
      <Button type="submit" loading={busy}>
        {label}
      </Button>
    </div>
  );
}

export function StageModal({
  open,
  current,
  onClose,
  onSave,
}: {
  open: boolean;
  current: CkdStage | null;
  onClose: () => void;
  onSave: (stage: DefiniteStage) => Promise<unknown>;
}) {
  const [stage, setStage] = useState<DefiniteStage | ''>('');
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setStage(current && current !== 'not_sure' ? current : '');
      setError(null);
    }
  }, [open, current]);

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    if (!stage) return setError('Choose a stage');
    setBusy(true);
    try {
      await onSave(stage);
      onClose();
    } catch (err) {
      setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal open={open} onClose={onClose} title="Set CKD stage" description="The stage is marked as verified by you, and the patient is told.">
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {error && (
          <div role="alert">
            <Notice tone="bad">{error}</Notice>
          </div>
        )}
        <Select label="CKD stage" value={stage} onChange={(e) => setStage(e.target.value as DefiniteStage)}>
          <option value="">Choose a stage</option>
          {STAGES.map((s) => (
            <option key={s.value} value={s.value}>
              {s.label}
            </option>
          ))}
        </Select>
        <Actions busy={busy} label="Save stage" onCancel={onClose} />
      </form>
    </Modal>
  );
}

export function TargetModal({
  open,
  editing,
  existing,
  onClose,
  onSave,
}: {
  open: boolean;
  editing: Target | null;
  existing: Target[];
  onClose: () => void;
  onSave: (v: { nutrient: NutrientKey; dailyMax: number; note: string | null }) => Promise<unknown>;
}) {
  const firstFree = NUTRIENT_KEYS.find((n) => !existing.some((t) => t.nutrient === n)) ?? 'sodium';
  const [nutrient, setNutrient] = useState<NutrientKey>(firstFree);
  const [amount, setAmount] = useState('');
  const [note, setNote] = useState('');
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    if (open) {
      setNutrient(editing?.nutrient ?? firstFree);
      setAmount(editing ? String(editing.dailyMax) : '');
      setNote(editing?.note ?? '');
      setErrs({});
      setError(null);
    }
  }, [open, editing, firstFree]);

  const unit = NUTRIENTS[nutrient].unit;

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const dailyMax = Number(amount);
    if (amount.trim() === '' || !Number.isFinite(dailyMax) || dailyMax <= 0) return setErrs({ dailyMax: 'Enter an amount above zero' });
    setErrs({});
    setBusy(true);
    try {
      await onSave({ nutrient, dailyMax, note: note.trim() || null });
      onClose();
    } catch (err) {
      const f = fieldErrors(err);
      if (Object.keys(f).length) setErrs(f);
      else setError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      title={editing ? `Change ${NUTRIENTS[editing.nutrient].label.toLowerCase()} target` : 'Set a daily target'}
      description="New meal analyses use it. Past scores stay as they were. The patient is told, and the target is marked as verified by you."
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {error && (
          <div role="alert">
            <Notice tone="bad">{error}</Notice>
          </div>
        )}
        {!editing && (
          <Select label="Nutrient" value={nutrient} onChange={(e) => setNutrient(e.target.value as NutrientKey)}>
            {NUTRIENT_KEYS.map((n) => (
              <option key={n} value={n}>
                {NUTRIENTS[n].label}
                {existing.some((t) => t.nutrient === n) ? ' (replaces the current target)' : ''}
              </option>
            ))}
          </Select>
        )}
        <Input
          label={`Daily maximum (${unit})`}
          inputMode="decimal"
          value={amount}
          onChange={(e) => setAmount(e.target.value.replace(/[^\d.]/g, ''))}
          error={errs.dailyMax}
        />
        <Textarea label="Note for the patient" optional maxLength={200} value={note} onChange={(e) => setNote(e.target.value)} error={errs.note} hint="Shown with the target, up to 200 characters." />
        <Actions busy={busy} label="Save target" onCancel={onClose} />
      </form>
    </Modal>
  );
}
