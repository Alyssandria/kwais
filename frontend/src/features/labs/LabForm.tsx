import { useEffect, useId, useState, type FormEvent } from 'react';
import { z } from 'zod';
import { Button, Input, Modal, Notice, Select } from '@/components/ui';
import { errorMessage, fieldErrors } from '@/lib/api';
import type { Lab, LabInput, LabTest } from '@/features/profile/api';
import { LAB_TEST_OPTIONS } from '@/features/profile/options';

const today = () => new Date().toISOString().slice(0, 10);
const num = (s: string) => (s.trim() === '' ? null : Number(s));

const labSchema = z
  .object({
    test: z.string(),
    testLabel: z.string().trim().max(60).nullable(),
    value: z.number({ invalid_type_error: 'Enter the result as a number' }).finite().min(0, 'Values cannot be negative'),
    refLow: z.number().finite().min(0).nullable(),
    refHigh: z.number().finite().min(0).nullable(),
    unit: z.string().trim().min(1, 'Enter the unit printed on your slip').max(30),
    collectedOn: z
      .string()
      .regex(/^\d{4}-\d{2}-\d{2}$/, 'Pick the date the sample was taken')
      .refine((d) => d <= today(), 'Date cannot be in the future'),
    labName: z.string().trim().max(120).nullable(),
  })
  .refine((v) => v.test !== 'other' || Boolean(v.testLabel), { path: ['testLabel'], message: 'Name the test' })
  .refine((v) => v.refLow == null || v.refHigh == null || v.refLow <= v.refHigh, {
    path: ['refHigh'],
    message: 'The high end must be above the low end',
  });

interface Draft {
  test: LabTest;
  testLabel: string;
  value: string;
  refLow: string;
  refHigh: string;
  unit: string;
  collectedOn: string;
  labName: string;
}

const emptyDraft = (test: LabTest = 'potassium'): Draft => ({
  test,
  testLabel: '',
  value: '',
  refLow: '',
  refHigh: '',
  unit: LAB_TEST_OPTIONS.find((o) => o.value === test)?.units[0] ?? '',
  collectedOn: today(),
  labName: '',
});

const fromLab = (l: Lab): Draft => ({
  test: l.test,
  testLabel: l.test === 'other' ? l.label : '',
  value: String(l.value),
  refLow: l.refLow == null ? '' : String(l.refLow),
  refHigh: l.refHigh == null ? '' : String(l.refHigh),
  unit: l.unit,
  collectedOn: l.collectedOn,
  labName: l.labName ?? '',
});

export function LabFormModal({
  open,
  editing,
  defaultTest,
  onClose,
  onSave,
  title,
  description = 'Copy the numbers exactly as printed on your lab slip, including the reference range next to the result.',
}: {
  open: boolean;
  editing: Lab | null;
  defaultTest?: LabTest;
  title?: string;
  description?: string;
  onClose: () => void;
  onSave: (input: LabInput) => Promise<unknown>;
}) {
  const [d, setD] = useState<Draft>(emptyDraft(defaultTest));
  const [errs, setErrs] = useState<Record<string, string>>({});
  const [formError, setFormError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const unitListId = useId();

  useEffect(() => {
    if (open) {
      setD(editing ? fromLab(editing) : emptyDraft(defaultTest));
      setErrs({});
      setFormError(null);
    }
  }, [open, editing, defaultTest]);

  const units = LAB_TEST_OPTIONS.find((o) => o.value === d.test)?.units ?? [];
  const set = (k: keyof Draft) => (v: string) => setD((x) => ({ ...x, [k]: v }));
  const decimal = (v: string) => v.replace(/[^\d.]/g, '');

  const submit = async (e: FormEvent) => {
    e.preventDefault();
    const parsed = labSchema.safeParse({
      test: d.test,
      testLabel: d.test === 'other' ? d.testLabel.trim() || null : null,
      value: d.value.trim() === '' ? undefined : Number(d.value),
      refLow: num(d.refLow),
      refHigh: num(d.refHigh),
      unit: d.unit,
      collectedOn: d.collectedOn,
      labName: d.labName.trim() || null,
    });
    if (!parsed.success) {
      const next: Record<string, string> = {};
      for (const i of parsed.error.issues) next[String(i.path[0])] ??= i.message;
      if (d.value.trim() === '') next.value = 'Enter the result';
      setErrs(next);
      return;
    }
    setErrs({});
    setFormError(null);
    setBusy(true);
    try {
      await onSave({ ...parsed.data, test: d.test });
      onClose();
    } catch (err) {
      const f = fieldErrors(err);
      if (Object.keys(f).length) setErrs(f);
      else setFormError(errorMessage(err));
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={onClose}
      size="lg"
      title={title ?? (editing ? `Edit ${editing.label} result` : 'Add a lab result')}
      description={description}
    >
      <form onSubmit={submit} noValidate className="flex flex-col gap-4">
        {formError && (
          <div role="alert">
            <Notice tone="bad">{formError}</Notice>
          </div>
        )}
        <div className="grid gap-4 sm:grid-cols-2">
          <Select
            label="Test"
            value={d.test}
            onChange={(e) => {
              const t = e.target.value as LabTest;
              setD((x) => ({ ...x, test: t, unit: LAB_TEST_OPTIONS.find((o) => o.value === t)?.units[0] ?? x.unit }));
            }}
          >
            {LAB_TEST_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>
                {o.label}
              </option>
            ))}
          </Select>
          {d.test === 'other' ? (
            <Input label="Test name" value={d.testLabel} onChange={(e) => set('testLabel')(e.target.value)} error={errs.testLabel} />
          ) : (
            <Input label="Date collected" type="date" max={today()} value={d.collectedOn} onChange={(e) => set('collectedOn')(e.target.value)} error={errs.collectedOn} />
          )}
          <Input label="Result" inputMode="decimal" value={d.value} onChange={(e) => set('value')(decimal(e.target.value))} error={errs.value} />
          <div className="flex flex-col">
            <Input
              label="Unit"
              list={unitListId}
              value={d.unit}
              onChange={(e) => set('unit')(e.target.value)}
              error={errs.unit}
              hint={units.length ? `Common: ${units.join(', ')}` : undefined}
            />
            <datalist id={unitListId}>
              {units.map((u) => (
                <option key={u} value={u} />
              ))}
            </datalist>
          </div>
          <Input label="Range low" optional inputMode="decimal" value={d.refLow} onChange={(e) => set('refLow')(decimal(e.target.value))} error={errs.refLow} />
          <Input label="Range high" optional inputMode="decimal" value={d.refHigh} onChange={(e) => set('refHigh')(decimal(e.target.value))} error={errs.refHigh} />
          {d.test === 'other' && (
            <Input label="Date collected" type="date" max={today()} value={d.collectedOn} onChange={(e) => set('collectedOn')(e.target.value)} error={errs.collectedOn} />
          )}
          <Input label="Laboratory" optional placeholder="e.g. clinic or hospital lab" value={d.labName} onChange={(e) => set('labName')(e.target.value)} />
        </div>
        <p className="text-[12.5px] text-muted">
          Saved values are encrypted. If a slip shows only one limit (like “above 60”), fill in just that side.
        </p>
        <div className="flex flex-wrap justify-end gap-2.5 border-t border-[#f1f5f9] pt-4">
          <Button variant="secondary" onClick={onClose} disabled={busy}>
            Cancel
          </Button>
          <Button type="submit" variant="accent" loading={busy}>
            {editing ? 'Save changes' : 'Save result'}
          </Button>
        </div>
      </form>
    </Modal>
  );
}
