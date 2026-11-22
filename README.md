# WorkDesk (Tauri v2 + Rust + React)

Кроссплатформенный рабочий органайзер для Windows, Linux и Android.

## Функционал

- **Ссылки** — хранение рабочих URL, категорий, описаний, закрепление и быстрый переход.
- **Заметки** — редактор заметок с папками, поиском, просмотром и подсчётом слов.
- **Задачи** — список задач со статусами (`К выполнению`, `В работе`, `Готово`), приоритетами и сроками.
- **Генератор паролей** — криптостойкие пароли и кодовые фразы (`OsRng` в Rust / `crypto.getRandomValues` в Web), оценка энтропии, история сеанса.
- **OAuth / 2FA коды** — живой TOTP-аутентификатор (RFC 6238, `otpauth://` импорт, SHA1/SHA256/SHA512) и генератор OAuth 2.0 PKCE (`code_verifier`, `code_challenge`, `state`, `nonce`).
- **Base64** — кодирование/декодирование UTF-8, URL-Safe режим, работа с файлами и форматирование JSON.
- **Настройки** — светлая/тёмная/системная тема, компактный режим, автоочистка буфера обмена, экспорт/импорт резервной копии в JSON.

## Локальный запуск

```bash
npm install
npm run dev          # Веб-предпросмотр
npm run tauri dev    # Нативное окно Tauri + Rust
```

## Сборка в GitHub Actions

Пайплайн `.github/workflows/build.yml` автоматически собирает артефакты для трёх платформ при пуше в `main`/`master`, тегах `v*` или ручном запуске (`workflow_dispatch`):

- **Windows (`windows-x64`)**: `.msi` и `.exe` (NSIS)
- **Linux (`linux-x64`)**: `.deb`, `.AppImage`, `.rpm`
- **Android (`workdesk-android-apk`)**: `.apk` (через `tauri android init --ci` и `tauri android build --apk --debug`)
