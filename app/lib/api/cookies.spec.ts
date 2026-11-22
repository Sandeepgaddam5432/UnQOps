import { describe, expect, it } from 'vitest';
import { getApiKeysFromCookie, getProviderSettingsFromCookie, parseCookies } from './cookies';

describe('credential cookie parsing', () => {
  it('preserves encoded values containing equals signs', () => {
    expect(parseCookies('apiKeys=%7B%22openai%22%3A%22key%3Dvalue%3D%22%7D')).toEqual({
      apiKeys: '{"openai":"key=value="}',
    });
    expect(getApiKeysFromCookie('apiKeys=%7B%22openai%22%3A%22key%3Dvalue%3D%22%7D')).toEqual({ openai: 'key=value=' });
  });

  it('ignores malformed JSON, arrays, non-string credentials, and prototype keys', () => {
    expect(getApiKeysFromCookie('apiKeys=%7B%22openai%22%3A%7B%7D%2C%22constructor%22%3A%22bad%22%7D')).toEqual({});
    expect(getApiKeysFromCookie('apiKeys=%5B%22not-a-record%22%5D')).toEqual({});
    expect(getApiKeysFromCookie('apiKeys=%7Bbroken')).toEqual({});
  });

  it('ignores invalid percent encoding without throwing', () => {
    expect(parseCookies('apiKeys=%E0%A4%A; valid=yes')).toEqual({ valid: 'yes' });
  });

  it('accepts only record-shaped provider settings', () => {
    expect(
      getProviderSettingsFromCookie('providers=%7B%22OpenAI%22%3A%7B%22enabled%22%3Atrue%7D%2C%22bad%22%3A%5B%5D%7D'),
    ).toEqual({
      OpenAI: { enabled: true },
    });
  });
});
