import {useEffect, useMemo, useState} from 'react';
import {
  Binary,
  CheckSquare,
  FileText,
  KeyRound,
  Link2,
  Menu,
  Moon,
  Settings,
  ShieldCheck,
  Sun,
  X,
} from 'lucide-react';
import {Base64Section} from './components/Base64Section';
import {LinksSection} from './components/LinksSection';
import {NotesSection} from './components/NotesSection';
import {OAuthCodesSection} from './components/OAuthCodesSection';
import {PasswordGeneratorSection} from './components/PasswordGeneratorSection';
import {SettingsSection} from './components/SettingsSection';
import {TasksSection} from './components/TasksSection';
import {DEFAULT_WORKSPACE} from './data/defaults';
import {loadWorkspace, saveWorkspace} from './lib/tauriBridge';
import {useCopyClipboard} from './lib/useCopyClipboard';
import {AppSettings, SectionId, ThemeMode, WorkspaceData} from './types/workspace';

interface NavItem {
  id: SectionId;
  label: string;
  icon: React.ComponentType<{className?: string}>;
}

const NAV_ITEMS: NavItem[] = [
  {id: 'links', label: 'Ссылки', icon: Link2},
  {id: 'notes', label: 'Заметки', icon: FileText},
  {id: 'tasks', label: 'Задачи', icon: CheckSquare},
  {id: 'passwords', label: 'Генератор паролей', icon: KeyRound},
  {id: 'oauth', label: 'OAuth / 2FA коды', icon: ShieldCheck},
  {id: 'base64', label: 'Base64', icon: Binary},
  {id: 'settings', label: 'Настройки', icon: Settings},
];

export default function App() {
  const [workspace, setWorkspace] = useState<WorkspaceData>(DEFAULT_WORKSPACE);
  const [loaded, setLoaded] = useState(false);
  const [activeSection, setActiveSection] = useState<SectionId>('links');
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [systemDark, setSystemDark] = useState<boolean>(() =>
    typeof window !== 'undefined'
      ? window.matchMedia('(prefers-color-scheme: dark)').matches
      : false,
  );

  const {copiedId, copy} = useCopyClipboard(workspace.settings.clipboardAutoClearSec);

  // Initial load from Tauri Rust backend or localStorage fallback
  useEffect(() => {
    let active = true;
    loadWorkspace()
      .then((stored) => {
        if (!active) return;
        if (stored) {
          const merged: WorkspaceData = {
            ...DEFAULT_WORKSPACE,
            ...stored,
            settings: {
              ...DEFAULT_WORKSPACE.settings,
              ...(stored.settings || {}),
            },
          };
          setWorkspace(merged);
          setActiveSection(merged.settings.defaultSection || 'links');
        }
      })
      .finally(() => {
        if (active) setLoaded(true);
      });
    return () => {
      active = false;
    };
  }, []);

  // Persist workspace on every change after initial load
  useEffect(() => {
    if (!loaded) return;
    saveWorkspace(workspace).catch(() => {});
  }, [workspace, loaded]);

  // Listen to OS dark mode changes
  useEffect(() => {
    const mq = window.matchMedia('(prefers-color-scheme: dark)');
    const handler = (e: MediaQueryListEvent) => setSystemDark(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);

  // Apply .dark class on <html>
  const isDarkActive = useMemo(() => {
    if (workspace.settings.theme === 'dark') return true;
    if (workspace.settings.theme === 'light') return false;
    return systemDark;
  }, [workspace.settings.theme, systemDark]);

  useEffect(() => {
    const root = document.documentElement;
    if (isDarkActive) {
      root.classList.add('dark');
    } else {
      root.classList.remove('dark');
    }
  }, [isDarkActive]);

  const updateSettings = (patch: Partial<AppSettings>) => {
    setWorkspace((prev) => ({
      ...prev,
      settings: {...prev.settings, ...patch},
    }));
  };

  const toggleQuickTheme = () => {
    const nextTheme: ThemeMode = isDarkActive ? 'light' : 'dark';
    updateSettings({theme: nextTheme});
  };

  const activeNav = NAV_ITEMS.find((item) => item.id === activeSection) ?? NAV_ITEMS[0];

  const getSectionCount = (id: SectionId): number | null => {
    switch (id) {
      case 'links':
        return workspace.links.length;
      case 'notes':
        return workspace.notes.length;
      case 'tasks':
        return workspace.tasks.filter((t) => t.status !== 'done').length;
      case 'oauth':
        return workspace.totpAccounts.length;
      default:
        return null;
    }
  };

  const selectSection = (id: SectionId) => {
    setActiveSection(id);
    setMobileMenuOpen(false);
  };

  return (
    <div className="min-h-screen bg-zinc-50 text-zinc-900 dark:bg-zinc-950 dark:text-zinc-100 flex flex-col md:flex-row">
      {/* Desktop Sidebar */}
      <aside className="hidden md:flex md:w-64 md:flex-col md:fixed md:inset-y-0 border-r border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900">
        <div className="flex h-14 items-center px-5 border-b border-zinc-200 dark:border-zinc-800">
          <span className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50 whitespace-nowrap shrink-0">
            WorkDesk
          </span>
        </div>

        <nav className="flex-1 space-y-1 p-3 overflow-y-auto" aria-label="Разделы приложения">
          {NAV_ITEMS.map((item) => {
            const Icon = item.icon;
            const isActive = activeSection === item.id;
            const count = getSectionCount(item.id);

            return (
              <button
                key={item.id}
                type="button"
                onClick={() => selectSection(item.id)}
                className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors whitespace-nowrap shrink-0 ${
                  isActive
                    ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                    : 'text-zinc-600 hover:bg-zinc-100 hover:text-zinc-900 dark:text-zinc-400 dark:hover:bg-zinc-800/60 dark:hover:text-zinc-100'
                }`}
              >
                <span className="flex items-center gap-2.5 min-w-0">
                  <Icon className="h-4 w-4 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </span>
                {count !== null && (
                  <span className="text-xs text-zinc-400 dark:text-zinc-500 tabular-nums shrink-0">
                    {count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </aside>

      {/* Mobile Drawer Overlay */}
      {mobileMenuOpen && (
        <div className="fixed inset-0 z-50 flex md:hidden">
          <div
            className="fixed inset-0 bg-zinc-950/50"
            onClick={() => setMobileMenuOpen(false)}
          />
          <div className="relative z-10 flex w-72 max-w-[82vw] flex-col bg-white dark:bg-zinc-900 border-r border-zinc-200 dark:border-zinc-800">
            <div className="flex h-14 items-center justify-between px-5 border-b border-zinc-200 dark:border-zinc-800">
              <span className="font-display text-lg font-bold tracking-tight text-zinc-900 dark:text-zinc-50">
                WorkDesk
              </span>
              <button
                type="button"
                onClick={() => setMobileMenuOpen(false)}
                className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-500 hover:bg-zinc-100 dark:hover:bg-zinc-800"
                aria-label="Закрыть меню"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <nav className="flex-1 space-y-1 p-3 overflow-y-auto">
              {NAV_ITEMS.map((item) => {
                const Icon = item.icon;
                const isActive = activeSection === item.id;
                const count = getSectionCount(item.id);
                return (
                  <button
                    key={item.id}
                    type="button"
                    onClick={() => selectSection(item.id)}
                    className={`flex w-full items-center justify-between gap-3 rounded-lg px-3 py-3 text-sm font-medium transition-colors ${
                      isActive
                        ? 'bg-blue-50 text-blue-700 dark:bg-blue-950/50 dark:text-blue-400'
                        : 'text-zinc-700 hover:bg-zinc-100 dark:text-zinc-300 dark:hover:bg-zinc-800'
                    }`}
                  >
                    <span className="flex items-center gap-3">
                      <Icon className="h-4 w-4 shrink-0" />
                      <span>{item.label}</span>
                    </span>
                    {count !== null && (
                      <span className="text-xs text-zinc-400 tabular-nums">{count}</span>
                    )}
                  </button>
                );
              })}
            </nav>
          </div>
        </div>
      )}

      {/* Main Column */}
      <div className="flex-1 flex flex-col md:pl-64 min-w-0">
        {/* Top Header */}
        <header className="sticky top-0 z-30 flex h-14 items-center justify-between gap-4 border-b border-zinc-200 bg-white/95 px-4 backdrop-blur-xs sm:px-6 dark:border-zinc-800 dark:bg-zinc-900/95">
          <div className="flex items-center gap-3 min-w-0">
            <button
              type="button"
              onClick={() => setMobileMenuOpen(true)}
              className="inline-flex h-10 w-10 items-center justify-center rounded-lg text-zinc-600 hover:bg-zinc-100 md:hidden dark:text-zinc-300 dark:hover:bg-zinc-800"
              aria-label="Открыть навигацию"
            >
              <Menu className="h-5 w-5" />
            </button>

            <div className="flex items-center gap-2 text-sm min-w-0">
              <span className="font-medium text-zinc-400 dark:text-zinc-500 hidden sm:inline whitespace-nowrap">
                WorkDesk
              </span>
              <span className="text-zinc-300 dark:text-zinc-700 hidden sm:inline" aria-hidden="true">
                /
              </span>
              <span className="font-semibold text-zinc-900 dark:text-zinc-100 truncate">
                {activeNav.label}
              </span>
            </div>
          </div>

          <div className="flex items-center gap-2 shrink-0">
            <button
              type="button"
              onClick={toggleQuickTheme}
              className="inline-flex h-9 items-center gap-2 rounded-lg border border-zinc-200 bg-white px-3 text-xs font-medium text-zinc-700 hover:bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-200 dark:hover:bg-zinc-800 whitespace-nowrap shrink-0"
              title="Переключить тему"
            >
              {isDarkActive ? (
                <>
                  <Sun className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Светлая тема</span>
                </>
              ) : (
                <>
                  <Moon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">Тёмная тема</span>
                </>
              )}
            </button>
          </div>
        </header>

        {/* Main Content Viewport */}
        <main className="flex-1 p-4 sm:p-6 lg:p-8">
          <div className="mx-auto max-w-6xl">
            {!loaded ? (
              <div className="space-y-4">
                <div className="h-8 w-56 animate-pulse rounded-lg bg-zinc-200 dark:bg-zinc-800" />
                <div className="h-40 w-full animate-pulse rounded-xl bg-zinc-200 dark:bg-zinc-800" />
              </div>
            ) : (
              <>
                {activeSection === 'links' && (
                  <LinksSection
                    links={workspace.links}
                    compact={workspace.settings.compactDensity}
                    confirmBeforeDelete={workspace.settings.confirmBeforeDelete}
                    copiedId={copiedId}
                    onCopy={(text, id) => copy(text, id, false)}
                    onChange={(links) => setWorkspace((prev) => ({...prev, links}))}
                  />
                )}

                {activeSection === 'notes' && (
                  <NotesSection
                    notes={workspace.notes}
                    confirmBeforeDelete={workspace.settings.confirmBeforeDelete}
                    copiedId={copiedId}
                    onCopy={(text, id) => copy(text, id, false)}
                    onChange={(notes) => setWorkspace((prev) => ({...prev, notes}))}
                  />
                )}

                {activeSection === 'tasks' && (
                  <TasksSection
                    tasks={workspace.tasks}
                    compact={workspace.settings.compactDensity}
                    confirmBeforeDelete={workspace.settings.confirmBeforeDelete}
                    onChange={(tasks) => setWorkspace((prev) => ({...prev, tasks}))}
                  />
                )}

                {activeSection === 'passwords' && (
                  <PasswordGeneratorSection
                    copiedId={copiedId}
                    onCopy={(text, id, sensitive) => copy(text, id, sensitive)}
                    clipboardAutoClearSec={workspace.settings.clipboardAutoClearSec}
                  />
                )}

                {activeSection === 'oauth' && (
                  <OAuthCodesSection
                    accounts={workspace.totpAccounts}
                    confirmBeforeDelete={workspace.settings.confirmBeforeDelete}
                    copiedId={copiedId}
                    onCopy={(text, id, sensitive) => copy(text, id, sensitive)}
                    onChange={(totpAccounts) =>
                      setWorkspace((prev) => ({...prev, totpAccounts}))
                    }
                  />
                )}

                {activeSection === 'base64' && (
                  <Base64Section
                    copiedId={copiedId}
                    onCopy={(text, id) => copy(text, id, false)}
                  />
                )}

                {activeSection === 'settings' && (
                  <SettingsSection
                    settings={workspace.settings}
                    workspace={workspace}
                    onUpdateSettings={updateSettings}
                    onImportWorkspace={(next) => setWorkspace(next)}
                    onResetWorkspace={() => setWorkspace(DEFAULT_WORKSPACE)}
                  />
                )}
              </>
            )}
          </div>
        </main>
      </div>
    </div>
  );
}
