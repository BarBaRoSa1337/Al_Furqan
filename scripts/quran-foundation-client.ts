export const DEFAULT_QF_CONTENT_API_BASE = 'https://apis.quran.foundation/content/api/v4';

export function quranFoundationHeaders(): Record<string, string> {
  const accessToken = process.env.QF_ACCESS_TOKEN;
  const clientId = process.env.QF_CLIENT_ID;
  if (!accessToken || !clientId) {
    throw new Error(
      'QF_ACCESS_TOKEN and QF_CLIENT_ID are required. Obtain the short-lived token in a trusted backend/CLI environment.',
    );
  }
  return {
    'x-auth-token': accessToken,
    'x-client-id': clientId,
  };
}
