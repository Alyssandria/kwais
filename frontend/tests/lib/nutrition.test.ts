import { labStatus, percentOfTarget, rangeText, targetStatus, targetStatusText } from '@/lib/nutrition';

describe('targets', () => {
  it('never judges a nutrient without a target', () => {
    expect(percentOfTarget(2060, null)).toBeNull();
    expect(targetStatus(null)).toBe('none');
    expect(targetStatusText(null)).toBe('Estimate only · no target set');
  });

  it('bands percentages', () => {
    expect(targetStatus(percentOfTarget(1135, 2000))).toBe('within');
    expect(targetStatus(percentOfTarget(44, 50))).toBe('near');
    expect(targetStatus(percentOfTarget(2000, 2000))).toBe('near');
    expect(targetStatus(percentOfTarget(2060, 2000))).toBe('above');
  });
});

describe('lab status', () => {
  it('compares only with the range the patient entered', () => {
    expect(labStatus(5.6, 3.5, 5.1)).toBe('above');
    expect(labStatus(38, 60, null)).toBe('below');
    expect(labStatus(139, 135, 145)).toBe('within');
    expect(labStatus(1.2, null, null)).toBe('none');
  });

  it('describes ranges', () => {
    expect(rangeText(3.5, 5.1)).toBe('3.5–5.1');
    expect(rangeText(60, null)).toBe('above 60');
    expect(rangeText(null, null)).toBe('not entered');
  });
});
