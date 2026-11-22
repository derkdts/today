import {useEffect, useState} from 'react';
import {Download, RotateCcw, Upload} from 'lucide-react';
import {getRuntimeInfo} from '../lib/tauriBridge';
import {
  AppRuntimeInfo,
  AppSettings,
  SectionId,
  ThemeMode,
  WorkspaceData,
} from '../types/workspace';

interface SettingsSectionProps {
  settings: AppSettings;
  workspace: WorkspaceData;
  onUpdateSettings: (patch: Partial<AppSettings>) => void;
  onImportWorkspace: (next: WorkspaceData) => void;
  onResetWorkspace: () => void;
}

const SECTION_OPTIONS: {id: SectionId; label: string}[] = [
  {id: 'links', label: 'Ссылки'},
  {id: 'notes', label: 'Заметки'},
  {id: 'tasks', label: 'Задачи'},
  {id: 'passwords', label: 'Генератор паролей'},
  {id: 'oauth', label: 'OAuth и 2FA коды'},
  {id: 'base64', label: 'Base64'},
];

export function SettingsSection({
  settings,
  workspace,
  onUpdateSettings,
  onImportWorkspace,
  onResetWorkspace,
}: SettingsSectionProps) {
  const [runtimeInfo, setRuntimeInfo] = useState<AppRuntimeInfo | null>(null);
  const [importMessage, setImportMessage] = useState('');
  const [confirmReset, setConfirmReset] = useState(false);

  useEffect(() => {
    getRuntimeInfo().then(setRuntimeInfo).catch(() => {});
  }, []);

  const handleExport = () => {
    const json = JSON.stringify(workspace, null, 2);
    const blob = new Blob([json], {type: 'application/json'});
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `workdesk-backup-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const parsed = JSON.parse(String(reader.result)) as WorkspaceData;
        if (
          !parsed ||
          !Array.isArray(parsed.links) ||
          !Array.isArray(parsed.notes) ||
          !Array.isArray(parsed.tasks) ||
          !Array.isArray(parsed.totpAccounts)
        ) {
          setImportMessage('Неверная структура файла резервной копии.');
          return;
        }
        onImportWorkspace(parsed);
        setImportMessage('Резервная копия успешно восстановлена.');
      } catch {
        setImportMessage('Не удалось прочитать JSON файл.');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight text-zinc-900 dark:text-zinc-50">
          Настройки приложения
        </h1>
        <p className="mt-1 text-sm text-zinc-500 dark:text-zinc-400">
          Внешний вид, поведение буфера обмена, резервное копирование и параметры сборки
        </p>
      </div>

      {/* Appearance & Behavior */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Интерфейс и поведение
        </h2>

        <div className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Тема оформления
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Светлая, тёмная или синхронизация с системной темой ОС
              </p>
            </div>
            <div className="inline-flex items-center gap-1 rounded-lg border border-zinc-200 bg-zinc-100 p-1 dark:border-zinc-800 dark:bg-zinc-950 self-start">
              {(
                [
                  {id: 'light', label: 'Светлая'},
                  {id: 'dark', label: 'Тёмная'},
                  {id: 'system', label: 'Системная'},
                ] as {id: ThemeMode; label: string}[]
              ).map((t) => (
                <button
                  key={t.id}
                  type="button"
                  onClick={() => onUpdateSettings({theme: t.id})}
                  className={`rounded-md px-3 py-1.5 text-xs font-medium transition-colors whitespace-nowrap shrink-0 ${
                    settings.theme === t.id
                      ? 'bg-white text-zinc-900 shadow-xs dark:bg-zinc-800 dark:text-zinc-50'
                      : 'text-zinc-600 hover:text-zinc-900 dark:text-zinc-400 dark:hover:text-zinc-100'
                  }`}
                >
                  {t.label}
                </button>
              ))}
            </div>
          </div>

          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Стартовый раздел
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Экран, который открывается при запуске приложения
              </p>
            </div>
            <select
              value={settings.defaultSection}
              onChange={(e) =>
                onUpdateSettings({defaultSection: e.target.value as SectionId})
              }
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 self-start"
            >
              {SECTION_OPTIONS.map((opt) => (
                <option key={opt.id} value={opt.id}>
                  {opt.label}
                </option>
              ))}
            </select>
          </div>

          <div className="flex flex-col gap-3 py-4 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Автоочистка буфера обмена
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Очищать скопированные пароли и 2FA-коды по таймеру
              </p>
            </div>
            <select
              value={settings.clipboardAutoClearSec}
              onChange={(e) =>
                onUpdateSettings({clipboardAutoClearSec: Number(e.target.value)})
              }
              className="rounded-lg border border-zinc-200 bg-zinc-50 px-3 py-2 text-sm text-zinc-900 dark:border-zinc-800 dark:bg-zinc-950 dark:text-zinc-100 self-start"
            >
              <option value={0}>Выключено</option>
              <option value={15}>Через 15 секунд</option>
              <option value={30}>Через 30 секунд</option>
              <option value={60}>Через 60 секунд</option>
            </select>
          </div>

          <label className="flex cursor-pointer items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Компактный режим списков
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Уменьшает вертикальные отступы строк в ссылках и задачах
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.compactDensity}
              onChange={(e) => onUpdateSettings({compactDensity: e.target.checked})}
              className="h-4 w-4 rounded accent-blue-600"
            />
          </label>

          <label className="flex cursor-pointer items-center justify-between gap-4 py-4">
            <div>
              <p className="text-sm font-medium text-zinc-900 dark:text-zinc-100">
                Подтверждение перед удалением
              </p>
              <p className="text-xs text-zinc-500 dark:text-zinc-400">
                Запрашивает повторный клик при удалении ссылок, заметок, задач и 2FA ключей
              </p>
            </div>
            <input
              type="checkbox"
              checked={settings.confirmBeforeDelete}
              onChange={(e) => onUpdateSettings({confirmBeforeDelete: e.target.checked})}
              className="h-4 w-4 rounded accent-blue-600"
            />
          </label>
        </div>
      </div>

      {/* Backup & Data */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Данные и резервное копирование
        </h2>
        <p className="mt-1 text-xs text-zinc-500 dark:text-zinc-400">
          В Tauri данные хранятся локально в каталоге приложения. Вы можете перенести их между Windows, Linux и Android через JSON.
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 rounded-lg bg-blue-600 px-4 py-2 text-xs font-medium text-white hover:bg-blue-700 whitespace-nowrap shrink-0"
          >
            <Download className="h-3.5 w-3.5" />
            Экспортировать JSON
          </button>

          <label className="inline-flex cursor-pointer items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-zinc-800 hover:bg-zinc-50 dark:border-zinc-700 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0">
            <Upload className="h-3.5 w-3.5" />
            Импортировать JSON
            <input type="file" accept=".json,application/json" onChange={handleImport} className="hidden" />
          </label>

          {confirmReset ? (
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => {
                  onResetWorkspace();
                  setConfirmReset(false);
                }}
                className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2 text-xs font-medium text-white hover:bg-red-700 whitespace-nowrap shrink-0"
              >
                Подтвердить сброс
              </button>
              <button
                type="button"
                onClick={() => setConfirmReset(false)}
                className="rounded-lg border border-zinc-200 px-3 py-2 text-xs font-medium text-zinc-600 dark:border-zinc-700 dark:text-zinc-300"
              >
                Отмена
              </button>
            </div>
          ) : (
            <button
              type="button"
              onClick={() => setConfirmReset(true)}
              className="inline-flex items-center gap-2 rounded-lg border border-zinc-200 px-4 py-2 text-xs font-medium text-red-600 hover:bg-red-50 dark:border-zinc-700 dark:text-red-400 dark:hover:bg-red-950/30 whitespace-nowrap shrink-0"
            >
              <RotateCcw className="h-3.5 w-3.5" />
              Сбросить данные
            </button>
          )}
        </div>

        {importMessage && (
          <p className="mt-3 text-xs font-medium text-blue-600 dark:text-blue-400">
            {importMessage}
          </p>
        )}
      </div>

      {/* Runtime & Multi-Platform CI/CD Targets */}
      <div className="rounded-xl border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900">
        <h2 className="text-base font-semibold text-zinc-900 dark:text-zinc-50">
          Среда выполнения и сборка (Tauri v2 + Rust)
        </h2>

        <div className="mt-4 overflow-x-auto">
          <table className="w-full text-left text-xs">
            <tbody className="divide-y divide-zinc-200 dark:divide-zinc-800">
              <tr>
                <td className="py-2.5 pr-4 font-medium text-zinc-500 dark:text-zinc-400">
                  Режим выполнения
                </td>
                <td className="py-2.5 font-mono text-zinc-900 dark:text-zinc-100">
                  {runtimeInfo?.isTauri ? 'Tauri Native (Rust Backend)' : 'Web Preview (WebCrypto Fallback)'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-zinc-500 dark:text-zinc-400">
                  Платформа / Архитектура
                </td>
                <td className="py-2.5 font-mono text-zinc-900 dark:text-zinc-100">
                  {runtimeInfo ? `${runtimeInfo.os} (${runtimeInfo.arch})` : '—'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-zinc-500 dark:text-zinc-400">
                  Путь хранения данных
                </td>
                <td className="py-2.5 font-mono text-zinc-900 dark:text-zinc-100 break-all">
                  {runtimeInfo?.storagePath ?? '—'}
                </td>
              </tr>
              <tr>
                <td className="py-2.5 pr-4 font-medium text-zinc-500 dark:text-zinc-400">
                  GitHub Actions CI/CD
                </td>
                <td className="py-2.5 font-mono text-zinc-900 dark:text-zinc-100">
                  .github/workflows/build.yml (Windows .msi/.exe · Linux .deb/.AppImage · Android .apk)
                </td>
              </tr>
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
