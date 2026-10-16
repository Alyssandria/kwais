import { CANONICAL_UNITS } from './units.js';

/**
 * Reads food composition records from CSV so real PhilFCT and USDA data can replace the
 * sample values. One row per food; values per 100 g edible portion; blank = not reported.
 *
 *   source,source_ref,name,local_names,category,sodium_mg,potassium_mg,phosphorus_mg,protein_g,verified,portions
 *   PH_FCT,D173,"Spinach, Philippine, leaves",alugbati|spinach,vegetable,16,557,25,2.7,true,tasa=30
 *
 * local_names and portions are separated by "|"; a portion is unit=grams with a unit from units.ts.
 */

export const FOOD_CSV_COLUMNS = [
  'source', 'source_ref', 'name', 'local_names', 'category',
  'sodium_mg', 'potassium_mg', 'phosphorus_mg', 'protein_g', 'verified', 'portions',
] as const;

const SOURCES = ['PH_FCT', 'USDA_FDC', 'custom'] as const;

export interface FoodCsvRow {
  source: (typeof SOURCES)[number];
  sourceRef: string;
  name: string;
  localNames: string[];
  category: string | null;
  sodiumMg: number | null;
  potassiumMg: number | null;
  phosphorusMg: number | null;
  proteinG: number | null;
  verified: boolean;
  portions: { unit: string; grams: number }[];
}

/** Splits CSV text into rows of fields. Handles quoted fields, "" escapes, and CRLF. */
export function splitCsv(text: string): string[][] {
  const rows: string[][] = [];
  let row: string[] = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < text.length; i++) {
    const c = text[i]!;
    if (quoted) {
      if (c === '"' && text[i + 1] === '"') {
        field += '"';
        i++;
      } else if (c === '"') quoted = false;
      else field += c;
    } else if (c === '"') quoted = true;
    else if (c === ',') {
      row.push(field);
      field = '';
    } else if (c === '\n' || c === '\r') {
      if (c === '\r' && text[i + 1] === '\n') i++;
      row.push(field);
      if (row.some((f) => f.trim() !== '')) rows.push(row);
      row = [];
      field = '';
    } else field += c;
  }
  row.push(field);
  if (row.some((f) => f.trim() !== '')) rows.push(row);
  return rows;
}

const MAX_PER_100G = { sodiumMg: 40000, potassiumMg: 10000, phosphorusMg: 5000, proteinG: 100 } as const;

/** Parses and checks every row. Returns all problems at once, with line numbers, rather than stopping at the first. */
export function parseFoodCsv(text: string): { rows: FoodCsvRow[]; errors: string[] } {
  const [header, ...lines] = splitCsv(text.replace(/^﻿/, ''));
  const errors: string[] = [];
  if (!header) return { rows: [], errors: ['The file is empty'] };

  const cols = header.map((h) => h.trim().toLowerCase());
  const missing = FOOD_CSV_COLUMNS.filter((c) => !cols.includes(c));
  if (missing.length) return { rows: [], errors: [`Missing columns: ${missing.join(', ')}`] };
  const at = (r: string[], c: (typeof FOOD_CSV_COLUMNS)[number]) => (r[cols.indexOf(c)] ?? '').trim();

  const rows: FoodCsvRow[] = [];
  const seen = new Set<string>();
  lines.forEach((r, idx) => {
    const line = idx + 2;
    const rowErrors: string[] = [];

    const source = at(r, 'source') as FoodCsvRow['source'];
    if (!SOURCES.includes(source)) rowErrors.push(`source must be one of ${SOURCES.join(', ')}`);
    const sourceRef = at(r, 'source_ref');
    if (!sourceRef) rowErrors.push('source_ref is required');
    const name = at(r, 'name');
    if (!name) rowErrors.push('name is required');
    const key = `${source}:${sourceRef}`;
    if (seen.has(key)) rowErrors.push(`duplicate ${key}`);
    seen.add(key);

    const value = (c: 'sodium_mg' | 'potassium_mg' | 'phosphorus_mg' | 'protein_g', max: number): number | null => {
      const raw = at(r, c);
      if (raw === '') return null;
      const n = Number(raw);
      if (!Number.isFinite(n) || n < 0 || n > max) {
        rowErrors.push(`${c} must be a number from 0 to ${max}, or blank if not reported`);
        return null;
      }
      return n;
    };
    const sodiumMg = value('sodium_mg', MAX_PER_100G.sodiumMg);
    const potassiumMg = value('potassium_mg', MAX_PER_100G.potassiumMg);
    const phosphorusMg = value('phosphorus_mg', MAX_PER_100G.phosphorusMg);
    const proteinG = value('protein_g', MAX_PER_100G.proteinG);

    const verifiedRaw = at(r, 'verified').toLowerCase();
    if (!['true', 'false', ''].includes(verifiedRaw)) rowErrors.push('verified must be true or false');
    const verified = verifiedRaw === 'true';
    if (verified && source === 'custom') rowErrors.push('custom rows cannot be marked verified');

    const portions: { unit: string; grams: number }[] = [];
    for (const part of at(r, 'portions').split('|').map((p) => p.trim()).filter(Boolean)) {
      const [unit, grams] = part.split('=').map((s) => s.trim());
      const g = Number(grams);
      if (!unit || !CANONICAL_UNITS.includes(unit) || !Number.isFinite(g) || g <= 0 || g > 5000) {
        rowErrors.push(`portion "${part}" must be unit=grams with a unit from: ${CANONICAL_UNITS.join(', ')}`);
      } else portions.push({ unit, grams: g });
    }

    if (rowErrors.length) {
      errors.push(...rowErrors.map((e) => `Line ${line}: ${e}`));
      return;
    }
    rows.push({
      source,
      sourceRef,
      name,
      localNames: at(r, 'local_names').split('|').map((s) => s.trim().toLowerCase()).filter(Boolean),
      category: at(r, 'category') || null,
      sodiumMg,
      potassiumMg,
      phosphorusMg,
      proteinG,
      verified,
      portions,
    });
  });
  return { rows, errors };
}
