import { describe, expect, it } from 'vitest';
import { describeAgent } from '../../src/lib/user-agent.js';

describe('describeAgent', () => {
  it.each([
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/129.0 Safari/537.36', 'Chrome on Windows'],
    ['Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 Chrome/129.0 Safari/537.36 Edg/129.0', 'Edge on Windows'],
    ['Mozilla/5.0 (iPhone; CPU iPhone OS 17_5 like Mac OS X) AppleWebKit/605.1.15 Version/17.5 Mobile/15E148 Safari/604.1', 'Safari on iOS'],
    ['Mozilla/5.0 (Linux; Android 14; SM-A546E) AppleWebKit/537.36 SamsungBrowser/25.0 Chrome/121.0 Mobile Safari/537.36', 'Samsung Internet on Android'],
    ['Mozilla/5.0 (Macintosh; Intel Mac OS X 14.5; rv:130.0) Gecko/20100101 Firefox/130.0', 'Firefox on macOS'],
  ])('%s', (ua, expected) => {
    expect(describeAgent(ua)).toBe(expected);
  });

  it('handles missing and unknown agents', () => {
    expect(describeAgent(null)).toBeNull();
    expect(describeAgent('curl/8.5.0')).toBe('Unknown device');
  });
});
