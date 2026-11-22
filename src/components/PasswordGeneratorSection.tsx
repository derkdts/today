import {useCallback, useEffect, useState} from 'react';
import {Check, Copy, Eye, EyeOff, RefreshCw, Trash2} from 'lucide-react';
import {generatePassword} from '../lib/tauriBridge';

interface PasswordGeneratorSectionProps {
  copiedId: string | null;
  onCopy: (text: string, id: string, sensitive?: boolean) => void;
  clipboardAutoClearSec: number;
}

interface HistoryEntry {
  id: string;
  value: string;
  entropyBits: number;
  strengthLabel: string;
  createdAt: string;
}

const PASSPHRASE_WORDS = [
  'amber', 'anchor', 'atlas', 'beacon', 'binary', 'breeze', 'bridge', 'canyon',
  'carbon', 'cedar', 'cipher', 'cobalt', 'comet', 'copper', 'corvus', 'delta',
  'drift', 'ember', 'falcon', 'fjord', 'forest', 'forge', 'frost', 'glacier',
  'granite', 'harbor', 'horizon', 'index', 'indigo', 'kernel', 'kestrel', 'lantern',
  'lattice', 'lumen', 'matrix', 'meadow', 'meridian', 'meteor', 'mirror', 'nebula',
  'nexus', 'nordic', 'obsidian', 'orbit', 'origin', 'osprey', 'ozone', 'parsec',
  'pebble', 'photon', 'pioneer', 'pixel', 'planet', 'prism', 'pulse', 'quartz',
  'quasar', 'radar', 'raven', 'ridge', 'ripple', 'river', 'rocket', 'saffron',
  'saturn', 'sector', 'shadow', 'signal', 'silver', 'slate', 'solar', 'spark',
  'spectrum', 'spiral', 'sprint', 'spruce', 'summit', 'syntax', 'tangent', 'timber',
  'topaz', 'torrent', 'transit', 'tundra', 'tunnel', 'vector', 'velvet', 'vertex',
  'vessel', 'vortex', 'warden', 'willow', 'winter', 'zenith', 'zephyr', 'zinc',
];

export function PasswordGeneratorSection({
  copiedId,
  onCopy,
  clipboardAutoClearSec,
}: PasswordGeneratorSectionProps) {
  const [mode, setMode] = useState<'password' | 'passphrase'>('password');
  const [length, setLength] = useState(20);
  const [upper, setUpper] = useState(true);
  const [lower, setLower] = useState(true);
  const [digits, setDigits] = useState(true);
  const [symbols, setSymbols] = useState(true);
  const [excludeAmbiguous, setExcludeAmbiguous] = useState(true);

  const [wordCount, setWordCount] = useState(5);
  const [separator, setSeparator] = useState('-');
  const [capitalizeWords, setCapitalizeWords] = useState(false);

  const [password, setPassword] = useState('');
  const [entropyBits, setEntropyBits] = useState(0);
  const [strengthLabel, setStrengthLabel] = useState('Криптостойкий');
  const [error, setError] = useState('');
  const [history, setHistory] = useState<HistoryEntry[]>([]);
  const [revealHistory, setRevealHistory] = useState(false);

  const pushHistory = useCallback((val: string, ent: number, label: string) => {
    const time = new Date().toLocaleTimeString('ru-RU', {
      hour: '2-digit',
      minute: '2-digit',
      second: '2-digit',
    });
    setHistory((prev) => [
      {
        id: `pw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
        value: val,
        entropyBits: ent,
        strengthLabel: label,
        createdAt: time,
      },
      ...prev.slice(0, 7),
    ]);
  }, []);

  const handleGenerate = useCallback(
    async (recordHistory = true) => {
      setError('');
      try {
        if (mode === 'password') {
          const res = await generatePassword({
            length,
            upper,
            lower,
            digits,
            symbols,
            excludeAmbiguous,
          });
          setPassword(res.password);
          setEntropyBits(res.entropyBits);
          setStrengthLabel(res.strengthLabel);
          if (recordHistory) {
            pushHistory(res.password, res.entropyBits, res.strengthLabel);
          }
        } else {
          const buf = new Uint32Array(wordCount);
          crypto.getRandomValues(buf);
          const words = Array.from(buf).map((val) => {
            const w = PASSPHRASE_WORDS[val % PASSPHRASE_WORDS.length];
            return capitalizeWords ? w[0].toUpperCase() + w.slice(1) : w;
          });
          const phrase = words.join(separator);
          const ent = wordCount * Math.log2(PASSPHRASE_WORDS.length);
          const label = ent >= 64 ? 'Криптостойкий' : 'Надёжный';
          setPassword(phrase);
          setEntropyBits(ent);
          setStrengthLabel(label);
          if (recordHistory) {
            pushHistory(phrase, ent, label);
          }
        }
      } catch (err) {
        setError(err instanceof Error ? err.message : 'Ошибка генерации пароля');
      }
    },
    [
      mode,
      length,
      upper,
      lower,
      digits,
      symbols,
      excludeAmbiguous,
      wordCount,
      separator,
      capitalizeWords,
      pushHistory,
    ],
  );

  useEffect(() => {
    handleGenerate(false);
  }, [handleGenerate]);

  const strengthPercent = Math.min(100, Math.round((entropyBits / 128) * 100));
  const strengthColor =
    entropyBits < 40
      ? 'bg-red-600'
      : entropyBits < 64
        ? 'bg-amber-500'
        : entropyBits < 96
          ? 'bg-blue-600'
          : 'bg-emerald-600';

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Генератор паролей
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Криптостойкая генерация на базе системного CSPRNG
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900 self-start">
          <button
            type="button"
            onClick={() => setMode('password')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              mode === 'password'
                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            Символьный пароль
          </button>
          <button
            type="button"
            onClick={() => setMode('passphrase')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              mode === 'passphrase'
                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            Кодовая фраза
          </button>
        </div>
      </div>

      {/* Main Output Display */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <div className="min-w-0 flex-1 rounded-lg border border-zinc-200 bg-zinc-50 px-4 py-3.5 dark:border-zinc-800 dark:bg-zinc-950">
            <p className="break-all font-mono text-lg font-medium tracking-wide text-zinc-900 dark:text-zinc-50">
              {password || '—'}
            </p>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={() => handleGenerate(true)}
              className="inline-flex h-11 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-4 text-sm font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
            >
              <RefreshCw className="h-4 w-4" />
              Обновить
            </button>
            <button
              type="button"
              onClick={() => onCopy(password, 'main-pw', true)}
              disabled={!password}
              className="inline-flex h-11 items-center gap-2 rounded-lg bg-blue-600 px-4 text-sm font-medium text-white hover:bg-blue-700 disabled:opacity-50 whitespace-nowrap shrink-0"
            >
              {copiedId === 'main-pw' ? (
                <>
                  <Check className="h-4 w-4" />
                  Скопировано
                </>
              ) : (
                <>
                  <Copy className="h-4 w-4" />
                  Копировать
                </>
              )}
            </button>
          </div>
        </div>

        {/* Strength & Entropy Bar */}
        <div className="mt-4 space-y-2">
          <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
            <div className="flex items-center gap-2 text-zinc-600 dark:text-zinc-400">
              <span>Стойкость:</span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100">
                {strengthLabel}
              </span>
            </div>
            <div className="flex items-center gap-2 text-zinc-500 dark:text-zinc-400 tabular-nums">
              <span>Энтропия: {entropyBits.toFixed(1)} бит</span>
              {clipboardAutoClearSec > 0 && (
                <>
                  <span aria-hidden="true">·</span>
                  <span>Очистка буфера через {clipboardAutoClearSec} с</span>
                </>
              )}
            </div>
          </div>

          <div className="h-1.5 w-full overflow-hidden rounded-full bg-zinc-200 dark:bg-zinc-800">
            <div
              className={`h-full transition-all duration-200 ${strengthColor}`}
              style={{width: `${strengthPercent}%`}}
            />
          </div>
        </div>

        {error && (
          <p className="mt-3 text-xs font-medium text-red-600 dark:text-red-400">{error}</p>
        )}
      </div>

      {/* Parameters Grid */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
            Параметры генерации
          </h2>

          {mode === 'password' ? (
            <div className="mt-4 space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-zinc-700 dark:text-zinc-300">Длина пароля</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                    {length} симв.
                  </span>
                </div>
                <input
                  type="range"
                  min={8}
                  max={64}
                  value={length}
                  onChange={(e) => setLength(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
                <div className="mt-1 flex justify-between text-xs text-zinc-400 tabular-nums">
                  <span>8</span>
                  <span>24</span>
                  <span>40</span>
                  <span>64</span>
                </div>
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                {[
                  {
                    label: 'Заглавные буквы (A–Z)',
                    checked: upper,
                    onChange: setUpper,
                  },
                  {
                    label: 'Строчные буквы (a–z)',
                    checked: lower,
                    onChange: setLower,
                  },
                  {
                    label: 'Цифры (0–9)',
                    checked: digits,
                    onChange: setDigits,
                  },
                  {
                    label: 'Спецсимволы (!@#$...)',
                    checked: symbols,
                    onChange: setSymbols,
                  },
                  {
                    label: 'Исключить похожие (0O1lI)',
                    checked: excludeAmbiguous,
                    onChange: setExcludeAmbiguous,
                  },
                ].map((opt) => (
                  <label
                    key={opt.label}
                    className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800/50"
                  >
                    <span>{opt.label}</span>
                    <input
                      type="checkbox"
                      checked={opt.checked}
                      onChange={(e) => opt.onChange(e.target.checked)}
                      className="h-4 w-4 rounded accent-blue-600"
                    />
                  </label>
                ))}
              </div>
            </div>
          ) : (
            <div className="mt-4 space-y-5">
              <div>
                <div className="mb-2 flex items-center justify-between text-sm">
                  <span className="text-zinc-700 dark:text-zinc-300">Количество слов</span>
                  <span className="font-mono font-semibold text-zinc-900 dark:text-zinc-50 tabular-nums">
                    {wordCount} слов
                  </span>
                </div>
                <input
                  type="range"
                  min={3}
                  max={10}
                  value={wordCount}
                  onChange={(e) => setWordCount(Number(e.target.value))}
                  className="w-full accent-blue-600"
                />
              </div>

              <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
                    Разделитель
                  </label>
                  <select
                    value={separator}
                    onChange={(e) => setSeparator(e.target.value)}
                    className="w-full rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-800 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-200"
                  >
                    <option value="-">Дефис (-)</option>
                    <option value=".">Точка (.)</option>
                    <option value="_">Подчёркивание (_)</option>
                    <option value=" ">Пробел ( )</option>
                  </select>
                </div>

                <label className="flex cursor-pointer items-center justify-between rounded-lg border border-zinc-200 px-3.5 py-2.5 text-sm text-zinc-800 hover:bg-zinc-50 dark:border-zinc-800 dark:text-zinc-200 dark:hover:bg-zinc-800/50 self-end">
                  <span>С заглавной буквы</span>
                  <input
                    type="checkbox"
                    checked={capitalizeWords}
                    onChange={(e) => setCapitalizeWords(e.target.checked)}
                    className="h-4 w-4 rounded accent-blue-600"
                  />
                </label>
              </div>
            </div>
          )}
        </div>

        {/* Session History */}
        <div className="lg:col-span-5 rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
          <div className="flex items-center justify-between">
            <h2 className="text-sm font-semibold text-zinc-900 dark:text-zinc-50">
              История сеанса
            </h2>
            <div className="flex items-center gap-1">
              <button
                type="button"
                onClick={() => setRevealHistory((v) => !v)}
                className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:text-zinc-400 dark:hover:bg-zinc-800"
                title={revealHistory ? 'Скрыть пароли' : 'Показать пароли'}
              >
                {revealHistory ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
              </button>
              {history.length > 0 && (
                <button
                  type="button"
                  onClick={() => setHistory([])}
                  className="inline-flex h-8 w-8 items-center justify-center rounded-lg text-zinc-500 hover:bg-red-50 hover:text-red-600 dark:text-zinc-400 dark:hover:bg-red-950/40"
                  title="Очистить историю"
                >
                  <Trash2 className="h-4 w-4" />
                </button>
              )}
            </div>
          </div>

          {history.length === 0 ? (
            <p className="mt-6 text-center text-xs text-zinc-500 dark:text-zinc-400">
              Нажмите «Обновить», чтобы сохранить сгенерированные варианты в историю текущей сессии.
            </p>
          ) : (
            <div className="mt-3 divide-y divide-zinc-200 dark:divide-zinc-800">
              {history.map((entry) => (
                <div key={entry.id} className="flex items-center justify-between gap-2 py-2.5">
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-mono text-xs text-zinc-800 dark:text-zinc-200">
                      {revealHistory ? entry.value : '••••••••••••••••'}
                    </p>
                    <p className="mt-0.5 text-[11px] text-zinc-500 dark:text-zinc-400 tabular-nums">
                      {entry.createdAt} · {entry.entropyBits.toFixed(0)} бит
                    </p>
                  </div>
                  <button
                    type="button"
                    onClick={() => onCopy(entry.value, entry.id, true)}
                    className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800"
                    title="Копировать"
                  >
                    {copiedId === entry.id ? (
                      <Check className="h-3.5 w-3.5 text-emerald-600 dark:text-emerald-400" />
                    ) : (
                      <Copy className="h-3.5 w-3.5" />
                    )}
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
