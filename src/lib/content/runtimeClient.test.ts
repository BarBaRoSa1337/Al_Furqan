import { buildRuntimePackageUrl, getRuntimeApiBaseUrl } from './runtimeClient';

describe('getRuntimeApiBaseUrl', () => {
  it('normalizes a configured endpoint', () => {
    expect(getRuntimeApiBaseUrl(' http://localhost:8787/ ')).toBe('http://localhost:8787');
  });

  it('treats an empty endpoint as unconfigured', () => {
    expect(getRuntimeApiBaseUrl('   ')).toBeUndefined();
  });
});

it('labels runtime package requests with the selected content mode', () => {
  expect(buildRuntimePackageUrl('http://localhost:8787', 'surah-al-fil-v1', 'en', 'preview'))
    .toBe('http://localhost:8787/v1/content/packages/surah-al-fil-v1?locale=en&contentMode=preview');
});
