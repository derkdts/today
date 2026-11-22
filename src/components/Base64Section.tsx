import {useEffect, useState} from 'react';
import {ArrowLeftRight, Check, Copy, FileUp, Trash2} from 'lucide-react';
import {decodeBase64, encodeBase64} from '../lib/tauriBridge';

interface Base64SectionProps {
  copiedId: string | null;
  onCopy: (text: string, id: string) => void;
}

export function Base64Section({copiedId, onCopy}: Base64SectionProps) {
  const [mode, setMode] = useState<'encode' | 'decode'>('encode');
  const [input, setInput] = useState('{"service":"workdesk","status":"ok","lang":"ru"}');
  const [output, setOutput] = useState('');
  const [urlSafe, setUrlSafe] = useState(false);
  const [noPadding, setNoPadding] = useState(false);
  const [prettyJson, setPrettyJson] = useState(true);
  const [error, setError] = useState('');

  useEffect(() => {
    let cancelled = false;

    const run = async () => {
      if (!input) {
        setOutput('');
        setError('');
        return;
      }
      try {
        if (mode === 'encode') {
          const encoded = await encodeBase64(input, urlSafe, noPadding);
          if (!cancelled) {
            setOutput(encoded);
            setError('');
          }
        } else {
          let decoded = await decodeBase64(input, urlSafe);
          if (prettyJson) {
            try {
              const parsed = JSON.parse(decoded);
              decoded = JSON.stringify(parsed, null, 2);
            } catch {
              // Keep raw decoded string if not JSON
            }
          }
          if (!cancelled) {
            setOutput(decoded);
            setError('');
          }
        }
      } catch (err) {
        if (!cancelled) {
          setOutput('');
          setError(err instanceof Error ? err.message : 'Ошибка преобразования');
        }
      }
    };

    run();
    return () => {
      cancelled = true;
    };
  }, [input, mode, urlSafe, noPadding, prettyJson]);

  const handleSwap = () => {
    if (!output) {
      setMode((m) => (m === 'encode' ? 'decode' : 'encode'));
      return;
    }
    const nextMode = mode === 'encode' ? 'decode' : 'encode';
    setMode(nextMode);
    setInput(output);
  };

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const dataUrl = typeof reader.result === 'string' ? reader.result : '';
      const base64Part = dataUrl.includes(',') ? dataUrl.split(',')[1] : dataUrl;
      if (mode === 'encode') {
        setMode('decode');
      }
      setInput(base64Part);
    };
    reader.readAsDataURL(file);
    e.target.value = '';
  };

  const inputBytes = new TextEncoder().encode(input).length;
  const outputBytes = new TextEncoder().encode(output).length;

  return (
    <div className="space-y-6">
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
            Кодирование и декодирование Base64
          </h1>
          <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
            Поддержка UTF-8, URL-Safe алфавита и автоформатирования JSON
          </p>
        </div>

        <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-900 self-start">
          <button
            type="button"
            onClick={() => setMode('encode')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              mode === 'encode'
                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            Кодировать (Encode)
          </button>
          <button
            type="button"
            onClick={() => setMode('decode')}
            className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
              mode === 'decode'
                ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
            }`}
          >
            Декодировать (Decode)
          </button>
        </div>
      </div>

      {/* Options Bar */}
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-zinc-200 bg-white px-4 py-3 dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex flex-wrap items-center gap-4">
          <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
            <input
              type="checkbox"
              checked={urlSafe}
              onChange={(e) => setUrlSafe(e.target.checked)}
              className="h-4 w-4 rounded accent-blue-600"
            />
            URL-Safe (- и _)
          </label>

          {mode === 'encode' ? (
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={noPadding}
                onChange={(e) => setNoPadding(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600"
              />
              Без выравнивания (=)
            </label>
          ) : (
            <label className="flex cursor-pointer items-center gap-2 text-xs font-medium text-zinc-700 dark:text-zinc-300">
              <input
                type="checkbox"
                checked={prettyJson}
                onChange={(e) => setPrettyJson(e.target.checked)}
                className="h-4 w-4 rounded accent-blue-600"
              />
              Форматировать JSON
            </label>
          )}
        </div>

        <div className="flex items-center gap-2">
          <label className="inline-flex cursor-pointer items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0">
            <FileUp className="h-3.5 w-3.5" />
            Из файла
            <input type="file" onChange={handleFileUpload} className="hidden" />
          </label>

          <button
            type="button"
            onClick={handleSwap}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
          >
            <ArrowLeftRight className="h-3.5 w-3.5" />
            Поменять местами
          </button>

          <button
            type="button"
            onClick={() => setInput('')}
            className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-200 px-3 py-1.5 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
          >
            <Trash2 className="h-3.5 w-3.5" />
            Очистить
          </button>
        </div>
      </div>

      {/* Dual Panes */}
      <div className="grid grid-cols-1 gap-4 lg:grid-cols-2">
        <div className="flex flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {mode === 'encode' ? 'Исходный текст (UTF-8)' : 'Строка Base64'}
            </span>
            <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
              {input.length} симв. · {inputBytes} байт
            </span>
          </div>
          <textarea
            value={input}
            onChange={(e) => setInput(e.target.value)}
            placeholder={
              mode === 'encode'
                ? 'Введите текст, JSON или токен...'
                : 'Вставьте строку Base64 для декодирования...'
            }
            className="min-h-[340px] w-full flex-1 resize-none bg-transparent p-4 font-mono text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:text-zinc-100"
          />
        </div>

        <div className="flex flex-col rounded-xl border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900 overflow-hidden">
          <div className="flex items-center justify-between border-b border-zinc-200 px-4 py-2.5 dark:border-zinc-800">
            <span className="text-xs font-semibold text-zinc-700 dark:text-zinc-300">
              {mode === 'encode' ? 'Результат Base64' : 'Декодированный текст'}
            </span>
            <div className="flex items-center gap-3">
              <span className="text-xs text-zinc-500 dark:text-zinc-400 tabular-nums">
                {output.length} симв. · {outputBytes} байт
              </span>
              <button
                type="button"
                disabled={!output}
                onClick={() => onCopy(output, 'b64-out')}
                className="inline-flex items-center gap-1 rounded-md border border-zinc-200 px-2.5 py-1 text-xs font-medium text-zinc-700 hover:bg-zinc-50 disabled:opacity-40 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
              >
                {copiedId === 'b64-out' ? (
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
          </div>

          {error ? (
            <div className="flex min-h-[340px] items-center justify-center p-6 text-center">
              <p className="text-sm font-medium text-red-600 dark:text-red-400">{error}</p>
            </div>
          ) : (
            <textarea
              readOnly
              value={output}
              placeholder="Результат появится здесь автоматически..."
              className="min-h-[340px] w-full flex-1 resize-none bg-zinc-50/50 p-4 font-mono text-sm leading-relaxed text-zinc-900 placeholder:text-zinc-400 focus:outline-none dark:bg-zinc-950/40 dark:text-zinc-100"
            />
          )}
        </div>
      </div>
    </div>
  );
}
