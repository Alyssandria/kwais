import { env } from '../../config/env.js';
import { parseMealText, PARSER_VERSION } from '../nutrition/text-parser.js';
import type { ParsedItem } from '../nutrition/types.js';
import { toUnit } from '../nutrition/units.js';
import { createGeminiProvider } from './gemini.provider.js';
import { createMockProvider } from './mock.provider.js';
import { PROMPT_VERSION } from './prompts.js';
import { bandFor, checkAnalysis } from './rubric.js';
import type { AnalysisOutput } from './schemas.js';
import { AiError, type AiProvider, type AnalysisInput, type ParsedFood } from './types.js';

export type AiSkipReason = 'no_consent' | 'ai_error';

export interface ParseResult {
  items: ParsedItem[];
  parser: string;
  sentToAi: string | null;
  error: string | null;
}

export interface AnalyseResult {
  status: 'ok' | 'mock' | 'unavailable';
  reason: AiSkipReason | null;
  output: AnalysisOutput | null;
  score: number | null;
  band: string | null;
  model: string | null;
  promptVersion: string | null;
  sentToAi: AnalysisInput | null;
  error: string | null;
}

let override: AiProvider | null = null;

export function setAiProviderForTests(p: AiProvider | null) {
  override = p;
}

function provider(): AiProvider {
  if (override) return override;
  if (env.AI_PROVIDER === 'gemini') {
    if (!env.GEMINI_API_KEY) throw new AiError('not_configured', 'AI_PROVIDER is gemini but GEMINI_API_KEY is empty');
    return createGeminiProvider({ apiKey: env.GEMINI_API_KEY, model: env.GEMINI_MODEL, timeoutMs: env.AI_TIMEOUT_MS });
  }
  return createMockProvider();
}

export function toParsedItem(f: ParsedFood): ParsedItem {
  const label = (f.localName ?? f.name).toLowerCase();
  return {
    label,
    altLabels: f.localName ? [f.name.toLowerCase()] : [],
    quantity: f.quantity ?? 1,
    unit: f.unit ? toUnit(f.unit) : null,
    preparation: f.preparation,
    quantityGiven: f.quantity != null || f.unit != null,
  };
}

const rules = (error: string | null): ParseResult => ({ items: [], parser: PARSER_VERSION, sentToAi: null, error });

export const AiService = {
  async parse(text: string, allowed: boolean): Promise<ParseResult> {
    if (!allowed || !text.trim()) return { ...rules(null), items: parseMealText(text) };
    try {
      const p = provider();
      const foods = await p.parseMeal(text);
      return { items: foods.map(toParsedItem), parser: `${p.name}:${p.model}@${PROMPT_VERSION}`, sentToAi: text, error: null };
    } catch (err) {
      if (!(err instanceof AiError)) throw err;
      return { ...rules(err.message), items: parseMealText(text) };
    }
  },

  async analyse(input: AnalysisInput, allowed: boolean): Promise<AnalyseResult> {
    const skipped = (reason: AiSkipReason, error: string | null, model: string | null = null): AnalyseResult => ({
      status: 'unavailable',
      reason,
      output: null,
      score: null,
      band: null,
      model,
      promptVersion: null,
      sentToAi: null,
      error,
    });
    if (!allowed) return skipped('no_consent', null);

    let p: AiProvider;
    try {
      p = provider();
    } catch (err) {
      return skipped('ai_error', (err as Error).message);
    }
    let lastError = '';
    for (let attempt = 0; attempt < 2; attempt++) {
      try {
        const output = checkAnalysis(await p.analyseMeal(input), input);
        return {
          status: p.name === 'mock' ? 'mock' : 'ok',
          reason: null,
          output,
          score: output.score,
          band: bandFor(output.score),
          model: p.model,
          promptVersion: PROMPT_VERSION,
          sentToAi: input,
          error: null,
        };
      } catch (err) {
        if (!(err instanceof AiError)) throw err;
        lastError = err.message;
        if (err.code !== 'invalid_output') break;
      }
    }
    return { ...skipped('ai_error', lastError, p.model), sentToAi: input };
  },
};
