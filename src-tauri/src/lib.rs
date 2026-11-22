use base64::{engine::general_purpose, Engine as _};
use data_encoding::BASE32_NOPAD;
use hmac::{Hmac, Mac};
use rand::{rngs::OsRng, Rng, RngCore};
use serde::{Deserialize, Serialize};
use sha1::Sha1;
use sha2::{Digest, Sha256, Sha512};
use std::fs;
use std::path::PathBuf;
use std::time::{SystemTime, UNIX_EPOCH};
use tauri::Manager;
use url::Url;

type HmacSha1 = Hmac<Sha1>;
type HmacSha256 = Hmac<Sha256>;
type HmacSha512 = Hmac<Sha512>;

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkLink {
    pub id: String,
    pub title: String,
    pub url: String,
    pub category: String,
    pub description: String,
    pub pinned: bool,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkNote {
    pub id: String,
    pub title: String,
    pub content: String,
    pub folder: String,
    pub pinned: bool,
    pub updated_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkTask {
    pub id: String,
    pub title: String,
    pub status: String,
    pub priority: String,
    pub due_date: String,
    pub category: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct TotpAccount {
    pub id: String,
    pub issuer: String,
    pub label: String,
    pub secret: String,
    pub digits: u32,
    pub period: u64,
    pub algorithm: String,
    pub created_at: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub default_section: String,
    pub compact_density: bool,
    pub clipboard_auto_clear_sec: u32,
    pub confirm_before_delete: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct WorkspaceData {
    pub links: Vec<WorkLink>,
    pub notes: Vec<WorkNote>,
    pub tasks: Vec<WorkTask>,
    pub totp_accounts: Vec<TotpAccount>,
    pub settings: AppSettings,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PasswordResult {
    pub password: String,
    pub entropy_bits: f64,
    pub strength_label: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct TotpCodeResult {
    pub code: String,
    pub next_code: String,
    pub remaining_seconds: u64,
    pub period: u64,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ParsedOtpAuthUri {
    pub issuer: String,
    pub label: String,
    pub secret: String,
    pub digits: u32,
    pub period: u64,
    pub algorithm: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct PkcePair {
    pub code_verifier: String,
    pub code_challenge: String,
    pub state: String,
    pub nonce: String,
}

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct AppRuntimeInfo {
    pub os: String,
    pub arch: String,
    pub app_version: String,
    pub storage_path: String,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "system".to_string(),
            default_section: "links".to_string(),
            compact_density: false,
            clipboard_auto_clear_sec: 30,
            confirm_before_delete: true,
        }
    }
}

impl Default for WorkspaceData {
    fn default() -> Self {
        Self {
            links: Vec::new(),
            notes: Vec::new(),
            tasks: Vec::new(),
            totp_accounts: Vec::new(),
            settings: AppSettings::default(),
        }
    }
}

fn workspace_file_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("Не удалось получить каталог данных приложения: {e}"))?;
    if !dir.exists() {
        fs::create_dir_all(&dir)
            .map_err(|e| format!("Не удалось создать каталог данных: {e}"))?;
    }
    Ok(dir.join("workspace.json"))
}

#[tauri::command]
fn load_workspace(app: tauri::AppHandle) -> Result<Option<WorkspaceData>, String> {
    let path = workspace_file_path(&app)?;
    if !path.exists() {
        return Ok(None);
    }
    let content = fs::read_to_string(&path)
        .map_err(|e| format!("Ошибка чтения файла рабочего пространства: {e}"))?;
    let parsed: WorkspaceData = serde_json::from_str(&content)
        .map_err(|e| format!("Ошибка разбора JSON рабочего пространства: {e}"))?;
    Ok(Some(parsed))
}

#[tauri::command]
fn save_workspace(app: tauri::AppHandle, data: WorkspaceData) -> Result<(), String> {
    let path = workspace_file_path(&app)?;
    let tmp_path = path.with_extension("json.tmp");
    let json = serde_json::to_string_pretty(&data)
        .map_err(|e| format!("Ошибка сериализации данных: {e}"))?;
    fs::write(&tmp_path, json).map_err(|e| format!("Ошибка записи временного файла: {e}"))?;
    fs::rename(&tmp_path, &path).map_err(|e| format!("Ошибка сохранения файла: {e}"))?;
    Ok(())
}

#[tauri::command]
fn generate_password(
    length: usize,
    upper: bool,
    lower: bool,
    digits: bool,
    symbols: bool,
    exclude_ambiguous: bool,
) -> Result<PasswordResult, String> {
    if !(4..=128).contains(&length) {
        return Err("Длина пароля должна быть от 4 до 128 символов".to_string());
    }

    let mut charset = String::new();
    let ambiguous = ['0', 'O', '1', 'l', 'I'];

    let mut push_filtered = |chars: &str| {
        for ch in chars.chars() {
            if exclude_ambiguous && ambiguous.contains(&ch) {
                continue;
            }
            charset.push(ch);
        }
    };

    if upper {
        push_filtered("ABCDEFGHIJKLMNOPQRSTUVWXYZ");
    }
    if lower {
        push_filtered("abcdefghijklmnopqrstuvwxyz");
    }
    if digits {
        push_filtered("0123456789");
    }
    if symbols {
        push_filtered("!@#$%^&*()-_=+[]{};:,.<>?");
    }

    if charset.is_empty() {
        return Err("Выберите хотя бы один набор символов".to_string());
    }

    let chars: Vec<char> = charset.chars().collect();
    let mut rng = OsRng;
    let mut password = String::with_capacity(length);
    for _ in 0..length {
        let idx = rng.gen_range(0..chars.len());
        password.push(chars[idx]);
    }

    let entropy_bits = (length as f64) * (chars.len() as f64).log2();
    let strength_label = if entropy_bits < 40.0 {
        "Слабый".to_string()
    } else if entropy_bits < 64.0 {
        "Средний".to_string()
    } else if entropy_bits < 96.0 {
        "Надёжный".to_string()
    } else {
        "Криптостойкий".to_string()
    };

    Ok(PasswordResult {
        password,
        entropy_bits,
        strength_label,
    })
}

fn compute_hmac(secret: &[u8], counter_bytes: &[u8], algorithm: &str) -> Result<Vec<u8>, String> {
    match algorithm.to_ascii_uppercase().as_str() {
        "SHA256" => {
            let mut mac =
                HmacSha256::new_from_slice(secret).map_err(|e| format!("HMAC error: {e}"))?;
            mac.update(counter_bytes);
            Ok(mac.finalize().into_bytes().to_vec())
        }
        "SHA512" => {
            let mut mac =
                HmacSha512::new_from_slice(secret).map_err(|e| format!("HMAC error: {e}"))?;
            mac.update(counter_bytes);
            Ok(mac.finalize().into_bytes().to_vec())
        }
        _ => {
            let mut mac =
                HmacSha1::new_from_slice(secret).map_err(|e| format!("HMAC error: {e}"))?;
            mac.update(counter_bytes);
            Ok(mac.finalize().into_bytes().to_vec())
        }
    }
}

fn totp_for_counter(
    secret: &[u8],
    counter: u64,
    digits: u32,
    algorithm: &str,
) -> Result<String, String> {
    let hash = compute_hmac(secret, &counter.to_be_bytes(), algorithm)?;
    let offset = (hash[hash.len() - 1] & 0x0f) as usize;
    let binary = ((hash[offset] as u32 & 0x7f) << 24)
        | ((hash[offset + 1] as u32) << 16)
        | ((hash[offset + 2] as u32) << 8)
        | (hash[offset + 3] as u32);
    let safe_digits = digits.clamp(6, 8);
    let modulo = 10_u32.pow(safe_digits);
    Ok(format!("{:0width$}", binary % modulo, width = safe_digits as usize))
}

#[tauri::command]
fn compute_totp(
    secret: String,
    digits: u32,
    period: u64,
    algorithm: String,
) -> Result<TotpCodeResult, String> {
    let normalized = secret
        .trim()
        .replace([' ', '-'], "")
        .trim_end_matches('=')
        .to_ascii_uppercase();

    if normalized.is_empty() {
        return Err("Секретный ключ пуст".to_string());
    }

    let decoded = BASE32_NOPAD
        .decode(normalized.as_bytes())
        .map_err(|_| "Некорректный Base32-секрет".to_string())?;

    let safe_period = if period == 0 { 30 } else { period };
    let now = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("Системная ошибка времени: {e}"))?
        .as_secs();

    let counter = now / safe_period;
    let remaining_seconds = safe_period - (now % safe_period);

    let code = totp_for_counter(&decoded, counter, digits, &algorithm)?;
    let next_code = totp_for_counter(&decoded, counter + 1, digits, &algorithm)?;

    Ok(TotpCodeResult {
        code,
        next_code,
        remaining_seconds,
        period: safe_period,
    })
}

fn percent_decode(input: &str) -> String {
    let bytes = input.as_bytes();
    let mut out = Vec::with_capacity(bytes.len());
    let mut i = 0;
    while i < bytes.len() {
        if bytes[i] == b'%' && i + 2 < bytes.len() {
            if let (Some(hi), Some(lo)) = (
                (bytes[i + 1] as char).to_digit(16),
                (bytes[i + 2] as char).to_digit(16),
            ) {
                out.push(((hi << 4) | lo) as u8);
                i += 3;
                continue;
            }
        }
        out.push(bytes[i]);
        i += 1;
    }
    String::from_utf8_lossy(&out).into_owned()
}

#[tauri::command]
fn parse_otpauth_uri(uri: String) -> Result<ParsedOtpAuthUri, String> {
    let parsed = Url::parse(uri.trim()).map_err(|_| "Некорректный формат otpauth:// URI".to_string())?;
    if parsed.scheme() != "otpauth" {
        return Err("URI должен начинаться с otpauth://".to_string());
    }

    let raw_label = percent_decode(parsed.path().trim_start_matches('/'));
    let mut issuer = String::new();
    let mut label = raw_label.clone();

    if let Some((iss, lbl)) = raw_label.split_once(':') {
        issuer = iss.trim().to_string();
        label = lbl.trim().to_string();
    }

    let mut secret = String::new();
    let mut digits = 6_u32;
    let mut period = 30_u64;
    let mut algorithm = "SHA1".to_string();

    for (key, value) in parsed.query_pairs() {
        match key.as_ref() {
            "secret" => secret = value.trim().to_ascii_uppercase(),
            "issuer" => {
                if !value.trim().is_empty() {
                    issuer = value.trim().to_string();
                }
            }
            "digits" => {
                if let Ok(d) = value.parse::<u32>() {
                    digits = d.clamp(6, 8);
                }
            }
            "period" => {
                if let Ok(p) = value.parse::<u64>() {
                    if p > 0 {
                        period = p;
                    }
                }
            }
            "algorithm" => algorithm = value.trim().to_ascii_uppercase(),
            _ => {}
        }
    }

    if secret.is_empty() {
        return Err("В URI отсутствует параметр secret".to_string());
    }
    if issuer.is_empty() {
        issuer = "Сервис".to_string();
    }

    Ok(ParsedOtpAuthUri {
        issuer,
        label,
        secret,
        digits,
        period,
        algorithm,
    })
}

#[tauri::command]
fn generate_pkce_pair() -> PkcePair {
    let mut rng = OsRng;
    let mut verifier_bytes = [0u8; 48];
    let mut state_bytes = [0u8; 24];
    let mut nonce_bytes = [0u8; 24];
    rng.fill_bytes(&mut verifier_bytes);
    rng.fill_bytes(&mut state_bytes);
    rng.fill_bytes(&mut nonce_bytes);

    let code_verifier = general_purpose::URL_SAFE_NO_PAD.encode(verifier_bytes);
    let digest = Sha256::digest(code_verifier.as_bytes());
    let code_challenge = general_purpose::URL_SAFE_NO_PAD.encode(digest);
    let state = general_purpose::URL_SAFE_NO_PAD.encode(state_bytes);
    let nonce = general_purpose::URL_SAFE_NO_PAD.encode(nonce_bytes);

    PkcePair {
        code_verifier,
        code_challenge,
        state,
        nonce,
    }
}

#[tauri::command]
fn encode_base64(input: String, url_safe: bool, no_padding: bool) -> String {
    let bytes = input.as_bytes();
    match (url_safe, no_padding) {
        (false, false) => general_purpose::STANDARD.encode(bytes),
        (false, true) => general_purpose::STANDARD_NO_PAD.encode(bytes),
        (true, false) => general_purpose::URL_SAFE.encode(bytes),
        (true, true) => general_purpose::URL_SAFE_NO_PAD.encode(bytes),
    }
}

#[tauri::command]
fn decode_base64(input: String, url_safe: bool) -> Result<String, String> {
    let cleaned: String = input.chars().filter(|c| !c.is_whitespace()).collect();
    let normalized = if url_safe {
        cleaned.replace('+', "-").replace('/', "_")
    } else {
        cleaned.replace('-', "+").replace('_', "/")
    };

    let bytes = if url_safe {
        general_purpose::URL_SAFE
            .decode(&normalized)
            .or_else(|_| general_purpose::URL_SAFE_NO_PAD.decode(&normalized))
    } else {
        general_purpose::STANDARD
            .decode(&normalized)
            .or_else(|_| general_purpose::STANDARD_NO_PAD.decode(&normalized))
    }
    .map_err(|_| "Некорректная строка Base64".to_string())?;

    String::from_utf8(bytes)
        .map_err(|_| "Декодированные байты не являются корректным UTF-8 текстом".to_string())
}

#[tauri::command]
fn get_app_info(app: tauri::AppHandle) -> AppRuntimeInfo {
    let storage_path = workspace_file_path(&app)
        .map(|p| p.display().to_string())
        .unwrap_or_else(|_| "app_data_dir/workspace.json".to_string());

    AppRuntimeInfo {
        os: std::env::consts::OS.to_string(),
        arch: std::env::consts::ARCH.to_string(),
        app_version: env!("CARGO_PKG_VERSION").to_string(),
        storage_path,
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .invoke_handler(tauri::generate_handler![
            load_workspace,
            save_workspace,
            generate_password,
            compute_totp,
            parse_otpauth_uri,
            generate_pkce_pair,
            encode_base64,
            decode_base64,
            get_app_info
        ])
        .run(tauri::generate_context!())
        .expect("error while running WorkDesk Tauri application");
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_password_generation_and_ambiguous_filter() {
        let res = generate_password(32, true, true, true, false, true).unwrap();
        assert_eq!(res.password.len(), 32);
        for ch in ['0', 'O', '1', 'l', 'I'] {
            assert!(!res.password.contains(ch));
        }
        assert!(res.entropy_bits > 150.0);
    }

    #[test]
    fn test_base64_utf8_and_urlsafe_roundtrip() {
        let original = "Привет, WorkDesk! {\"ok\":true}";
        let encoded = encode_base64(original.to_string(), true, true);
        assert!(!encoded.contains('='));
        let decoded = decode_base64(encoded, true).unwrap();
        assert_eq!(decoded, original);
    }

    #[test]
    fn test_rfc6238_totp_vectors() {
        let secret_sha1 = b"12345678901234567890";
        assert_eq!(
            totp_for_counter(secret_sha1, 59 / 30, 8, "SHA1").unwrap(),
            "94287082"
        );
        assert_eq!(
            totp_for_counter(secret_sha1, 1111111109 / 30, 8, "SHA1").unwrap(),
            "07081804"
        );
    }

    #[test]
    fn test_parse_otpauth_uri_decodes_email() {
        let parsed = parse_otpauth_uri(
            "otpauth://totp/GitHub:dev%40company.ru?secret=JBSWY3DPEHPK3PXP&issuer=GitHub&digits=6&period=30"
                .to_string(),
        )
        .unwrap();
        assert_eq!(parsed.issuer, "GitHub");
        assert_eq!(parsed.label, "dev@company.ru");
        assert_eq!(parsed.secret, "JBSWY3DPEHPK3PXP");
        assert_eq!(parsed.digits, 6);
    }

    #[test]
    fn test_pkce_s256_challenge() {
        let pair = generate_pkce_pair();
        let digest = Sha256::digest(pair.code_verifier.as_bytes());
        let expected = general_purpose::URL_SAFE_NO_PAD.encode(digest);
        assert_eq!(pair.code_challenge, expected);
    }
}

