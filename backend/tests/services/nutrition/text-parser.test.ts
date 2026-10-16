import { describe, expect, it } from 'vitest';
import { parseMealText } from '../../../src/services/nutrition/text-parser.js';
import { parseAmountToken, toUnit } from '../../../src/services/nutrition/units.js';

describe('amounts and units', () => {
  it.each([
    ['2', 2],
    ['1.5', 1.5],
    ['1/2', 0.5],
    ['½', 0.5],
    ['1½', 1.5],
    ['isang', 1],
    ['dalawang', 2],
    ['kalahating', 0.5],
    ['half', 0.5],
    ['kanin', null],
  ])('reads %s as %s', (token, value) => {
    expect(parseAmountToken(token)).toBe(value);
  });

  it('maps English, Tagalog and the -ng linker to one unit', () => {
    expect(toUnit('cups')).toBe('tasa');
    expect(toUnit('tasang')).toBe('tasa');
    expect(toUnit('hita')).toBe('piraso');
    expect(toUnit('kutsara')).toBe('tbsp');
    expect(toUnit('kanin')).toBeNull();
  });
});

describe('parseMealText', () => {
  it('reads the approved design example', () => {
    expect(parseMealText('1 tasa kanin, isang hita ng inihaw na manok, kalahating tasa pinakbet')).toEqual([
      { label: 'kanin', quantity: 1, unit: 'tasa', preparation: null, quantityGiven: true },
      { label: 'inihaw na manok', quantity: 1, unit: 'piraso', preparation: 'grilled', quantityGiven: true },
      { label: 'pinakbet', quantity: 0.5, unit: 'tasa', preparation: null, quantityGiven: true },
    ]);
  });

  it('treats a bare number as a count and no number as "amount not given"', () => {
    expect(parseMealText('2 pandesal at scrambled egg')).toEqual([
      { label: 'pandesal', quantity: 2, unit: null, preparation: null, quantityGiven: true },
      { label: 'scrambled egg', quantity: 1, unit: null, preparation: null, quantityGiven: false },
    ]);
  });

  it('attaches a lone preparation word to the item before it', () => {
    expect(parseMealText('1 mansanas, hiniwa')).toEqual([
      { label: 'mansanas', quantity: 1, unit: null, preparation: 'sliced', quantityGiven: true },
    ]);
  });

  it.each([
    ['half a cup of rice', { label: 'rice', quantity: 0.5, unit: 'tasa' }],
    ['kanin (2 cups)', { label: 'kanin', quantity: 2, unit: 'tasa' }],
    ['1 1/2 tasa kanin', { label: 'kanin', quantity: 1.5, unit: 'tasa' }],
    ['200g tilapia', { label: 'tilapia', quantity: 200, unit: 'g' }],
    ['200 g pritong tilapia', { label: 'pritong tilapia', quantity: 200, unit: 'g', preparation: 'fried' }],
    ['isang tasang kanin', { label: 'kanin', quantity: 1, unit: 'tasa' }],
    ['Isang mangkok na sinigang', { label: 'sinigang', quantity: 1, unit: 'mangkok' }],
  ])('reads "%s"', (text, expected) => {
    const [item] = parseMealText(text);
    expect(item).toMatchObject({ ...expected, quantityGiven: true });
  });

  it('splits on Tagalog and English joining words', () => {
    expect(parseMealText('kanin at adobo saka sabaw\nkape + pandesal').map((i) => i.label)).toEqual([
      'kanin',
      'adobo',
      'sabaw',
      'kape',
      'pandesal',
    ]);
  });

  it('returns nothing for empty or amount-only text', () => {
    expect(parseMealText('')).toEqual([]);
    expect(parseMealText(' , ; ')).toEqual([]);
    expect(parseMealText('2 tasa')).toEqual([]);
  });
});
