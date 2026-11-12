import { FOOD_CSV_COLUMNS, splitCsv } from './food-csv.js';

// Builds a food import CSV (see food-csv.ts) from a PhilFCT export plus our own selection file.
// The export is the "fnri_detailed_nutritional_data.csv" layout: one row per PhilFCT food, values
// per 100 g edible portion. The selection file adds what PhilFCT does not have: the names patients
// type, a category, and household portions.

const SOURCE_COLUMNS = {
  id: 'Food_ID',
  name: 'Food_name_and_Description',
  alternateName: 'Alternate_Common_names',
  ediblePortion: 'Edible_portion',
  sodiumMg: 'Minerals_Sodium_Na_mg',
  potassiumMg: 'Minerals_Potassium_K_mg',
  phosphorusMg: 'Minerals_Phosphorus_P_mg',
  proteinG: 'Proximates_Protein_g',
  energyKcal: 'Proximates_Energy_calculated_kcal',
} as const;

const SELECTION_COLUMNS = ['source_ref', 'local_names', 'category', 'portions'] as const;

// energy_kcal is read by the importer; the other two are for checking against PhilFCT.
export const PHILFCT_EXTRA_COLUMNS = ['energy_kcal', 'fnri_alternate_name', 'edible_portion_pct'] as const;

const NOT_REPORTED = new Set(['', '-', 'n/a', 'na', 'tr']);

export interface PhilFctBuild {
  csv: string;
  errors: string[];
  count: number;
  missing: Record<'sodium_mg' | 'potassium_mg' | 'phosphorus_mg' | 'protein_g' | 'energy_kcal', string[]>;
}

function readTable(text: string): { cols: string[]; rows: string[][] } {
  const [header = [], ...rows] = splitCsv(text.replace(/^﻿/, ''));
  return { cols: header.map((h) => h.trim()), rows };
}

// '' when the source does not report a value; throws on anything that is not a number.
function cleanNumber(raw: string | undefined): string {
  const v = (raw ?? '').trim().replace(/,/g, '');
  if (NOT_REPORTED.has(v.toLowerCase())) return '';
  const n = Number(v);
  if (!Number.isFinite(n) || n < 0) throw new Error(`"${raw}" is not a number`);
  return String(n);
}

function cleanText(raw: string | undefined): string {
  const v = (raw ?? '').trim();
  return NOT_REPORTED.has(v.toLowerCase()) ? '' : v;
}

const field = (s: string) => (/[",\r\n]/.test(s) ? `"${s.replace(/"/g, '""')}"` : s);

export function buildPhilFctBase(sourceText: string, selectionText: string): PhilFctBuild {
  const errors: string[] = [];
  const missing: PhilFctBuild['missing'] = { sodium_mg: [], potassium_mg: [], phosphorus_mg: [], protein_g: [], energy_kcal: [] };
  const empty = (): PhilFctBuild => ({ csv: '', errors, count: 0, missing });

  const src = readTable(sourceText);
  const absent = Object.values(SOURCE_COLUMNS).filter((c) => !src.cols.includes(c));
  if (absent.length) {
    errors.push(`PhilFCT file is missing columns: ${absent.join(', ')}`);
    return empty();
  }
  const sc = (r: string[], c: keyof typeof SOURCE_COLUMNS) => r[src.cols.indexOf(SOURCE_COLUMNS[c])];
  const byId = new Map<string, string[]>();
  for (const r of src.rows) {
    const id = (sc(r, 'id') ?? '').trim();
    if (!id) continue;
    if (byId.has(id)) errors.push(`PhilFCT file lists ${id} twice`);
    byId.set(id, r);
  }

  const sel = readTable(selectionText);
  const selAbsent = SELECTION_COLUMNS.filter((c) => !sel.cols.includes(c));
  if (selAbsent.length) {
    errors.push(`Selection file is missing columns: ${selAbsent.join(', ')}`);
    return empty();
  }
  const at = (r: string[], c: (typeof SELECTION_COLUMNS)[number]) => (r[sel.cols.indexOf(c)] ?? '').trim();

  const out: string[] = [[...FOOD_CSV_COLUMNS, ...PHILFCT_EXTRA_COLUMNS].join(',')];
  const seen = new Set<string>();
  sel.rows.forEach((r, idx) => {
    const line = idx + 2;
    const id = at(r, 'source_ref');
    if (seen.has(id)) return void errors.push(`Selection line ${line}: ${id} is listed twice`);
    seen.add(id);
    const s = byId.get(id);
    if (!s) return void errors.push(`Selection line ${line}: ${id} is not in the PhilFCT file`);
    try {
      const values = {
        sodium_mg: cleanNumber(sc(s, 'sodiumMg')),
        potassium_mg: cleanNumber(sc(s, 'potassiumMg')),
        phosphorus_mg: cleanNumber(sc(s, 'phosphorusMg')),
        protein_g: cleanNumber(sc(s, 'proteinG')),
        energy_kcal: cleanNumber(sc(s, 'energyKcal')),
      };
      for (const [k, v] of Object.entries(values)) if (v === '') missing[k as keyof typeof missing].push(id);
      const edible = cleanText(sc(s, 'ediblePortion')).replace('%', '');
      out.push(
        [
          'PH_FCT',
          id,
          cleanText(sc(s, 'name')),
          at(r, 'local_names'),
          at(r, 'category'),
          values.sodium_mg,
          values.potassium_mg,
          values.phosphorus_mg,
          values.protein_g,
          'false',
          at(r, 'portions'),
          values.energy_kcal,
          cleanText(sc(s, 'alternateName')),
          edible === '' ? '' : cleanNumber(edible),
        ]
          .map(field)
          .join(','),
      );
    } catch (e) {
      errors.push(`PhilFCT ${id}: ${(e as Error).message}`);
    }
  });

  if (errors.length) return empty();
  return { csv: `${out.join('\n')}\n`, errors, count: out.length - 1, missing };
}
