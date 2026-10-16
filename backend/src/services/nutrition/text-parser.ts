import type { ParsedItem } from './types.js';
import { parseAmountToken, toUnit } from './units.js';

export const PARSER_VERSION = 'rules@1';

const SPLIT = /[,;\n]+|\s\+\s|\s(?:and|at|saka|tsaka|with|&)\s/i;

const LINKERS = new Set(['na', 'ng', 'of', 'a', 'an', 'ang', 'mga', 'nang']);

const PREPARATION: Record<string, string> = {
  prito: 'fried', pritong: 'fried', piniritong: 'fried', pinirito: 'fried', fried: 'fried',
  inihaw: 'grilled', grilled: 'grilled', ihaw: 'grilled',
  nilaga: 'boiled', nilagang: 'boiled', boiled: 'boiled',
  ginisa: 'sautéed', ginisang: 'sautéed', sauteed: 'sautéed', sautéed: 'sautéed',
  steamed: 'steamed', pinasingawan: 'steamed',
  hiniwa: 'sliced', sliced: 'sliced',
  hilaw: 'raw', raw: 'raw',
  luto: 'cooked', cooked: 'cooked',
};

function tokens(chunk: string): string[] {
  return chunk
    .replace(/[()[\]{}"“”]/g, ' ')
    .trim()
    .split(/\s+/)
    .filter(Boolean);
}

function readAmount(t: string[], i: number): [number, number] | null {
  const tok = t[i];
  if (!tok) return null;
  const first = parseAmountToken(tok);
  if (first == null) return null;
  const second = t[i + 1] && /^\d+\/\d+$/.test(t[i + 1]!) ? parseAmountToken(t[i + 1]!) : null;
  return second != null && Number.isInteger(first) ? [first + second, i + 2] : [first, i + 1];
}

function skipLinkers(t: string[], i: number): number {
  while (i < t.length && LINKERS.has(t[i]!.toLowerCase())) i++;
  return i;
}

function preparationOf(words: string[]): string | null {
  for (const w of words) {
    const p = PREPARATION[w.toLowerCase()];
    if (p) return p;
  }
  return null;
}

const isOnlyPreparation = (words: string[]) =>
  words.length > 0 && words.every((w) => PREPARATION[w.toLowerCase()] !== undefined || LINKERS.has(w.toLowerCase()));

function parseChunk(chunk: string): ParsedItem | 'preparation' | null {
  const t = tokens(chunk);
  if (t.length === 0) return null;

  let i = 0;
  let quantity: number | null = null;
  let unit: string | null = null;

  const glued = /^(\d+(?:\.\d+)?)([a-z]+)$/i.exec(t[0]!);
  if (glued && toUnit(glued[2]!)) {
    quantity = Number(glued[1]);
    unit = toUnit(glued[2]!);
    i = 1;
  } else {
    const amt = readAmount(t, 0);
    if (amt) {
      [quantity, i] = amt;
      i = skipLinkers(t, i);
      const u = t[i] ? toUnit(t[i]!) : null;
      if (u) {
        unit = u;
        i++;
      }
    } else if (toUnit(t[0]!) && t.length > 1) {
      quantity = 1;
      unit = toUnit(t[0]!);
      i = 1;
    }
  }
  i = skipLinkers(t, i);
  let words = t.slice(i);

  if (quantity == null && words.length >= 2) {
    const last = words[words.length - 1]!;
    const lastUnit = toUnit(last);
    const before = words[words.length - 2]!;
    const n = parseAmountToken(before);
    if (lastUnit && n != null && words.length >= 3) {
      quantity = n;
      unit = lastUnit;
      words = words.slice(0, -2);
    } else if (/^\d+(\.\d+)?$/.test(last) || /^x\d+$/i.test(last)) {
      quantity = Number(last.replace(/^x/i, ''));
      words = words.slice(0, -1);
    }
  }

  if (words.length === 0) return null;
  if (isOnlyPreparation(words)) return 'preparation';

  return {
    label: words.join(' ').toLowerCase(),
    quantity: quantity ?? 1,
    unit,
    preparation: preparationOf(words),
    quantityGiven: quantity != null,
  };
}

export function parseMealText(text: string): ParsedItem[] {
  const items: ParsedItem[] = [];
  for (const chunk of text.split(SPLIT)) {
    const r = parseChunk(chunk);
    if (r === null) continue;
    if (r === 'preparation') {
      const prev = items[items.length - 1];
      if (prev && !prev.preparation) prev.preparation = preparationOf(tokens(chunk));
      continue;
    }
    items.push(r);
  }
  return items;
}
