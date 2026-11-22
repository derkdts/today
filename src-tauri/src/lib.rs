mod crypto_tools;
mod db;
mod oauth;

use oauth::OAuthState;
use tauri::{Emitter, Manager};
use tauri_plugin_deep_link::DeepLinkExt;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    let mut builder = tauri::Builder::default();

    #[cfg(desktop)]
    {
        builder = builder.plugin(tauri_plugin_single_instance::init(|app, _args, _cwd| {
            if let Some(window) = app.get_webview_window("main") {
                let _ = window.set_focus();
            }
        }));
    }

    builder
        .manage(OAuthState::default())
        .plugin(
            tauri_plugin_sql::Builder::default()
                .add_migrations("sqlite:vaultflow.db", db::get_migrations())
                .build(),
        )
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_clipboard_manager::init())
        .plugin(tauri_plugin_deep_link::init())
        .setup(|app| {
            #[cfg(any(target_os = "linux", all(debug_assertions, windows)))]
            {
                let _ = app.deep_link().register_all();
            }

            let handle = app.handle().clone();
            app.deep_link().on_open_url(move |event| {
                let urls = event.urls();
                if let Some(first_url) = urls.first() {
                    let _ = handle.emit("oauth-callback-url", first_url.to_string());
                }
            });
            Ok(())
        })
        .invoke_handler(tauri::generate_handler![
            crypto_tools::generate_password_rust,
            crypto_tools::generate_totp_code,
            crypto_tools::encode_base64_rust,
            crypto_tools::decode_base64_rust,
            oauth::start_oauth_login,
            oauth::finish_oauth_login,
        ])
        .run(tauri::generate_context!())
        .expect("Ошибка запуска приложения VaultFlow");
}
