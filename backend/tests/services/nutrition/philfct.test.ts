import { describe, expect, it } from 'vitest';
import { parseFoodCsv } from '../../../src/services/nutrition/food-csv.js';
import { buildPhilFctBase } from '../../../src/services/nutrition/philfct.js';

// Made-up numbers in the PhilFCT export layout. No real PhilFCT values are stored in this repository.
const SOURCE = [
  'Food_ID,Food_name_and_Description,Scientific_name,Alternate_Common_names,Edible_portion,Proximates_Energy_calculated_kcal,Proximates_Protein_g,Minerals_Phosphorus_P_mg,Minerals_Sodium_Na_mg,Minerals_Potassium_K_mg',
  'X001,"Rice, test, boiled",Oryza,"Bigas, test",100%,120,2.5,40,3,',
  'X002,Test sauce,N/A,N/A,100%,60,1.0,30,"5,000",-',
  'X003,Test leaf,Folium,Dahon,59%,20,3.0,60,110,400',
].join('\n');

const SELECTION = [
  'source_ref,local_names,category,portions',
  'X003,dahon|leaf,vegetable,tasa=40',
  'X001,kanin|rice,grain,tasa=160|sandok=80',
].join('\n');

describe('buildPhilFctBase', () => {
  it('writes selected foods in selection order, in the import format', () => {
    const b = buildPhilFctBase(SOURCE, SELECTION);
    expect(b.errors).toEqual([]);
    expect(b.count).toBe(2);
    const { rows, errors } = parseFoodCsv(b.csv);
    expect(errors).toEqual([]);
    expect(rows.map((r) => r.sourceRef)).toEqual(['X003', 'X001']);
    expect(rows[1]).toEqual({
      source: 'PH_FCT',
      sourceRef: 'X001',
      name: 'Rice, test, boiled',
      localNames: ['kanin', 'rice'],
      category: 'grain',
      sodiumMg: 3,
      potassiumMg: null,
      phosphorusMg: 40,
      proteinG: 2.5,
      verified: false,
      portions: [
        { unit: 'tasa', grams: 160 },
        { unit: 'sandok', grams: 80 },
      ],
    });
  });

  it('keeps energy, the FNRI alternate name and edible portion as extra columns', () => {
    const line = buildPhilFctBase(SOURCE, SELECTION).csv.split('\n')[1];
    expect(line).toBe('PH_FCT,X003,Test leaf,dahon|leaf,vegetable,110,400,60,3,false,tasa=40,20,Dahon,59');
  });

  it('treats "-" and blanks as not reported and strips thousands separators', () => {
    const b = buildPhilFctBase(SOURCE, 'source_ref,local_names,category,portions\nX002,sauce,condiment,tbsp=18');
    const [row] = parseFoodCsv(b.csv).rows;
    expect(row?.sodiumMg).toBe(5000);
    expect(row?.potassiumMg).toBeNull();
    expect(b.missing.potassium_mg).toEqual(['X002']);
  });

  it('refuses unknown or repeated IDs and writes nothing', () => {
    const b = buildPhilFctBase(SOURCE, 'source_ref,local_names,category,portions\nX001,a,grain,\nX001,b,grain,\nZ999,c,grain,');
    expect(b.csv).toBe('');
    expect(b.errors).toEqual(['Selection line 3: X001 is listed twice', 'Selection line 4: Z999 is not in the PhilFCT file']);
  });

  it('refuses a source file without the expected columns', () => {
    const b = buildPhilFctBase('Food_ID,Name\nX001,Rice', SELECTION);
    expect(b.errors[0]).toMatch(/^PhilFCT file is missing columns: /);
  });
});
