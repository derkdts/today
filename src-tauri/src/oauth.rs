use oauth2::{
    basic::BasicClient, AuthUrl, AuthorizationCode, ClientId, CsrfToken, PkceCodeChallenge,
    PkceCodeVerifier, RedirectUrl, Scope, TokenResponse, TokenUrl,
};
use serde::Serialize;
use std::sync::Mutex;
use tauri::{AppHandle, State};
use tauri_plugin_opener::OpenerExt;

pub struct OAuthState {
    pub pkce_verifier: Mutex<Option<PkceCodeVerifier>>,
    pub csrf_state: Mutex<Option<String>>,
    pub active_provider: Mutex<Option<String>>,
}

impl Default for OAuthState {
    fn default() -> Self {
        Self {
            pkce_verifier: Mutex::new(None),
            csrf_state: Mutex::new(None),
            active_provider: Mutex::new(None),
        }
    }
}

#[derive(Debug, Serialize)]
pub struct OAuthTokenResult {
    pub access_token: String,
    pub token_type: String,
    pub provider: String,
}

fn build_oauth_client(provider: &str) -> Result<(BasicClient, Vec<&'static str>), String> {
    let (client_id, auth_url, token_url, scopes) = match provider {
        "github" => (
            "YOUR_GITHUB_CLIENT_ID",
            "https://github.com/login/oauth/authorize",
            "https://github.com/login/oauth/access_token",
            vec!["read:user"],
        ),
        "google" => (
            "YOUR_GOOGLE_CLIENT_ID",
            "https://accounts.google.com/o/oauth2/v2/auth",
            "https://oauth2.googleapis.com/token",
            vec!["openid", "email", "profile"],
        ),
        _ => return Err("Неподдерживаемый OAuth провайдер".into()),
    };

    let client = BasicClient::new(
        ClientId::new(client_id.to_string()),
        None,
        AuthUrl::new(auth_url.to_string()).map_err(|e| e.to_string())?,
        Some(TokenUrl::new(token_url.to_string()).map_err(|e| e.to_string())?),
    )
    .set_redirect_uri(
        RedirectUrl::new("vaultflow://oauth/callback".to_string()).map_err(|e| e.to_string())?,
    );

    Ok((client, scopes))
}

#[tauri::command]
pub fn start_oauth_login(
    app: AppHandle,
    state: State<'_, OAuthState>,
    provider: String,
) -> Result<String, String> {
    let (client, scopes) = build_oauth_client(&provider)?;
    let (pkce_challenge, pkce_verifier) = PkceCodeChallenge::new_random_sha256();

    let mut auth_req = client
        .authorize_url(CsrfToken::new_random)
        .set_pkce_challenge(pkce_challenge);

    for s in scopes {
        auth_req = auth_req.add_scope(Scope::new(s.to_string()));
    }

    let (auth_url, csrf_token) = auth_req.url();

    *state.pkce_verifier.lock().unwrap() = Some(pkce_verifier);
    *state.csrf_state.lock().unwrap() = Some(csrf_token.secret().clone());
    *state.active_provider.lock().unwrap() = Some(provider);

    app.opener()
        .open_url(auth_url.as_str(), None::<&str>)
        .map_err(|e| format!("Не удалось открыть браузер: {}", e))?;

    Ok(auth_url.to_string())
}

#[tauri::command]
pub async fn finish_oauth_login(
    state: State<'_, OAuthState>,
    code: String,
    returned_state: Option<String>,
) -> Result<OAuthTokenResult, String> {
    let expected_state = state.csrf_state.lock().unwrap().take();
    if let (Some(expected), Some(actual)) = (expected_state, returned_state) {
        if expected != actual {
            return Err("Ошибка безопасности: несовпадение CSRF state".into());
        }
    }

    let provider = state
        .active_provider
        .lock()
        .unwrap()
        .take()
        .unwrap_or_else(|| "github".to_string());

    let (client, _) = build_oauth_client(&provider)?;

    let verifier = state
        .pkce_verifier
        .lock()
        .unwrap()
        .take()
        .ok_or("PKCE verifier не найден или сессия истекла")?;

    let token_res = client
        .exchange_code(AuthorizationCode::new(code))
        .set_pkce_verifier(verifier)
        .request_async(oauth2::reqwest::async_http_client)
        .await
        .map_err(|e| format!("Ошибка обмена токена: {}", e))?;

    Ok(OAuthTokenResult {
        access_token: token_res.access_token().secret().clone(),
        token_type: "Bearer".to_string(),
        provider,
    })
}
