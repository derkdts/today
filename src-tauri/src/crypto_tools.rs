use base64::{
    engine::general_purpose::{STANDARD, URL_SAFE_NO_PAD},
    Engine as _,
};
use rand::{rngs::OsRng, Rng};
use serde::{Deserialize, Serialize};
use totp_rs::{Algorithm, Secret, TOTP};

#[derive(Debug, Serialize, Deserialize)]
pub struct PasswordOptions {
    pub length: usize,
    pub use_upper: bool,
    pub use_lower: bool,
    pub use_numbers: bool,
    pub use_symbols: bool,
    pub exclude_ambiguous: bool,
}

#[derive(Debug, Serialize)]
pub struct GeneratedPassword {
    pub password: String,
    pub entropy_bits: u32,
}

#[derive(Debug, Serialize)]
pub struct TotpCodeResult {
    pub code: String,
    pub seconds_remaining: u64,
}

#[tauri::command]
pub fn generate_password_rust(opts: PasswordOptions) -> Result<GeneratedPassword, String> {
    let mut upper = "ABCDEFGHIJKLMNOPQRSTUVWXYZ".to_string();
    let mut lower = "abcdefghijklmnopqrstuvwxyz".to_string();
    let mut numbers = "0123456789".to_string();
    let symbols = "!@#$%^&*()_+-=[]{}|;:,.<>?";

    if opts.exclude_ambiguous {
        upper.retain(|c| !"ILO".contains(c));
        lower.retain(|c| !"ilo".contains(c));
        numbers.retain(|c| !"01".contains(c));
    }

    let mut charset = String::new();
    if opts.use_upper {
        charset.push_str(&upper);
    }
    if opts.use_lower {
        charset.push_str(&lower);
    }
    if opts.use_numbers {
        charset.push_str(&numbers);
    }
    if opts.use_symbols {
        charset.push_str(symbols);
    }

    if charset.is_empty() {
        charset = lower;
    }

    let chars: Vec<char> = charset.chars().collect();
    let pool_size = chars.len();
    let length = opts.length.clamp(8, 128);

    let mut rng = OsRng;
    let password: String = (0..length)
        .map(|_| {
            let idx = rng.gen_range(0..pool_size);
            chars[idx]
        })
        .collect();

    let entropy_bits = ((length as f64) * (pool_size as f64).log2()).round() as u32;

    Ok(GeneratedPassword {
        password,
        entropy_bits,
    })
}

#[tauri::command]
pub fn generate_totp_code(secret_base32: String) -> Result<TotpCodeResult, String> {
    let clean_secret = secret_base32.replace(' ', "").to_uppercase();
    if clean_secret.is_empty() {
        return Err("Секрет не может быть пустым".into());
    }

    let secret_bytes = Secret::Encoded(clean_secret)
        .to_bytes()
        .map_err(|e| format!("Некорректный Base32 секрет: {}", e))?;

    let totp = TOTP::new(Algorithm::SHA1, 6, 1, 30, secret_bytes)
        .map_err(|e| format!("Ошибка инициализации TOTP: {}", e))?;

    let code = totp
        .generate_current()
        .map_err(|e| format!("Ошибка генерации кода: {}", e))?;

    let ttl = totp
        .ttl()
        .map_err(|e| format!("Ошибка расчёта таймера: {}", e))?;

    Ok(TotpCodeResult {
        code,
        seconds_remaining: ttl,
    })
}

#[tauri::command]
pub fn encode_base64_rust(input: String, url_safe: bool) -> String {
    if url_safe {
        URL_SAFE_NO_PAD.encode(input.as_bytes())
    } else {
        STANDARD.encode(input.as_bytes())
    }
}

#[tauri::command]
pub fn decode_base64_rust(input: String, url_safe: bool) -> Result<String, String> {
    let trimmed = input.trim();
    let bytes = if url_safe {
        URL_SAFE_NO_PAD
            .decode(trimmed)
            .map_err(|e| format!("Ошибка декодирования URL-Safe Base64: {}", e))?
    } else {
        STANDARD
            .decode(trimmed)
            .map_err(|e| format!("Ошибка декодирования Base64: {}", e))?
    };

    String::from_utf8(bytes).map_err(|e| format!("Результат не является валидным UTF-8: {}", e))
}
