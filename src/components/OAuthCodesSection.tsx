import {useCallback, useEffect, useMemo, useState} from 'react';
import {Check, Copy, KeyRound, Plus, RefreshCw, Search, Trash2, X} from 'lucide-react';
import {
  computeTotp,
  generatePkcePair,
  parseOtpAuthUri,
} from '../lib/tauriBridge';
import {PkcePair, TotpAccount, TotpCodeResult} from '../types/workspace';

interface OAuthCodesSectionProps {
  accounts: TotpAccount[];
  confirmBeforeDelete: boolean;
  copiedId: string | null;
  onCopy: (text: string, id: string, sensitive?: boolean) => void;
  onChange: (next: TotpAccount[]) => void;
}

function formatOtpCode(code: string): string {
  if (code.length === 6) return `${code.slice(0, 3)} ${code.slice(3)}`;
  if (code.length === 8) return `${code.slice(0, 4)} ${code.slice(4)}`;
  return code;
}

export function OAuthCodesSection({
  accounts,
  confirmBeforeDelete,
  copiedId,
  onCopy,
  onChange,
}: OAuthCodesSectionProps) {
  const [activeTab, setActiveTab] = useState<'totp' | 'pkce'>('totp');
  const [search, setSearch] = useState('');
  const [codes, setCodes] = useState<Record<string, TotpCodeResult>>({});
  const [codeErrors, setCodeErrors] = useState<Record<string, string>>({});

  // Add TOTP form
  const [isAddOpen, setIsAddOpen] = useState(false);
  const [uriInput, setUriInput] = useState('');
  const [issuer, setIssuer] = useState('');
  const [label, setLabel] = useState('');
  const [secret, setSecret] = useState('');
  const [digits, setDigits] = useState(6);
  const [period, setPeriod] = useState(30);
  const [algorithm, setAlgorithm] = useState<'SHA1' | 'SHA256' | 'SHA512'>('SHA1');
  const [formError, setFormError] = useState('');
  const [pendingDeleteId, setPendingDeleteId] = useState<string | null>(null);

  // PKCE Generator state
  const [pkce, setPkce] = useState<PkcePair | null>(null);
  const [authEndpoint, setAuthEndpoint] = useState('https://accounts.google.com/o/oauth2/v2/auth');
  const [clientId, setClientId] = useState('your-client-id');
  const [redirectUri, setRedirectUri] = useState('http://localhost:1420/callback');
  const [scope, setScope] = useState('openid profile email');

  const refreshTotpCodes = useCallback(async () => {
    const nextCodes: Record<string, TotpCodeResult> = {};
    const nextErrors: Record<string, string> = {};

    await Promise.all(
      accounts.map(async (acc) => {
        try {
          const res = await computeTotp(acc.secret, acc.digits, acc.period, acc.algorithm);
          nextCodes[acc.id] = res;
        } catch (err) {
          nextErrors[acc.id] = err instanceof Error ? err.message : 'Ошибка ключа';
        }
      }),
    );

    setCodes(nextCodes);
    setCodeErrors(nextErrors);
  }, [accounts]);

  useEffect(() => {
    refreshTotpCodes();
    const timer = window.setInterval(refreshTotpCodes, 1000);
    return () => window.clearInterval(timer);
  }, [refreshTotpCodes]);

  const refreshPkce = useCallback(async () => {
    const next = await generatePkcePair();
    setPkce(next);
  }, []);

  useEffect(() => {
    refreshPkce();
  }, [refreshPkce]);

  const handleParseUri = async () => {
    setFormError('');
    try {
      const parsed = await parseOtpAuthUri(uriInput);
      setIssuer(parsed.issuer);
      setLabel(parsed.label);
      setSecret(parsed.secret);
      setDigits(parsed.digits);
      setPeriod(parsed.period);
      setAlgorithm(parsed.algorithm);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Не удалось разобрать URI');
    }
  };

  const handleAddAccount = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError('');
    const trimmedIssuer = issuer.trim();
    const trimmedSecret = secret.trim().replace(/\s+/g, '').toUpperCase();
    if (!trimmedIssuer) {
      setFormError('Укажите название сервиса');
      return;
    }
    if (!trimmedSecret) {
      setFormError('Укажите Base32 секретный ключ');
      return;
    }

    try {
      await computeTotp(trimmedSecret, digits, period, algorithm);
    } catch (err) {
      setFormError(err instanceof Error ? err.message : 'Некорректный секретный ключ');
      return;
    }

    const next: TotpAccount = {
      id: `totp-${Date.now()}`,
      issuer: trimmedIssuer,
      label: label.trim() || 'Аккаунт',
      secret: trimmedSecret,
      digits,
      period,
      algorithm,
      createdAt: new Date().toISOString().slice(0, 10),
    };
    onChange([next, ...accounts]);
    setIsAddOpen(false);
    setUriInput('');
    setIssuer('');
    setLabel('');
    setSecret('');
    setDigits(6);
    setPeriod(30);
    setAlgorithm('SHA1');
  };

  const handleDelete = (id: string) => {
    if (confirmBeforeDelete && pendingDeleteId !== id) {
      setPendingDeleteId(id);
      return;
    }
    onChange(accounts.filter((a) => a.id !== id));
    setPendingDeleteId(null);
  };

  const filteredAccounts = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return accounts;
    return accounts.filter(
      (a) =>
        a.issuer.toLowerCase().includes(q) ||
        a.label.toLowerCase().includes(q),
    );
  }, [accounts, search]);

  const builtAuthUrl = useMemo(() => {
    if (!pkce) return '';
    try {
      const u = new URL(authEndpoint);
      u.searchParams.set('response_type', 'code');
      u.searchParams.set('client_id', clientId);
      u.searchParams.set('redirect_uri', redirectUri);
      u.searchParams.set('scope', scope);
      u.searchParams.set('state', pkce.state);
      u.searchParams.set('nonce', pkce.nonce);
      u.searchParams.set('code_challenge', pkce.codeChallenge);
      u.searchParams.set('code_challenge_method', 'S256');
      return u.toString();
    } catch {
      return '';
    }
  }, [pkce, authEndpoint, clientId, redirectUri, scope]);

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            OAuth и 2FA коды
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Локальный TOTP-аутентификатор (RFC 6238) и генератор OAuth 2.0 PKCE-параметров
          </p>
        </div>

        <div className="flex items-center gap-2 self-start">
          <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900">
            <button
              type="button"
              onClick={() => setActiveTab('totp')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'totp'
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              2FA Коды (TOTP)
            </button>
            <button
              type="button"
              onClick={() => setActiveTab('pkce')}
              className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                activeTab === 'pkce'
                  ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                  : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
              }`}
            >
              OAuth 2.0 PKCE
            </button>
          </div>
        </div>
      </div>

      {activeTab === 'totp' ? (
        <div className="space-y-4">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
            <div className="relative w-full sm:w-80">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-400" />
              <input
                type="text"
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Поиск сервиса или аккаунта..."
                className="w-full rounded-lg border border-zinc-200 bg-white py-2 pl-9 pr-3 text-sm text-zinc-900 placeholder:text-zinc-400 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-900 dark:text-zinc-100"
              />
            </div>

            <button
              type="button"
              onClick={() => setIsAddOpen((v) => !v)}
              className="inline-flex items-center justify-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
            >
              <Plus className="h-4 w-4" />
              Добавить 2FA ключ
            </button>
          </div>

          {isAddOpen && (
            <form
              onSubmit={handleAddAccount}
              className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <div className="mb-4 flex items-center justify-between">
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Новый TOTP-аккаунт
                </h2>
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-lg p-1.5 text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              {/* Optional otpauth:// URI parser */}
              <div className="mb-4 flex flex-col gap-2 sm:flex-row">
                <input
                  type="text"
                  value={uriInput}
                  onChange={(e) => setUriInput(e.target.value)}
                  placeholder="Вставьте otpauth://totp/... URI для автозаполнения"
                  className="flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-900 focus:border-blue-600 focus:bg-white focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
                <button
                  type="button"
                  onClick={handleParseUri}
                  className="rounded-lg border border-zinc-200 bg-zinc-50 px-3.5 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-100 dark:border-zinc-700 dark:bg-zinc-800 dark:text-zinc-200 whitespace-nowrap shrink-0"
                >
                  Разобрать URI
                </button>
              </div>

              <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Сервис
                  </label>
                  <input
                    type="text"
                    value={issuer}
                    onChange={(e) => setIssuer(e.target.value)}
                    placeholder="GitHub, AWS, GitLab"
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Аккаунт / Email
                  </label>
                  <input
                    type="text"
                    value={label}
                    onChange={(e) => setLabel(e.target.value)}
                    placeholder="dev@company.ru"
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Секретный ключ (Base32)
                  </label>
                  <input
                    type="text"
                    value={secret}
                    onChange={(e) => setSecret(e.target.value)}
                    placeholder="JBSWY3DPEHPK3PXP"
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 focus:border-blue-600 focus:outline-none dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Цифр в коде
                  </label>
                  <select
                    value={digits}
                    onChange={(e) => setDigits(Number(e.target.value))}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value={6}>6 цифр</option>
                    <option value={8}>8 цифр</option>
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Период (сек)
                  </label>
                  <input
                    type="number"
                    min={10}
                    max={120}
                    value={period}
                    onChange={(e) => setPeriod(Number(e.target.value) || 30)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  />
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-700 dark:text-zinc-300">
                    Алгоритм HMAC
                  </label>
                  <select
                    value={algorithm}
                    onChange={(e) =>
                      setAlgorithm(e.target.value as 'SHA1' | 'SHA256' | 'SHA512')
                    }
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                  >
                    <option value="SHA1">SHA1</option>
                    <option value="SHA256">SHA256</option>
                    <option value="SHA512">SHA512</option>
                  </select>
                </div>
              </div>

              {formError && (
                <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400">
                  {formError}
                </p>
              )}

              <div className="mt-4 flex justify-end gap-2">
                <button
                  type="button"
                  onClick={() => setIsAddOpen(false)}
                  className="rounded-lg border border-zinc-200 px-4 py-2 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300"
                >
                  Отмена
                </button>
                <button
                  type="submit"
                  className="rounded-lg bg-blue-600 px-4 py-2 text-sm font-medium text-white hover:bg-blue-700"
                >
                  Сохранить ключ
                </button>
              </div>
            </form>
          )}

          {filteredAccounts.length === 0 ? (
            <div className="rounded-xl border border-zinc-200 bg-white px-6 py-12 text-center dark:border-zinc-800 dark:bg-zinc-900">
              <KeyRound className="mx-auto h-7 w-7 text-zinc-400" />
              <p className="mt-2 text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Нет сохранённых 2FA ключей
              </p>
              <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
                Добавьте Base32-ключ вручную или вставьте ссылку otpauth://totp/...
              </p>
            </div>
          ) : (
            <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {filteredAccounts.map((acc) => {
                const res = codes[acc.id];
                const err = codeErrors[acc.id];
                const pct = res
                  ? Math.max(0, Math.min(100, (res.remainingSeconds / res.period) * 100))
                  : 0;
                const expiring = res ? res.remainingSeconds <= 5 : false;

                return (
                  <div
                    key={acc.id}
                    className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900"
                  >
                    <div className="flex items-start justify-between gap-3">
                      <div className="min-w-0">
                        <h3 className="truncate text-base font-semibold text-zinc-900 dark:text-zinc-50">
                          {acc.issuer}
                        </h3>
                        <p className="mt-0.5 truncate text-xs text-zinc-500 dark:text-zinc-400">
                          {acc.label} · {acc.algorithm} · {acc.digits} цифр
                        </p>
                      </div>

                      {pendingDeleteId === acc.id ? (
                        <button
                          type="button"
                          onClick={() => handleDelete(acc.id)}
                          className="rounded-lg bg-red-600 px-2.5 py-1 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap shrink-0"
                        >
                          Удалить?
                        </button>
                      ) : (
                        <button
                          type="button"
                          onClick={() => handleDelete(acc.id)}
                          className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-400 hover:bg-red-50 hover:text-red-600 dark:hover:bg-red-950/40"
                          title="Удалить ключ"
                        >
                          <Trash2 className="h-4 w-4" />
                        </button>
                      )}
                    </div>

                    {err ? (
                      <p className="mt-4 text-xs font-medium text-red-600 dark:text-red-400">
                        {err}
                      </p>
                    ) : (
                      <div className="mt-4">
                        <div className="flex items-center justify-between gap-3">
                          <button
                            type="button"
                            onClick={() => res && onCopy(res.code, acc.id, true)}
                            className="group flex items-center gap-3 text-left"
                            title="Нажмите, чтобы скопировать код"
                          >
                            <span
                              className={`font-mono text-3xl font-semibold tracking-wider tabular-nums ${
                                expiring
                                  ? 'text-amber-600 dark:text-amber-400'
                                  : 'text-zinc-900 dark:text-zinc-50'
                              }`}
                            >
                              {res ? formatOtpCode(res.code) : '--- ---'}
                            </span>
                          </button>

                          <button
                            type="button"
                            onClick={() => res && onCopy(res.code, acc.id, true)}
                            className="inline-flex h-9 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
                          >
                            {copiedId === acc.id ? (
                              <>
                                <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                                Скопировано
                              </>
                            ) : (
                              <>
                                <Copy className="h-3.5 w-3.5" />
                                Копировать
                              </>
                            )}
                          </button>
                        </div>

                        <div className="mt-3 space-y-1.5">
                          <div className="flex items-center justify-between text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                            <span>
                              Следующий:{' '}
                              <span className="font-mono text-zinc-700 dark:text-zinc-300">
                                {res ? formatOtpCode(res.nextCode) : '---'}
                              </span>
                            </span>
                            <span
                              className={
                                expiring ? 'font-medium text-amber-600 dark:text-amber-400' : ''
                              }
                            >
                              {res ? `${res.remainingSeconds} с` : '—'}
                            </span>
                          </div>
                          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
                            <div
                              className={`h-full transition-all duration-300 ${
                                expiring ? 'bg-amber-500' : 'bg-blue-600'
                              }`}
                              style={{width: `${pct}%`}}
                            />
                          </div>
                        </div>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          )}
        </div>
      ) : (
        /* OAuth 2.0 / PKCE Generator */
        <div className="space-y-4">
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
              <div>
                <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
                  Генератор OAuth 2.0 PKCE (S256)
                </h2>
                <p className="mt-0.5 text-xs text-zinc-500 dark:text-zinc-400">
                  Криптографически случайные параметры для тестирования Authorization Code Flow
                </p>
              </div>
              <button
                type="button"
                onClick={refreshPkce}
                className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0 self-start"
              >
                <RefreshCw className="h-3.5 w-3.5" />
                Сгенерировать новую пару
              </button>
            </div>

            {pkce && (
              <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
                {[
                  {id: 'verifier', label: 'code_verifier', value: pkce.codeVerifier},
                  {id: 'challenge', label: 'code_challenge (S256)', value: pkce.codeChallenge},
                  {id: 'state', label: 'state', value: pkce.state},
                  {id: 'nonce', label: 'nonce', value: pkce.nonce},
                ].map((row) => (
                  <div
                    key={row.id}
                    className="flex flex-col gap-2 py-3 sm:flex-row sm:items-center sm:justify-between"
                  >
                    <div className="min-w-0 flex-1">
                      <p className="text-xs font-medium text-zinc-500 dark:text-zinc-400">
                        {row.label}
                      </p>
                      <p className="mt-0.5 break-all font-mono text-xs text-zinc-900 dark:text-zinc-100">
                        {row.value}
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => onCopy(row.value, `pkce-${row.id}`, true)}
                      className="inline-flex h-8 items-center gap-1.5 rounded-lg border border-zinc-200 px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0 self-start sm:self-center"
                    >
                      {copiedId === `pkce-${row.id}` ? (
                        <>
                          <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                          Скопировано
                        </>
                      ) : (
                        <>
                          <Copy className="h-3.5 w-3.5" />
                          Копировать
                        </>
                      )}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Auth URL Builder */}
          <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
            <h3 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              Сборка Authorization URL
            </h3>
            <div className="mt-3 grid gap-3 sm:grid-cols-2">
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Authorization Endpoint
                </label>
                <input
                  type="text"
                  value={authEndpoint}
                  onChange={(e) => setAuthEndpoint(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Client ID
                </label>
                <input
                  type="text"
                  value={clientId}
                  onChange={(e) => setClientId(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Redirect URI
                </label>
                <input
                  type="text"
                  value={redirectUri}
                  onChange={(e) => setRedirectUri(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
              <div>
                <label className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                  Scopes
                </label>
                <input
                  type="text"
                  value={scope}
                  onChange={(e) => setScope(e.target.value)}
                  className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 font-mono text-xs text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100"
                />
              </div>
            </div>

            <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
              <div className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 p-3 font-mono text-xs break-all text-zinc-700 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-300">
                {builtAuthUrl || 'Укажите корректный Authorization Endpoint'}
              </div>
              <button
                type="button"
                disabled={!builtAuthUrl}
                onClick={() => onCopy(builtAuthUrl, 'pkce-url')}
                className="inline-flex h-10 items-center gap-1.5 rounded-lg border border-zinc-200 px-3.5 text-xs font-medium text-zinc-800 hover:bg-zinc-50 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
              >
                {copiedId === 'pkce-url' ? (
                  <>
                    <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    Скопировано
                  </>
                ) : (
                  <>
                    <Copy className="h-3.5 w-3.5" />
                    Копировать URL
                  </>
                )}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
