import assert from 'node:assert/strict';
import {beforeEach, describe, it} from 'node:test';
import {DEFAULT_WORKSPACE} from '../src/data/defaults';
import {
  computeTotp,
  decodeBase64,
  encodeBase64,
  generatePassword,
  generatePkcePair,
  loadWorkspace,
  parseOtpAuthUri,
  saveWorkspace,
} from '../src/lib/tauriBridge';

// Minimal localStorage mock for Node test environment
function installLocalStorageMock() {
  const store = new Map<string, string>();
  (globalThis as Record<string, unknown>).localStorage = {
    getItem: (key: string) => store.get(key) ?? null,
    setItem: (key: string, value: string) => {
      store.set(key, String(value));
    },
    removeItem: (key: string) => {
      store.delete(key);
    },
    clear: () => {
      store.clear();
    },
  };
}

describe('WorkDesk Core Bridge & Cryptography', () => {
  beforeEach(() => {
    installLocalStorageMock();
  });

  it('persists and loads workspace via localStorage fallback', async () => {
    assert.equal(await loadWorkspace(), null);
    await saveWorkspace(DEFAULT_WORKSPACE);
    const loaded = await loadWorkspace();
    assert.ok(loaded);
    assert.equal(loaded.links.length, DEFAULT_WORKSPACE.links.length);
    assert.equal(loaded.notes.length, DEFAULT_WORKSPACE.notes.length);
    assert.equal(loaded.tasks.length, DEFAULT_WORKSPACE.tasks.length);
    assert.equal(loaded.totpAccounts.length, DEFAULT_WORKSPACE.totpAccounts.length);
  });

  it('generates passwords matching length, charset rules, and ambiguous exclusion', async () => {
    const res = await generatePassword({
      length: 32,
      upper: true,
      lower: true,
      digits: true,
      symbols: false,
      excludeAmbiguous: true,
    });
    assert.equal(res.password.length, 32);
    assert.match(res.password, /^[A-Za-z0-9]+$/);
    for (const ch of ['0', 'O', '1', 'l', 'I']) {
      assert.equal(res.password.includes(ch), false, `Must exclude ambiguous char ${ch}`);
    }
    assert.ok(res.entropyBits > 150);
    assert.equal(res.strengthLabel, 'Криптостойкий');
  });

  it('throws when no character set is enabled in password generator', async () => {
    await assert.rejects(
      () =>
        generatePassword({
          length: 16,
          upper: false,
          lower: false,
          digits: false,
          symbols: false,
          excludeAmbiguous: false,
        }),
      /Выберите хотя бы один набор символов/,
    );
  });

  it('matches RFC 6238 official TOTP SHA1 test vectors', async () => {
    // ASCII "12345678901234567890" in Base32
    const secretSha1 = 'GEZDGNBVGY3TQOJQGEZDGNBVGY3TQOJQ';
    const r1 = await computeTotp(secretSha1, 8, 30, 'SHA1', 59);
    assert.equal(r1.code, '94287082');
    assert.equal(r1.remainingSeconds, 1);

    const r2 = await computeTotp(secretSha1, 8, 30, 'SHA1', 1111111109);
    assert.equal(r2.code, '07081804');

    const r3 = await computeTotp(secretSha1, 8, 30, 'SHA1', 1234567890);
    assert.equal(r3.code, '89005924');
  });

  it('parses valid otpauth:// URI including percent-encoded account email', async () => {
    const parsed = await parseOtpAuthUri(
      'otpauth://totp/GitHub:dev%40company.ru?secret=jbswy3dpehpk3pxp&issuer=GitHub&digits=6&period=30&algorithm=SHA256',
    );
    assert.equal(parsed.issuer, 'GitHub');
    assert.equal(parsed.label, 'dev@company.ru');
    assert.equal(parsed.secret, 'JBSWY3DPEHPK3PXP');
    assert.equal(parsed.digits, 6);
    assert.equal(parsed.period, 30);
    assert.equal(parsed.algorithm, 'SHA256');
  });

  it('rejects invalid otpauth:// URIs', async () => {
    await assert.rejects(
      () => parseOtpAuthUri('https://example.com/?secret=ABC'),
      /otpauth:\/\//,
    );
    await assert.rejects(
      () => parseOtpAuthUri('otpauth://totp/Test:user'),
      /secret/,
    );
  });

  it('generates valid OAuth 2.0 PKCE S256 verifier/challenge pairs', async () => {
    const pair = await generatePkcePair();
    assert.ok(pair.codeVerifier.length >= 43);
    assert.ok(pair.state.length >= 16);
    assert.ok(pair.nonce.length >= 16);

    // Independently verify code_challenge == Base64URL(SHA-256(code_verifier))
    const encoded = new TextEncoder().encode(pair.codeVerifier);
    const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoded));
    let binary = '';
    for (const b of digest) binary += String.fromCharCode(b);
    const expected = btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
    assert.equal(pair.codeChallenge, expected);
  });

  it('encodes and decodes Base64 with Cyrillic UTF-8, URL-safe, and no-padding', async () => {
    const sample = 'Привет, WorkDesk! {"status":"ok","emoji":"✓"}';
    const std = await encodeBase64(sample, false, false);
    assert.equal(await decodeBase64(std, false), sample);

    const urlSafe = await encodeBase64(sample, true, true);
    assert.equal(urlSafe.includes('+'), false);
    assert.equal(urlSafe.includes('/'), false);
    assert.equal(urlSafe.includes('='), false);
    assert.equal(await decodeBase64(urlSafe, true), sample);
  });

  it('rejects malformed Base64 input cleanly', async () => {
    await assert.rejects(() => decodeBase64('!invalid!', false));
  });
});
