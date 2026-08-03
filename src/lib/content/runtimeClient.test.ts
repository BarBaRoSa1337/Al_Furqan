import { getRuntimeApiBaseUrl } from './runtimeClient';

describe('getRuntimeApiBaseUrl', () => {
  it('normalizes a configured endpoint', () => {
    expect(getRuntimeApiBaseUrl(' http://localhost:8787/ ')).toBe('http://localhost:8787');
  });

  it('treats an empty endpoint as unconfigured', () => {
    expect(getRuntimeApiBaseUrl('   ')).toBeUndefined();
  });
});
