import { describe, expect, it } from 'vitest';
import { parseFoodCsv, splitCsv } from './food-csv.js';

const HEADER = 'source,source_ref,name,local_names,category,sodium_mg,potassium_mg,phosphorus_mg,protein_g,verified,portions';

describe('splitCsv', () => {
  it('handles quotes, escaped quotes and CRLF', () => {
    expect(splitCsv('a,"b, c","say ""hi"""\r\n1,2,3\r\n')).toEqual([
      ['a', 'b, c', 'say "hi"'],
      ['1', '2', '3'],
    ]);
  });
});

describe('parseFoodCsv', () => {
  it('reads a PhilFCT record, keeping blanks as "not reported"', () => {
    const { rows, errors } = parseFoodCsv(
      `${HEADER}\nPH_FCT,D173,"Spinach, Philippine, leaves",Alugbati|spinach,vegetable,16,557,,2.7,true,tasa=30`,
    );
    expect(errors).toEqual([]);
    expect(rows[0]).toEqual({
      source: 'PH_FCT',
      sourceRef: 'D173',
      name: 'Spinach, Philippine, leaves',
      localNames: ['alugbati', 'spinach'],
      category: 'vegetable',
      sodiumMg: 16,
      potassiumMg: 557,
      phosphorusMg: null,
      proteinG: 2.7,
      verified: true,
      portions: [{ unit: 'tasa', grams: 30 }],
    });
  });

  it('lists every problem with its line number', () => {
    const { rows, errors } = parseFoodCsv(
      `${HEADER}\nFNRI,,Kanin,,grain,-1,35,43,2.7,yes,bowl=200\ncustom,x1,Thing,,,1,1,1,1,true,`,
    );
    expect(rows).toEqual([]);
    expect(errors).toEqual([
      expect.stringMatching(/^Line 2: source must be/),
      'Line 2: source_ref is required',
      expect.stringMatching(/^Line 2: sodium_mg must be/),
      'Line 2: verified must be true or false',
      expect.stringMatching(/^Line 2: portion "bowl=200"/),
      'Line 3: custom rows cannot be marked verified',
    ]);
  });

  it('rejects a file without the expected columns', () => {
    expect(parseFoodCsv('name,sodium\nKanin,1').errors[0]).toMatch(/^Missing columns: source, source_ref/);
  });
});
