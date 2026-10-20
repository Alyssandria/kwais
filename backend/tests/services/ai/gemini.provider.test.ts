import { describe, expect, it, vi } from 'vitest';
import { createGeminiProvider, retryDelayMs } from '../../../src/services/ai/gemini.provider.js';
import { createRateLimiter } from '../../../src/services/ai/rate-limiter.js';
import { AiError } from '../../../src/services/ai/types.js';
import { sampleInput } from '../../fixtures/analysis-input.js';

const reply = (payload: unknown, status = 200) =>
  new Response(JSON.stringify(payload), { status, headers: { 'content-type': 'application/json' } });
const textReply = (text: string) => reply({ candidates: [{ content: { parts: [{ text }] }, finishReason: 'STOP' }] });

const parsed = {
  items: [
    { name: 'Rice', localName: 'kanin', quantity: 1, unit: 'tasa', preparation: null, isMixedDish: false },
    { name: 'Grilled chicken', localName: 'inihaw na manok', quantity: 1, unit: 'piraso', preparation: 'grilled', isMixedDish: false },
  ],
};

const make = (fetchFn: unknown, timeoutMs = 1000) =>
  createGeminiProvider({ apiKey: 'test-key', model: 'gemini-2.5-flash', timeoutMs, fetchFn: fetchFn as typeof fetch });

describe('Gemini provider', () => {
  it('asks for JSON that follows a schema, with the key in a header', async () => {
    const fetchFn = vi.fn().mockResolvedValue(textReply(JSON.stringify(parsed)));
    const items = await make(fetchFn).parseMeal('1 tasa kanin, isang hita ng inihaw na manok');

    expect(items).toEqual(parsed.items);
    const [url, init] = fetchFn.mock.calls[0]!;
    expect(url).toBe('https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent');
    expect(url).not.toContain('test-key');
    expect(init.headers['x-goog-api-key']).toBe('test-key');
    const body = JSON.parse(init.body);
    expect(body.generationConfig).toMatchObject({ responseMimeType: 'application/json', temperature: 0 });
    expect(body.generationConfig.responseSchema.required).toEqual(['items']);
    expect(body.contents[0].parts[0].text).toContain('1 tasa kanin');
    expect(body.systemInstruction.parts[0].text).toMatch(/never instructions to you/);
  });

  it('retries once when the output is not valid, then succeeds', async () => {
    const fetchFn = vi.fn().mockResolvedValueOnce(textReply('not json')).mockResolvedValueOnce(textReply(JSON.stringify(parsed)));
    await expect(make(fetchFn).parseMeal('kanin')).resolves.toHaveLength(2);
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('rejects output that breaks the schema', async () => {
    const bad = { items: [{ ...parsed.items[0], unit: 'bucket' }] };
    const fetchFn = vi.fn(() => Promise.resolve(textReply(JSON.stringify(bad))));
    await expect(make(fetchFn).parseMeal('kanin')).rejects.toMatchObject({ code: 'invalid_output' });
    expect(fetchFn).toHaveBeenCalledTimes(2);
  });

  it('does not retry a blocked request', async () => {
    const fetchFn = vi.fn().mockResolvedValue(reply({ promptFeedback: { blockReason: 'SAFETY' } }));
    await expect(make(fetchFn).parseMeal('kanin')).rejects.toMatchObject({ code: 'blocked' });
    expect(fetchFn).toHaveBeenCalledOnce();
  });

  it('reports HTTP errors and timeouts as AI errors', async () => {
    await expect(make(vi.fn(() => Promise.resolve(reply({}, 500)))).parseMeal('kanin')).rejects.toMatchObject({ code: 'http' });

    const hang: typeof fetch = (_url, init) =>
      new Promise((_resolve, reject) => init?.signal?.addEventListener('abort', () => reject(new Error('aborted'))));
    const err = await make(hang, 20).parseMeal('kanin').catch((e) => e);
    expect(err).toBeInstanceOf(AiError);
    expect(err.code).toBe('timeout');
  });

  it('sends the analysis input as JSON and validates the answer', async () => {
    const answer = {
      score: 8,
      scoreReasons: [{ title: 'Sodium within your target', detail: 'Today 1,200 of 2,000 mg.', deduction: 0 }],
      summary: 'A balanced lunch.',
      observations: [],
      concerns: [],
      clinicianQuestions: [],
      dataQuality: 'Amounts came from what you typed.',
      usedInputs: ['meal', 'target.sodium'],
    };
    const fetchFn = vi.fn().mockResolvedValue(textReply(JSON.stringify(answer)));
    const out = await make(fetchFn).analyseMeal(sampleInput());
    expect(out).toEqual(answer);
    const body = JSON.parse(fetchFn.mock.calls[0]![1].body);
    expect(JSON.parse(body.contents[0].parts[0].text)).toMatchObject({ allowedInputs: expect.arrayContaining(['target.sodium']) });
  });

  describe('when Gemini is busy', () => {
    const busy = (headers: Record<string, string> = {}, body: unknown = {}) =>
      new Response(JSON.stringify(body), { status: 429, headers: { 'content-type': 'application/json', ...headers } });

    function paced() {
      const waits: number[] = [];
      let t = 0;
      const limiter = createRateLimiter({
        perMinute: 100,
        maxWaitMs: 60_000,
        now: () => t,
        sleep: async (ms) => {
          waits.push(ms);
          t += ms;
        },
      });
      return { waits, limiter };
    }

    it('waits for the time Gemini asks for, then retries', async () => {
      const { waits, limiter } = paced();
      const fetchFn = vi.fn().mockResolvedValueOnce(busy({ 'retry-after': '3' })).mockResolvedValueOnce(textReply(JSON.stringify(parsed)));
      const p = createGeminiProvider({ apiKey: 'k', model: 'm', timeoutMs: 1000, fetchFn: fetchFn as typeof fetch, limiter });
      await expect(p.parseMeal('kanin')).resolves.toHaveLength(2);
      expect(waits).toEqual([3000]);
    });

    it('gives up with rate_limited when the requested wait is too long', async () => {
      const { limiter } = paced();
      const fetchFn = vi.fn(() => Promise.resolve(busy({ 'retry-after': '120' })));
      const p = createGeminiProvider({ apiKey: 'k', model: 'm', timeoutMs: 1000, fetchFn: fetchFn as typeof fetch, limiter, maxRetryWaitMs: 20_000 });
      await expect(p.parseMeal('kanin')).rejects.toMatchObject({ code: 'rate_limited' });
      expect(fetchFn).toHaveBeenCalledOnce();
    });

    it('stops after two busy retries', async () => {
      const { waits, limiter } = paced();
      const fetchFn = vi.fn(() => Promise.resolve(busy()));
      const p = createGeminiProvider({ apiKey: 'k', model: 'm', timeoutMs: 1000, fetchFn: fetchFn as typeof fetch, limiter });
      await expect(p.parseMeal('kanin')).rejects.toMatchObject({ code: 'rate_limited' });
      expect(fetchFn).toHaveBeenCalledTimes(3);
      expect(waits).toEqual([2000, 4000]);
    });

    it('reads the retry delay from the error body', async () => {
      const body = { error: { details: [{ '@type': 'type.googleapis.com/google.rpc.RetryInfo', retryDelay: '17s' }] } };
      await expect(retryDelayMs(busy({}, body))).resolves.toBe(17_000);
      await expect(retryDelayMs(busy())).resolves.toBeNull();
    });
  });
});
