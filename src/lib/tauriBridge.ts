import {
  AppRuntimeInfo,
  ParsedOtpAuthUri,
  PasswordResult,
  PkcePair,
  TotpCodeResult,
  WorkspaceData,
} from '../types/workspace';

const STORAGE_KEY = 'workdesk_workspace_v1';

export function isTauriRuntime(): boolean {
  return typeof window !== 'undefined' && '__TAURI_INTERNALS__' in window;
}

async function tauriInvoke<T>(cmd: string, args?: Record<string, unknown>): Promise<T> {
  const {invoke} = await import('@tauri-apps/api/core');
  return invoke<T>(cmd, args);
}

export async function loadWorkspace(): Promise<WorkspaceData | null> {
  if (isTauriRuntime()) {
    return tauriInvoke<WorkspaceData | null>('load_workspace');
  }
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return null;
    return JSON.parse(raw) as WorkspaceData;
  } catch {
    return null;
  }
}

export async function saveWorkspace(data: WorkspaceData): Promise<void> {
  if (isTauriRuntime()) {
    await tauriInvoke<void>('save_workspace', {data});
    return;
  }
  localStorage.setItem(STORAGE_KEY, JSON.stringify(data));
}

export async function openExternalUrl(url: string): Promise<void> {
  if (isTauriRuntime()) {
    const {openUrl} = await import('@tauri-apps/plugin-opener');
    await openUrl(url);
    return;
  }
  const a = document.createElement('a');
  a.href = url;
  a.target = '_blank';
  a.rel = 'noopener noreferrer';
  a.click();
}

export async function generatePassword(params: {
  length: number;
  upper: boolean;
  lower: boolean;
  digits: boolean;
  symbols: boolean;
  excludeAmbiguous: boolean;
}): Promise<PasswordResult> {
  if (isTauriRuntime()) {
    return tauriInvoke<PasswordResult>('generate_password', params);
  }

  const ambiguous = new Set(['0', 'O', '1', 'l', 'I']);
  let charset = '';
  const appendFiltered = (src: string) => {
    for (const ch of src) {
      if (params.excludeAmbiguous && ambiguous.has(ch)) continue;
      charset += ch;
    }
  };
  if (params.upper) appendFiltered('ABCDEFGHIJKLMNOPQRSTUVWXYZ');
  if (params.lower) appendFiltered('abcdefghijklmnopqrstuvwxyz');
  if (params.digits) appendFiltered('0123456789');
  if (params.symbols) appendFiltered('!@#$%^&*()-_=+[]{};:,.<>?');

  if (!charset) {
    throw new Error('Выберите хотя бы один набор символов');
  }

  const randomValues = new Uint32Array(params.length);
  crypto.getRandomValues(randomValues);

  let password = '';
  for (let i = 0; i < params.length; i++) {
    password += charset[randomValues[i] % charset.length];
  }

  const entropyBits = params.length * Math.log2(charset.length);
  let strengthLabel = 'Криптостойкий';
  if (entropyBits < 40) strengthLabel = 'Слабый';
  else if (entropyBits < 64) strengthLabel = 'Средний';
  else if (entropyBits < 96) strengthLabel = 'Надёжный';

  return {password, entropyBits, strengthLabel};
}

function decodeBase32(input: string): Uint8Array {
  const alphabet = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567';
  const cleaned = input.trim().replace(/[\s-]/g, '').replace(/=+$/, '').toUpperCase();
  if (!cleaned) throw new Error('Секретный ключ пуст');

  let bits = 0;
  let value = 0;
  const output: number[] = [];

  for (const char of cleaned) {
    const idx = alphabet.indexOf(char);
    if (idx === -1) {
      throw new Error('Некорректный Base32-секрет');
    }
    value = (value << 5) | idx;
    bits += 5;
    if (bits >= 8) {
      output.push((value >>> (bits - 8)) & 0xff);
      bits -= 8;
    }
  }
  return new Uint8Array(output);
}

async function hmacHotp(
  secretBytes: Uint8Array,
  counter: number,
  digits: number,
  algorithm: 'SHA1' | 'SHA256' | 'SHA512',
): Promise<string> {
  const algoName =
    algorithm === 'SHA256' ? 'SHA-256' : algorithm === 'SHA512' ? 'SHA-512' : 'SHA-1';

  const key = await crypto.subtle.importKey(
    'raw',
    secretBytes as BufferSource,
    {name: 'HMAC', hash: {name: algoName}},
    false,
    ['sign'],
  );

  const counterBuf = new ArrayBuffer(8);
  const view = new DataView(counterBuf);
  const high = Math.floor(counter / 0x100000000);
  const low = counter >>> 0;
  view.setUint32(0, high, false);
  view.setUint32(4, low, false);

  const sig = new Uint8Array(await crypto.subtle.sign('HMAC', key, counterBuf));
  const offset = sig[sig.length - 1] & 0x0f;
  const binary =
    ((sig[offset] & 0x7f) << 24) |
    ((sig[offset + 1] & 0xff) << 16) |
    ((sig[offset + 2] & 0xff) << 8) |
    (sig[offset + 3] & 0xff);

  const safeDigits = Math.min(8, Math.max(6, digits));
  const mod = 10 ** safeDigits;
  return String(binary % mod).padStart(safeDigits, '0');
}

export async function computeTotp(
  secret: string,
  digits = 6,
  period = 30,
  algorithm: 'SHA1' | 'SHA256' | 'SHA512' = 'SHA1',
): Promise<TotpCodeResult> {
  if (isTauriRuntime()) {
    return tauriInvoke<TotpCodeResult>('compute_totp', {
      secret,
      digits,
      period,
      algorithm,
    });
  }

  const secretBytes = decodeBase32(secret);
  const safePeriod = period > 0 ? period : 30;
  const nowSec = Math.floor(Date.now() / 1000);
  const counter = Math.floor(nowSec / safePeriod);
  const remainingSeconds = safePeriod - (nowSec % safePeriod);

  const [code, nextCode] = await Promise.all([
    hmacHotp(secretBytes, counter, digits, algorithm),
    hmacHotp(secretBytes, counter + 1, digits, algorithm),
  ]);

  return {code, nextCode, remainingSeconds, period: safePeriod};
}

export async function parseOtpAuthUri(uri: string): Promise<ParsedOtpAuthUri> {
  if (isTauriRuntime()) {
    return tauriInvoke<ParsedOtpAuthUri>('parse_otpauth_uri', {uri});
  }
  let parsed: URL;
  try {
    parsed = new URL(uri.trim());
  } catch {
    throw new Error('Некорректный формат otpauth:// URI');
  }
  if (parsed.protocol !== 'otpauth:') {
    throw new Error('URI должен начинаться с otpauth://');
  }
  const rawLabel = decodeURIComponent(parsed.pathname.replace(/^\/+/, ''));
  let issuer = '';
  let label = rawLabel;
  if (rawLabel.includes(':')) {
    const idx = rawLabel.indexOf(':');
    issuer = rawLabel.slice(0, idx).trim();
    label = rawLabel.slice(idx + 1).trim();
  }
  const secret = (parsed.searchParams.get('secret') || '').trim().toUpperCase();
  if (!secret) throw new Error('В URI отсутствует параметр secret');
  const queryIssuer = (parsed.searchParams.get('issuer') || '').trim();
  if (queryIssuer) issuer = queryIssuer;
  if (!issuer) issuer = 'Сервис';

  const digitsParam = Number(parsed.searchParams.get('digits') || '6');
  const periodParam = Number(parsed.searchParams.get('period') || '30');
  const algoParam = (parsed.searchParams.get('algorithm') || 'SHA1').toUpperCase();
  const algorithm: 'SHA1' | 'SHA256' | 'SHA512' =
    algoParam === 'SHA256' || algoParam === 'SHA512' ? algoParam : 'SHA1';

  return {
    issuer,
    label,
    secret,
    digits: Number.isFinite(digitsParam) ? Math.min(8, Math.max(6, digitsParam)) : 6,
    period: Number.isFinite(periodParam) && periodParam > 0 ? periodParam : 30,
    algorithm,
  };
}

function toBase64Url(bytes: Uint8Array): string {
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return btoa(binary).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

export async function generatePkcePair(): Promise<PkcePair> {
  if (isTauriRuntime()) {
    return tauriInvoke<PkcePair>('generate_pkce_pair');
  }
  const verifierBytes = new Uint8Array(48);
  const stateBytes = new Uint8Array(24);
  const nonceBytes = new Uint8Array(24);
  crypto.getRandomValues(verifierBytes);
  crypto.getRandomValues(stateBytes);
  crypto.getRandomValues(nonceBytes);

  const codeVerifier = toBase64Url(verifierBytes);
  const encoded = new TextEncoder().encode(codeVerifier);
  const digest = new Uint8Array(await crypto.subtle.digest('SHA-256', encoded));
  const codeChallenge = toBase64Url(digest);

  return {
    codeVerifier,
    codeChallenge,
    state: toBase64Url(stateBytes),
    nonce: toBase64Url(nonceBytes),
  };
}

export async function encodeBase64(
  input: string,
  urlSafe: boolean,
  noPadding: boolean,
): Promise<string> {
  if (isTauriRuntime()) {
    return tauriInvoke<string>('encode_base64', {input, urlSafe, noPadding});
  }
  const bytes = new TextEncoder().encode(input);
  let binary = '';
  for (let i = 0; i < bytes.length; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  let result = btoa(binary);
  if (urlSafe) {
    result = result.replace(/\+/g, '-').replace(/\//g, '_');
  }
  if (noPadding) {
    result = result.replace(/=+$/, '');
  }
  return result;
}

export async function decodeBase64(input: string, urlSafe: boolean): Promise<string> {
  if (isTauriRuntime()) {
    return tauriInvoke<string>('decode_base64', {input, urlSafe});
  }
  const cleaned = input.replace(/\s+/g, '');
  let std = cleaned.replace(/-/g, '+').replace(/_/g, '/');
  const pad = std.length % 4;
  if (pad === 2) std += '==';
  else if (pad === 3) std += '=';
  else if (pad === 1) throw new Error('Некорректная длина строки Base64');

  try {
    const binary = atob(std);
    const bytes = new Uint8Array(binary.length);
    for (let i = 0; i < binary.length; i++) {
      bytes[i] = binary.charCodeAt(i);
    }
    return new TextDecoder('utf-8', {fatal: true}).decode(bytes);
  } catch {
    throw new Error('Некорректная строка Base64 или неверная кодировка UTF-8');
  }
}

export async function getRuntimeInfo(): Promise<AppRuntimeInfo> {
  if (isTauriRuntime()) {
    const info = await tauriInvoke<Omit<AppRuntimeInfo, 'isTauri'>>('get_app_info');
    return {...info, isTauri: true};
  }
  return {
    os: navigator.platform || 'Web Browser',
    arch: 'wasm / js',
    appVersion: '1.0.0',
    storagePath: 'localStorage (workdesk_workspace_v1)',
    isTauri: false,
  };
}
