import type { ZodType } from 'zod';
import { ANALYSIS_SYSTEM, PARSE_SYSTEM, analysisUserPrompt, parseUserPrompt } from './prompts.js';
import {
  ANALYSIS_RESPONSE_SCHEMA,
  AnalysisOutputSchema,
  PARSE_RESPONSE_SCHEMA,
  ParseOutputSchema,
  type AnalysisOutput,
} from './schemas.js';
import { createRateLimiter, type RateLimiter } from './rate-limiter.js';
import { AiError, type AiProvider, type AnalysisInput, type ParsedFood } from './types.js';

const ENDPOINT = 'https://generativelanguage.googleapis.com/v1beta/models';
const MAX_ATTEMPTS = 2;
const MAX_BUSY_RETRIES = 2;
const BACKOFF_MS = 2000;

interface GeminiResponse {
  candidates?: { content?: { parts?: { text?: string }[] }; finishReason?: string }[];
  promptFeedback?: { blockReason?: string };
}

interface GeminiErrorBody {
  error?: { details?: { '@type'?: string; retryDelay?: string }[] };
}

export interface GeminiOptions {
  apiKey: string;
  model: string;
  timeoutMs: number;
  fetchFn?: typeof fetch;
  limiter?: RateLimiter;
  maxRetryWaitMs?: number;
}

export async function retryDelayMs(res: Response): Promise<number | null> {
  const header = res.headers.get('retry-after');
  if (header) {
    const seconds = Number(header);
    if (Number.isFinite(seconds)) return Math.max(0, seconds * 1000);
    const at = Date.parse(header);
    if (!Number.isNaN(at)) return Math.max(0, at - Date.now());
  }
  try {
    const body = (await res.json()) as GeminiErrorBody;
    const delay = body.error?.details?.find((d) => d.retryDelay)?.retryDelay;
    const match = delay?.match(/^(\d+(?:\.\d+)?)s$/);
    if (match) return Number(match[1]) * 1000;
  } catch {
    return null;
  }
  return null;
}

export function createGeminiProvider(opts: GeminiOptions): AiProvider {
  const fetchFn = opts.fetchFn ?? fetch;
  const maxRetryWaitMs = opts.maxRetryWaitMs ?? 20_000;
  const limiter = opts.limiter ?? createRateLimiter({ perMinute: Number.POSITIVE_INFINITY, maxWaitMs: maxRetryWaitMs });

  async function callOnce(system: string, user: string, responseSchema: unknown, temperature: number): Promise<string> {
    for (let retry = 0; ; retry++) {
      await limiter.acquire();
      const res = await post(system, user, responseSchema, temperature);
      if (res.status !== 429 && res.status !== 503) return read(res);

      const waitMs = (await retryDelayMs(res)) ?? BACKOFF_MS * 2 ** retry;
      if (retry >= MAX_BUSY_RETRIES || waitMs > maxRetryWaitMs) {
        if (res.status === 503) throw new AiError('http', 'Gemini is overloaded (503). Try again shortly.');
        const seconds = Math.ceil(waitMs / 1000);
        throw new AiError('rate_limited', `The AI service is busy. Try again in about ${seconds} seconds.`);
      }
      limiter.pauseFor(waitMs);
    }
  }

  async function post(system: string, user: string, responseSchema: unknown, temperature: number): Promise<Response> {
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), opts.timeoutMs);
    try {
      return await fetchFn(`${ENDPOINT}/${encodeURIComponent(opts.model)}:generateContent`, {
        method: 'POST',
        headers: { 'content-type': 'application/json', 'x-goog-api-key': opts.apiKey },
        body: JSON.stringify({
          systemInstruction: { parts: [{ text: system }] },
          contents: [{ role: 'user', parts: [{ text: user }] }],
          generationConfig: { temperature, responseMimeType: 'application/json', responseSchema },
        }),
        signal: controller.signal,
      });
    } catch (err) {
      if (controller.signal.aborted) throw new AiError('timeout', `Gemini did not answer within ${opts.timeoutMs} ms`);
      throw new AiError('http', `Could not reach Gemini: ${(err as Error).message}`);
    } finally {
      clearTimeout(timer);
    }
  }

  async function read(res: Response): Promise<string> {
    if (!res.ok) throw new AiError('http', `Gemini answered ${res.status}`);
    let body: GeminiResponse;
    try {
      body = (await res.json()) as GeminiResponse;
    } catch {
      throw new AiError('invalid_output', 'Gemini returned a body that is not JSON');
    }
    if (body.promptFeedback?.blockReason) throw new AiError('blocked', `Gemini blocked the request: ${body.promptFeedback.blockReason}`);
    const candidate = body.candidates?.[0];
    if (candidate?.finishReason === 'SAFETY') throw new AiError('blocked', 'Gemini stopped for safety');
    const out = candidate?.content?.parts?.map((p) => p.text ?? '').join('') ?? '';
    if (!out) throw new AiError('invalid_output', 'Gemini returned no text');
    return out;
  }

  async function generate<T>(system: string, user: string, responseSchema: unknown, schema: ZodType<T>, temperature: number): Promise<T> {
    let last: AiError | null = null;
    for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
      try {
        const raw = await callOnce(system, user, responseSchema, temperature);
        let parsed: unknown;
        try {
          parsed = JSON.parse(raw);
        } catch {
          throw new AiError('invalid_output', 'Gemini returned text that is not JSON');
        }
        const checked = schema.safeParse(parsed);
        if (!checked.success) throw new AiError('invalid_output', `Gemini output failed validation: ${checked.error.issues[0]?.message ?? ''}`);
        return checked.data;
      } catch (err) {
        if (!(err instanceof AiError)) throw err;
        last = err;
        if (err.code === 'blocked' || err.code === 'rate_limited') break;
      }
    }
    throw last ?? new AiError('invalid_output', 'Gemini failed');
  }

  return {
    name: 'gemini',
    model: opts.model,
    async parseMeal(text: string): Promise<ParsedFood[]> {
      const out = await generate(PARSE_SYSTEM, parseUserPrompt(text), PARSE_RESPONSE_SCHEMA, ParseOutputSchema, 0);
      return out.items;
    },
    analyseMeal(input: AnalysisInput): Promise<AnalysisOutput> {
      return generate(ANALYSIS_SYSTEM, analysisUserPrompt(input), ANALYSIS_RESPONSE_SCHEMA, AnalysisOutputSchema, 0.3);
    },
  };
}
