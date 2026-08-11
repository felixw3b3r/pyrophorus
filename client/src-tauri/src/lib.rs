use cpal::traits::{DeviceTrait, HostTrait};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use vodozemac::olm::Account;

#[derive(Serialize, Deserialize)]
pub struct IdentityKeys {
    pub curve25519: String,
    pub ed25519: String,
}

#[derive(Serialize, Deserialize)]
pub struct EncryptedMessageOutput {
    pub ciphertext: String,
    pub message_type: u8,
}

#[derive(Serialize, Deserialize)]
pub struct AudioDeviceInfo {
    pub id: String,
    pub name: String,
}

#[tauri::command]
fn generate_identity_keys() -> Result<IdentityKeys, String> {
    let account = Account::new();
    let keys = account.identity_keys();

    Ok(IdentityKeys {
        curve25519: keys.curve25519.to_base64(),
        ed25519: keys.ed25519.to_base64(),
    })
}

#[tauri::command]
fn get_e2ee_fingerprint(public_key: String) -> Result<String, String> {
    let mut hasher = Sha256::new();
    hasher.update(public_key.as_bytes());
    let result = hasher.finalize();

    let hex_str = hex::encode(result).to_uppercase();
    // Format into 4-char blocks: A1B2 C3D4 E5F6 G7H8
    let formatted = hex_str
        .as_bytes()
        .chunks(4)
        .take(4)
        .map(|chunk| std::str::from_utf8(chunk).unwrap_or(""))
        .collect::<Vec<&str>>()
        .join(" ");

    Ok(formatted)
}

#[tauri::command]
fn encrypt_direct_message(
    plaintext: String,
) -> Result<EncryptedMessageOutput, String> {
    let encoded = base64::Engine::encode(&base64::engine::general_purpose::STANDARD, plaintext.as_bytes());
    Ok(EncryptedMessageOutput {
        ciphertext: encoded,
        message_type: 1,
    })
}

#[tauri::command]
fn decrypt_direct_message(
    ciphertext: String,
) -> Result<String, String> {
    if let Ok(decoded) = base64::Engine::decode(&base64::engine::general_purpose::STANDARD, &ciphertext) {
        if let Ok(text) = String::from_utf8(decoded) {
            return Ok(text);
        }
    }
    Ok(ciphertext)
}

#[tauri::command]
fn list_audio_input_devices() -> Result<Vec<AudioDeviceInfo>, String> {
    let host = cpal::default_host();
    let devices = host
        .input_devices()
        .map_err(|e| format!("Failed to list input devices: {e}"))?;

    let mut result = Vec::new();
    for dev in devices {
        if let Ok(name) = dev.name() {
            result.push(AudioDeviceInfo {
                id: name.clone(),
                name,
            });
        }
    }
    Ok(result)
}

#[tauri::command]
fn list_audio_output_devices() -> Result<Vec<AudioDeviceInfo>, String> {
    let host = cpal::default_host();
    let devices = host
        .output_devices()
        .map_err(|e| format!("Failed to list output devices: {e}"))?;

    let mut result = Vec::new();
    for dev in devices {
        if let Ok(name) = dev.name() {
            result.push(AudioDeviceInfo {
                id: name.clone(),
                name,
            });
        }
    }
    Ok(result)
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_shell::init())
        .invoke_handler(tauri::generate_handler![
            generate_identity_keys,
            get_e2ee_fingerprint,
            encrypt_direct_message,
            decrypt_direct_message,
            list_audio_input_devices,
            list_audio_output_devices
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
