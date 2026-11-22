import {WorkspaceData} from '../types/workspace';

export const DEFAULT_WORKSPACE: WorkspaceData = {
  links: [
    {
      id: 'lnk-1',
      title: 'GitHub Actions — Мониторинг сборок',
      url: 'https://github.com/features/actions',
      category: 'Инфраструктура',
      description: 'CI/CD пайплайны для Windows, Linux и Android',
      pinned: true,
      createdAt: '2026-11-20',
    },
    {
      id: 'lnk-2',
      title: 'Tauri v2 Документация',
      url: 'https://v2.tauri.app/',
      category: 'Документация',
      description: 'Справочник по API, плагинам и мобильной сборке',
      pinned: true,
      createdAt: '2026-11-20',
    },
    {
      id: 'lnk-3',
      title: 'Docs.rs — Rust Crates',
      url: 'https://docs.rs/',
      category: 'Документация',
      description: 'Документация крейтов serde, hmac, sha2, base64',
      pinned: false,
      createdAt: '2026-11-21',
    },
    {
      id: 'lnk-4',
      title: 'Sentry — Отслеживание ошибок',
      url: 'https://sentry.io/',
      category: 'Сервисы',
      description: 'Мониторинг исключений в продакшене',
      pinned: false,
      createdAt: '2026-11-21',
    },
  ],
  notes: [
    {
      id: 'note-1',
      title: 'Чеклист релиза Tauri v2',
      folder: 'Релизы',
      pinned: true,
      updatedAt: '2026-11-22 10:15',
      content: `# Подготовка релиза WorkDesk

1. Проверить версию в \`src-tauri/tauri.conf.json\` и \`Cargo.toml\`.
2. Убедиться, что все команды Rust проходят \`cargo check\`.
3. Запустить \`npm run lint\` и \`npm run build\`.
4. Создать тег \`v1.0.0\` для автоматической сборки Windows, Linux и Android APK в GitHub Actions.

## Команды для локальной проверки
- Desktop: \`npm run tauri build\`
- Android: \`npx tauri android build --apk --debug\``,
    },
    {
      id: 'note-2',
      title: 'Заметки по OAuth 2.0 + PKCE',
      folder: 'Безопасность',
      pinned: false,
      updatedAt: '2026-11-21 17:40',
      content: `Для десктопных и мобильных приложений (Tauri) всегда используем Authorization Code Flow с PKCE (S256), без хранения \`client_secret\` на клиенте.

- \`code_verifier\`: 64+ символов (CSPRNG)
- \`code_challenge\`: Base64URL(SHA-256(code_verifier))
- \`state\`: проверка защиты от CSRF`,
    },
  ],
  tasks: [
    {
      id: 'tsk-1',
      title: 'Настроить матрицу сборки Windows / Linux / Android в GitHub Actions',
      status: 'done',
      priority: 'high',
      dueDate: '2026-11-22',
      category: 'DevOps',
      createdAt: '2026-11-20',
    },
    {
      id: 'tsk-2',
      title: 'Проверить перенос резервной копии workspace.json между устройствами',
      status: 'in_progress',
      priority: 'medium',
      dueDate: '2026-11-24',
      category: 'Разработка',
      createdAt: '2026-11-21',
    },
    {
      id: 'tsk-3',
      title: 'Обновить ключи 2FA для рабочих репозиториев',
      status: 'todo',
      priority: 'high',
      dueDate: '2026-11-25',
      category: 'Безопасность',
      createdAt: '2026-11-22',
    },
    {
      id: 'tsk-4',
      title: 'Провести ревизию закладок по стендам и API',
      status: 'todo',
      priority: 'low',
      dueDate: '2026-11-28',
      category: 'Организация',
      createdAt: '2026-11-22',
    },
  ],
  totpAccounts: [
    {
      id: 'totp-1',
      issuer: 'GitHub',
      label: 'work@example.com (Демо)',
      secret: 'JBSWY3DPEHPK3PXP',
      digits: 6,
      period: 30,
      algorithm: 'SHA1',
      createdAt: '2026-11-20',
    },
    {
      id: 'totp-2',
      issuer: 'Cloudflare',
      label: 'infra-admin (Демо)',
      secret: 'NB2W45DFOIZA====',
      digits: 6,
      period: 30,
      algorithm: 'SHA1',
      createdAt: '2026-11-21',
    },
  ],
  settings: {
    theme: 'system',
    defaultSection: 'links',
    compactDensity: false,
    clipboardAutoClearSec: 30,
    confirmBeforeDelete: true,
  },
};
