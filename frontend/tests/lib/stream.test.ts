// @vitest-environment node
import { analyseWithProgress } from '@/features/meals/api';
import { ApiError, errorMessage } from '@/lib/api';

function streamOf(chunks: string[], status = 200) {
  const encoder = new TextEncoder();
  const body = new ReadableStream<Uint8Array>({
    start(controller) {
      for (const c of chunks) controller.enqueue(encoder.encode(c));
      controller.close();
    },
  });
  return new Response(body, { status, headers: { 'content-type': 'application/x-ndjson' } });
}

afterEach(() => vi.unstubAllGlobals());

describe('analyseWithProgress', () => {
  it('reports steps as lines arrive, even when a line is split across chunks', async () => {
    const fetchMock = vi.fn().mockResolvedValue(streamOf(['{"step":"reading"}\n{"st', 'ep":"calculating"}\n', '{"done":true,"data":{"id":"m1"}}\n']));
    vi.stubGlobal('fetch', fetchMock);
    const steps: string[] = [];

    const meal = await analyseWithProgress('m1', (s) => steps.push(s));

    expect(steps).toEqual(['reading', 'calculating']);
    expect(meal).toEqual({ id: 'm1' });
    const [url, init] = fetchMock.mock.calls[0]!;
    expect(url).toBe('/api/v1/meals/m1/analyse');
    expect(init).toMatchObject({ method: 'POST', headers: { Accept: 'application/x-ndjson' } });
  });

  it('turns an error line into a readable message', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamOf(['{"step":"reading"}\n{"error":{"code":"conflict","message":"Save the meal before analysing it"}}\n'])));
    const err = await analyseWithProgress('m1', () => undefined).catch((e) => e);
    expect(err).toBeInstanceOf(ApiError);
    expect(errorMessage(err)).toBe('Save the meal before analysing it');
  });

  it('uses the JSON error of a refused request', async () => {
    const refused = new Response(JSON.stringify({ error: { code: 'rate_limited', message: 'You’ve analysed a lot of meals in the last hour.' } }), { status: 429 });
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(refused));
    const err = await analyseWithProgress('m1', () => undefined).catch((e) => e);
    expect(err).toMatchObject({ status: 429, code: 'rate_limited' });
  });

  it('fails clearly when the stream ends without a result', async () => {
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue(streamOf(['{"step":"reading"}\n'])));
    await expect(analyseWithProgress('m1', () => undefined)).rejects.toThrow(/didn’t finish/);
  });
});
