# VaultFlow — Кроссплатформенное приложение на Tauri v2 и Rust

Готовый к сборке проект для ПК (Windows / Linux / macOS) и мобильных платформ (Android / iOS).

## Быстрый старт

1. Установите Tauri CLI v2:
   ```bash
   cargo install tauri-cli --version "^2.0.0"
   ```
2. Сгенерируйте полный набор нативных иконок (`.icns`, `.ico`, Android/iOS) из `app-icon.png`:
   ```bash
   cargo tauri icon app-icon.png
   ```
3. Запустите в режиме разработки на ПК:
   ```bash
   cargo tauri dev
   ```
4. Инициализация и запуск на Android:
   ```bash
   cargo tauri android init
   cargo tauri android dev
   ```
