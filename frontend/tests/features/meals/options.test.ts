import { defaultCategory, summaryOf, whenText } from './options';

const at = (h: number, m = 0) => new Date(2026, 9, 16, h, m);

describe('defaultCategory', () => {
  it.each([
    [6, 'breakfast'],
    [12, 'lunch'],
    [16, 'snack'],
    [20, 'dinner'],
    [1, 'dinner'],
  ] as const)('%i:00 → %s', (h, expected) => {
    expect(defaultCategory(at(h))).toBe(expected);
  });
});

describe('summaryOf', () => {
  const empty = { category: 'lunch' as const, rawText: '', condiments: [], drinks: [], cookingMethods: [], notes: '' };

  it('says when nothing is entered', () => {
    expect(summaryOf(empty)).toBe('Nothing entered yet.');
  });

  it('uses the labels patients see', () => {
    expect(
      summaryOf({
        ...empty,
        rawText: '  1 tasa kanin ',
        condiments: [
          { name: 'toyo_mansi', amount: 'konti' },
          { name: 'bagoong', amount: 'tsp' },
        ],
        drinks: ['buko_juice'],
        cookingMethods: ['adobo'],
        notes: 'shared',
      }),
    ).toBe('1 tasa kanin; with Toyo-mansi (konti), Bagoong (1 tsp); drinks: buko juice; cooked: adobo-style; note: shared.');
  });
});

describe('whenText', () => {
  const now = at(13);
  it('names today and yesterday', () => {
    expect(whenText('breakfast', at(7, 15).toISOString(), now)).toMatch(/^Breakfast · today, 7:15/);
    const y = at(19, 30);
    y.setDate(y.getDate() - 1);
    expect(whenText('dinner', y.toISOString(), now)).toMatch(/^Dinner · yesterday, 7:30/);
  });
});
