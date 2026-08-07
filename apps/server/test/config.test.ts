import assert from 'node:assert/strict';
import test from 'node:test';
import { readQuranFoundationConfig, readServerConfig } from '../src/config';

const valid = {
  QF_ENV: 'prelive',
  QF_CLIENT_ID: 'server-client',
  QF_CLIENT_SECRET: 'server-secret',
  QF_TRANSLATION_RESOURCE_ID: '131',
  QF_TAFSIR_RESOURCE_ID: '169',
  QF_CHAPTER_INFO_RESOURCE_ID: '1',
  QF_RECITATION_RESOURCE_ID: '6',
  FURQAN_ALLOWED_ORIGINS: 'https://app.example, http://localhost:8081 ',
  FURQAN_PORT: '8787',
  FURQAN_ENABLE_DRAFT_RUNTIME: 'true',
};

test('server config keeps environment, credentials, and provider resources explicit', () => {
  const config = readServerConfig(valid);
  assert.deepEqual(config.quranFoundation, {
    environment: 'prelive',
    clientId: 'server-client',
    clientSecret: 'server-secret',
  });
  assert.deepEqual(config.quranFoundationResources, {
    translationId: 131,
    tafsirId: 169,
    chapterInfoId: 1,
    recitationId: 6,
  });
  assert.deepEqual(config.allowedOrigins, ['https://app.example', 'http://localhost:8081']);
  assert.equal(config.enableDraftRuntime, true);
});

test('resource discovery requires only server credentials', () => {
  assert.deepEqual(readQuranFoundationConfig({
    QF_ENV: 'production',
    QF_CLIENT_ID: 'server-client',
    QF_CLIENT_SECRET: 'server-secret',
  }), {
    environment: 'production',
    clientId: 'server-client',
    clientSecret: 'server-secret',
  });
});

test('server config fails closed for missing or malformed values', () => {
  assert.throws(() => readServerConfig({ ...valid, QF_ENV: 'development' }), /QF_ENV/);
  assert.throws(() => readServerConfig({ ...valid, QF_CLIENT_SECRET: '' }), /QF_CLIENT_SECRET/);
  assert.throws(() => readServerConfig({ ...valid, QF_TRANSLATION_RESOURCE_ID: '0' }), /positive integer/);
  assert.throws(() => readServerConfig({ ...valid, QF_TRANSLATION_RESOURCE_ID: undefined }), /required/);
});
