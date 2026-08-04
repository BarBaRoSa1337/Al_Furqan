import { TANZIL_LICENSE_URL, TANZIL_SOURCE_URL } from './constants';

export function assertTanzilTermsAccepted(value: string | undefined): void {
  if (value === 'true') return;
  throw new Error([
    'Review and accept the Tanzil Text License before downloading.',
    `Official terms: ${TANZIL_LICENSE_URL}`,
    `Official download: ${TANZIL_SOURCE_URL}`,
  ].join('\n'));
}
