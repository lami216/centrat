use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use hmac::{Hmac, Mac};
use p256::ecdsa::{signature::Verifier, Signature, VerifyingKey};
use serde::{Deserialize, Serialize};
use sha2::{Digest, Sha256};
use std::{
    collections::HashSet,
    env,
    fs,
    path::PathBuf,
    process::Command,
    sync::{Mutex, OnceLock},
    time::{Instant, SystemTime, UNIX_EPOCH},
};

#[cfg(windows)]
use std::os::windows::process::CommandExt;

const LICENSE_SCHEMA: &str = "efc-license";
const LICENSE_VERSION: u8 = 1;
const LICENSE_KEY_ID: &str = "efc-license-v3";
const LICENSE_ALGORITHM: &str = "ECDSA_P256_SHA256";
const LICENSE_FILE_NAME: &str = "license.efc-license";
const STATE_FILE_NAME: &str = "state-v1.json";
const STATE_FORMAT: &str = "efc-license-state-v1";
const REGISTRY_KEY: &str = r"HKCU\Software\Centre EFC\Licensing\v1";
const REGISTRY_VALUE: &str = "State";
const ROLLBACK_TOLERANCE_MS: u64 = 120_000;
const MAX_LICENSE_BYTES: usize = 64 * 1024;
const PUBLIC_KEY_SEC1_B64: &str = "BDDLo6mYqhmQbaUyS_xmMkebb3Nz28ZmWU3bF6alhqeXt7mxLrk_pxDc4vaz9RXV5mICatMtADIQvkF4EdLM8LY";

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
pub struct LicensePayload {
    pub license_id: String,
    pub customer_name: String,
    pub center_name: String,
    pub device_id: String,
    pub edition: String,
    #[serde(rename = "type")]
    pub license_type: String,
    pub duration_seconds: Option<u64>,
    pub activation_mode: String,
    pub notes: String,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct LicenseDocument {
    schema: String,
    version: u8,
    key_id: String,
    algorithm: String,
    payload: LicensePayload,
    signature: String,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseInfo {
    pub license_id: String,
    pub customer_name: String,
    pub center_name: String,
    pub device_id: String,
    #[serde(rename = "type")]
    pub license_type: String,
    pub duration_seconds: Option<u64>,
    pub remaining_seconds: Option<u64>,
}

#[derive(Clone, Debug, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct LicenseStatus {
    pub valid: bool,
    pub reason: Option<String>,
    pub code: Option<String>,
    pub license: Option<LicenseInfo>,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct ActiveLicense {
    license_id: String,
    #[serde(rename = "type")]
    license_type: String,
    duration_seconds: Option<u64>,
    remaining_ms: Option<u64>,
    last_wall_clock_ms: u64,
    expired: bool,
    clock_rollback_detected: bool,
}

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct Ledger {
    state_version: u8,
    device_id: String,
    consumed_license_ids: Vec<String>,
    active_license: Option<ActiveLicense>,
}

#[derive(Serialize, Deserialize)]
struct StateEnvelope {
    format: String,
    payload: String,
    mac: String,
}

struct RuntimeClock {
    license_id: String,
    checkpoint_remaining_ms: u64,
    checkpoint_wall_ms: u64,
    checkpoint_instant: Instant,
}

static RUNTIME: OnceLock<Mutex<Option<RuntimeClock>>> = OnceLock::new();

type HmacSha256 = Hmac<Sha256>;

fn runtime() -> &'static Mutex<Option<RuntimeClock>> {
    RUNTIME.get_or_init(|| Mutex::new(None))
}

fn now_ms() -> Result<u64, String> {
    let millis = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "تعذر قراءة وقت الجهاز.".to_string())?
        .as_millis();
    u64::try_from(millis).map_err(|_| "وقت الجهاز غير صالح.".to_string())
}

fn licensing_dir() -> Result<PathBuf, String> {
    let root = env::var_os("LOCALAPPDATA")
        .map(PathBuf::from)
        .ok_or_else(|| "تعذر تحديد مجلد بيانات Windows المحلي.".to_string())?;
    let dir = root.join("Centre-EFC").join("Licensing");
    fs::create_dir_all(&dir).map_err(|e| format!("تعذر إنشاء مجلد التفعيل: {e}"))?;
    Ok(dir)
}

fn license_path() -> Result<PathBuf, String> {
    Ok(licensing_dir()?.join(LICENSE_FILE_NAME))
}

fn state_path() -> Result<PathBuf, String> {
    Ok(licensing_dir()?.join(STATE_FILE_NAME))
}

fn hidden_reg_command() -> Command {
    let mut command = Command::new("reg.exe");
    #[cfg(windows)]
    command.creation_flags(0x0800_0000);
    command
}

fn machine_guid() -> Result<String, String> {
    #[cfg(not(windows))]
    {
        return Err("استخراج رقم الجهاز مدعوم على Windows فقط.".to_string());
    }
    #[cfg(windows)]
    {
        let output = hidden_reg_command()
            .args([
                "query",
                r"HKLM\SOFTWARE\Microsoft\Cryptography",
                "/v",
                "MachineGuid",
            ])
            .output()
            .map_err(|_| "تعذر استخراج رقم الجهاز. تواصل مع الدعم.".to_string())?;
        if !output.status.success() {
            return Err("تعذر استخراج رقم الجهاز. تواصل مع الدعم.".to_string());
        }
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            if let Some(pos) = line.find("REG_SZ") {
                let value = line[pos + "REG_SZ".len()..].trim();
                if !value.is_empty() {
                    return Ok(value.to_string());
                }
            }
        }
        Err("تعذر استخراج رقم الجهاز. تواصل مع الدعم.".to_string())
    }
}

fn format_device_code(guid: &str) -> Result<String, String> {
    let normalized = guid
        .trim()
        .trim_matches(|ch| ch == '{' || ch == '}')
        .to_lowercase();
    if normalized.is_empty() {
        return Err("تعذر استخراج رقم الجهاز. تواصل مع الدعم.".to_string());
    }
    let digest = Sha256::digest(format!("mr.efc.centre|device-v1|{normalized}"));
    let hex = digest[..10]
        .iter()
        .map(|byte| format!("{byte:02X}"))
        .collect::<String>();
    let groups = (0..5)
        .map(|index| &hex[index * 4..index * 4 + 4])
        .collect::<Vec<_>>();
    Ok(format!("EFC-{}", groups.join("-")))
}

pub fn device_id() -> Result<String, String> {
    format_device_code(&machine_guid()?)
}

fn valid_device_code(value: &str) -> bool {
    let parts = value.split('-').collect::<Vec<_>>();
    parts.len() == 6
        && parts[0] == "EFC"
        && parts[1..]
            .iter()
            .all(|part| part.len() == 4 && part.chars().all(|ch| ch.is_ascii_hexdigit()))
}

fn validate_payload(payload: &LicensePayload) -> Result<(), String> {
    if payload.license_id.trim().is_empty()
        || payload.customer_name.trim().is_empty()
        || payload.center_name.trim().is_empty()
        || !valid_device_code(payload.device_id.trim())
        || payload.edition != "desktop"
        || payload.activation_mode != "single-install"
        || !matches!(payload.license_type.as_str(), "perpetual" | "temporary")
    {
        return Err("ملف التفعيل غير صالح.".to_string());
    }
    match payload.license_type.as_str() {
        "perpetual" if payload.duration_seconds.is_none() => Ok(()),
        "temporary" if payload.duration_seconds.is_some_and(|value| value > 0) => Ok(()),
        _ => Err("مدة ملف التفعيل غير صالحة.".to_string()),
    }
}

fn parse_and_verify(content: &[u8], current_device: &str) -> Result<LicenseDocument, String> {
    if content.len() > MAX_LICENSE_BYTES {
        return Err("ملف التفعيل أكبر من الحد المسموح.".to_string());
    }
    let doc: LicenseDocument = serde_json::from_slice(content)
        .map_err(|_| "ملف التفعيل غير مدعوم.".to_string())?;
    if doc.schema != LICENSE_SCHEMA
        || doc.version != LICENSE_VERSION
        || doc.key_id != LICENSE_KEY_ID
        || doc.algorithm != LICENSE_ALGORITHM
    {
        return Err("ملف التفعيل غير مدعوم.".to_string());
    }
    validate_payload(&doc.payload)?;
    let public_bytes = URL_SAFE_NO_PAD
        .decode(PUBLIC_KEY_SEC1_B64)
        .map_err(|_| "تعذر تحميل مفتاح التحقق.".to_string())?;
    let verifying_key = VerifyingKey::from_sec1_bytes(&public_bytes)
        .map_err(|_| "تعذر تحميل مفتاح التحقق.".to_string())?;
    let signature_bytes = URL_SAFE_NO_PAD
        .decode(doc.signature.as_bytes())
        .map_err(|_| "تعذر التحقق من توقيع ملف التفعيل.".to_string())?;
    let signature = Signature::from_slice(&signature_bytes)
        .map_err(|_| "تعذر التحقق من توقيع ملف التفعيل.".to_string())?;
    let canonical = serde_json::to_vec(&doc.payload)
        .map_err(|_| "تعذر تجهيز بيانات ملف التفعيل.".to_string())?;
    verifying_key
        .verify(&canonical, &signature)
        .map_err(|_| "تعذر التحقق من توقيع ملف التفعيل.".to_string())?;
    if doc.payload.device_id.trim().to_uppercase() != current_device.to_uppercase() {
        return Err("ملف التفعيل مخصص لجهاز آخر.".to_string());
    }
    Ok(doc)
}

fn empty_ledger(device: &str) -> Ledger {
    Ledger {
        state_version: 1,
        device_id: device.to_string(),
        consumed_license_ids: vec![],
        active_license: None,
    }
}

fn state_key(device: &str) -> Vec<u8> {
    Sha256::digest(format!("Centre-EFC|licensing-state-v1|{device}"))
        .to_vec()
}

fn encode_ledger(ledger: &Ledger) -> Result<String, String> {
    let json = serde_json::to_vec(ledger).map_err(|_| "تعذر حفظ حالة التفعيل.".to_string())?;
    let payload = URL_SAFE_NO_PAD.encode(json);
    let mut mac = HmacSha256::new_from_slice(&state_key(&ledger.device_id))
        .map_err(|_| "تعذر حماية حالة التفعيل.".to_string())?;
    mac.update(payload.as_bytes());
    let envelope = StateEnvelope {
        format: STATE_FORMAT.to_string(),
        payload,
        mac: URL_SAFE_NO_PAD.encode(mac.finalize().into_bytes()),
    };
    serde_json::to_string(&envelope).map_err(|_| "تعذر حفظ حالة التفعيل.".to_string())
}

fn decode_ledger(text: &str, device: &str) -> Option<Ledger> {
    let envelope: StateEnvelope = serde_json::from_str(text).ok()?;
    if envelope.format != STATE_FORMAT {
        return None;
    }
    let given = URL_SAFE_NO_PAD.decode(envelope.mac.as_bytes()).ok()?;
    let mut mac = HmacSha256::new_from_slice(&state_key(device)).ok()?;
    mac.update(envelope.payload.as_bytes());
    if mac.verify_slice(&given).is_err() {
        return None;
    }
    let bytes = URL_SAFE_NO_PAD.decode(envelope.payload.as_bytes()).ok()?;
    let ledger: Ledger = serde_json::from_slice(&bytes).ok()?;
    if ledger.state_version != 1 || ledger.device_id != device {
        return None;
    }
    Some(ledger)
}

fn read_registry_state() -> Option<String> {
    #[cfg(not(windows))]
    {
        None
    }
    #[cfg(windows)]
    {
        let output = hidden_reg_command()
            .args(["query", REGISTRY_KEY, "/v", REGISTRY_VALUE])
            .output()
            .ok()?;
        if !output.status.success() {
            return None;
        }
        let text = String::from_utf8_lossy(&output.stdout);
        for line in text.lines() {
            if line.contains(REGISTRY_VALUE) {
                if let Some(pos) = line.find("REG_SZ") {
                    let raw = line[pos + "REG_SZ".len()..].trim();
                    let decoded = URL_SAFE_NO_PAD.decode(raw.as_bytes()).ok()?;
                    return String::from_utf8(decoded).ok();
                }
            }
        }
        None
    }
}

fn write_registry_state(value: &str) {
    #[cfg(windows)]
    {
        let encoded = URL_SAFE_NO_PAD.encode(value.as_bytes());
        let _ = hidden_reg_command()
            .args([
                "add",
                REGISTRY_KEY,
                "/v",
                REGISTRY_VALUE,
                "/t",
                "REG_SZ",
                "/d",
                &encoded,
                "/f",
            ])
            .output();
    }
}

fn restrictive_active(a: Option<ActiveLicense>, b: Option<ActiveLicense>) -> Option<ActiveLicense> {
    match (a, b) {
        (None, value) | (value, None) => value,
        (Some(mut left), Some(right)) => {
            if left.license_id != right.license_id {
                if right.expired || right.clock_rollback_detected || right.last_wall_clock_ms > left.last_wall_clock_ms {
                    return Some(right);
                }
                return Some(left);
            }
            left.expired |= right.expired;
            left.clock_rollback_detected |= right.clock_rollback_detected;
            left.last_wall_clock_ms = left.last_wall_clock_ms.max(right.last_wall_clock_ms);
            left.remaining_ms = match (left.remaining_ms, right.remaining_ms) {
                (Some(x), Some(y)) => Some(x.min(y)),
                (Some(x), None) | (None, Some(x)) => Some(x),
                (None, None) => None,
            };
            Some(left)
        }
    }
}

fn merge_ledgers(a: Ledger, b: Ledger) -> Ledger {
    let mut seen = HashSet::new();
    let mut consumed = vec![];
    for id in a
        .consumed_license_ids
        .iter()
        .chain(b.consumed_license_ids.iter())
    {
        if seen.insert(id.clone()) {
            consumed.push(id.clone());
        }
    }
    Ledger {
        state_version: 1,
        device_id: a.device_id.clone(),
        consumed_license_ids: consumed,
        active_license: restrictive_active(a.active_license, b.active_license),
    }
}

fn persist_ledger(ledger: &Ledger) -> Result<(), String> {
    let value = encode_ledger(ledger)?;
    let path = state_path()?;
    let temp = path.with_extension("tmp");
    fs::write(&temp, value.as_bytes()).map_err(|e| format!("تعذر حفظ حالة التفعيل: {e}"))?;
    fs::rename(&temp, &path).map_err(|e| format!("تعذر تثبيت حالة التفعيل: {e}"))?;
    write_registry_state(&value);
    Ok(())
}

fn load_ledger(device: &str) -> Result<Ledger, String> {
    let file = fs::read_to_string(state_path()?).ok().and_then(|text| decode_ledger(&text, device));
    let registry = read_registry_state().and_then(|text| decode_ledger(&text, device));
    let merged = match (file, registry) {
        (Some(a), Some(b)) => merge_ledgers(a, b),
        (Some(a), None) | (None, Some(a)) => a,
        (None, None) => empty_ledger(device),
    };
    persist_ledger(&merged)?;
    Ok(merged)
}

fn evaluate_temporary(ledger: &mut Ledger) -> Result<u64, String> {
    let now = now_ms()?;
    let mut guard = runtime()
        .lock()
        .map_err(|_| "تعذر قراءة عداد التفعيل.".to_string())?;
    let remaining;
    let expired;
    {
        let active = ledger
            .active_license
            .as_mut()
            .ok_or_else(|| "يجب تفعيل ترخيص الجهاز.".to_string())?;
        if active.expired {
            return Err("انتهت صلاحية التفعيل.".to_string());
        }
        if active.clock_rollback_detected {
            return Err("تم اكتشاف تغيير غير صالح في تاريخ أو وقت الجهاز.".to_string());
        }
        remaining = if let Some(checkpoint) = guard.as_ref().filter(|item| item.license_id == active.license_id) {
            if now.saturating_add(ROLLBACK_TOLERANCE_MS) < checkpoint.checkpoint_wall_ms
                || now.saturating_add(ROLLBACK_TOLERANCE_MS) < active.last_wall_clock_ms
            {
                active.clock_rollback_detected = true;
                drop(guard);
                persist_ledger(ledger)?;
                return Err("تم اكتشاف تغيير غير صالح في تاريخ أو وقت الجهاز.".to_string());
            }
            let monotonic_elapsed = u64::try_from(checkpoint.checkpoint_instant.elapsed().as_millis()).unwrap_or(u64::MAX);
            let wall_elapsed = now.saturating_sub(checkpoint.checkpoint_wall_ms);
            checkpoint
                .checkpoint_remaining_ms
                .saturating_sub(monotonic_elapsed.max(wall_elapsed))
        } else {
            if now.saturating_add(ROLLBACK_TOLERANCE_MS) < active.last_wall_clock_ms {
                active.clock_rollback_detected = true;
                drop(guard);
                persist_ledger(ledger)?;
                return Err("تم اكتشاف تغيير غير صالح في تاريخ أو وقت الجهاز.".to_string());
            }
            let base = active
                .remaining_ms
                .or_else(|| active.duration_seconds.map(|seconds| seconds.saturating_mul(1000)))
                .unwrap_or(0);
            let value = base.saturating_sub(now.saturating_sub(active.last_wall_clock_ms));
            *guard = Some(RuntimeClock {
                license_id: active.license_id.clone(),
                checkpoint_remaining_ms: value,
                checkpoint_wall_ms: now,
                checkpoint_instant: Instant::now(),
            });
            value
        };
        active.remaining_ms = Some(remaining);
        active.last_wall_clock_ms = active.last_wall_clock_ms.max(now);
        if remaining == 0 {
            active.expired = true;
        }
        expired = active.expired;
    }
    drop(guard);
    persist_ledger(ledger)?;
    if expired {
        return Err("انتهت صلاحية التفعيل.".to_string());
    }
    Ok((remaining + 999) / 1000)
}

fn info(payload: &LicensePayload, remaining_seconds: Option<u64>) -> LicenseInfo {
    LicenseInfo {
        license_id: payload.license_id.clone(),
        customer_name: payload.customer_name.clone(),
        center_name: payload.center_name.clone(),
        device_id: payload.device_id.clone(),
        license_type: payload.license_type.clone(),
        duration_seconds: payload.duration_seconds,
        remaining_seconds,
    }
}

fn invalid(reason: impl Into<String>, code: &str) -> LicenseStatus {
    LicenseStatus {
        valid: false,
        reason: Some(reason.into()),
        code: Some(code.to_string()),
        license: None,
    }
}

pub fn status() -> Result<LicenseStatus, String> {
    let device = device_id()?;
    let path = license_path()?;
    let content = match fs::read(&path) {
        Ok(value) => value,
        Err(_) => return Ok(invalid("يجب تفعيل هذا الجهاز قبل استخدام النظام.", "LICENSE_REQUIRED")),
    };
    let doc = match parse_and_verify(&content, &device) {
        Ok(value) => value,
        Err(reason) => return Ok(invalid(reason, "LICENSE_INVALID")),
    };
    let mut ledger = load_ledger(&device)?;
    let Some(active) = ledger.active_license.as_ref() else {
        return Ok(invalid("يجب تفعيل هذا الجهاز قبل استخدام النظام.", "LICENSE_REQUIRED"));
    };
    if active.license_id != doc.payload.license_id {
        return Ok(invalid("ملف التفعيل المثبت لا يطابق حالة هذا الجهاز.", "LICENSE_REQUIRED"));
    }
    if active.expired {
        return Ok(invalid("انتهت صلاحية التفعيل.", "LICENSE_EXPIRED"));
    }
    if active.clock_rollback_detected {
        return Ok(invalid(
            "تم اكتشاف تغيير غير صالح في تاريخ أو وقت الجهاز.",
            "LICENSE_CLOCK_ROLLBACK",
        ));
    }
    let remaining = if doc.payload.license_type == "temporary" {
        match evaluate_temporary(&mut ledger) {
            Ok(value) => Some(value),
            Err(reason) if reason.contains("انتهت") => return Ok(invalid(reason, "LICENSE_EXPIRED")),
            Err(reason) if reason.contains("تاريخ") || reason.contains("وقت") => {
                return Ok(invalid(reason, "LICENSE_CLOCK_ROLLBACK"))
            }
            Err(reason) => return Ok(invalid(reason, "LICENSE_INVALID")),
        }
    } else {
        None
    };
    Ok(LicenseStatus {
        valid: true,
        reason: None,
        code: None,
        license: Some(info(&doc.payload, remaining)),
    })
}

pub fn require_valid_license() -> Result<(), String> {
    let current = status()?;
    if current.valid {
        Ok(())
    } else {
        Err(current
            .reason
            .unwrap_or_else(|| "يجب تفعيل هذا الجهاز قبل استخدام النظام.".to_string()))
    }
}

fn install_bytes(content: &[u8]) -> Result<LicenseInfo, String> {
    let device = device_id()?;
    let doc = parse_and_verify(content, &device)?;
    let mut ledger = load_ledger(&device)?;
    if ledger
        .consumed_license_ids
        .iter()
        .any(|value| value == &doc.payload.license_id)
    {
        return Err("تم استخدام ملف التفعيل مسبقًا على هذا الجهاز.".to_string());
    }
    let path = license_path()?;
    let prepared = path.with_extension(format!("prepared-{}", std::process::id()));
    fs::write(&prepared, content).map_err(|e| format!("تعذر تجهيز ملف التفعيل: {e}"))?;
    let now = now_ms()?;
    ledger.consumed_license_ids.push(doc.payload.license_id.clone());
    ledger.active_license = Some(ActiveLicense {
        license_id: doc.payload.license_id.clone(),
        license_type: doc.payload.license_type.clone(),
        duration_seconds: doc.payload.duration_seconds,
        remaining_ms: doc.payload.duration_seconds.map(|seconds| seconds.saturating_mul(1000)),
        last_wall_clock_ms: now,
        expired: false,
        clock_rollback_detected: false,
    });
    fs::rename(&prepared, &path)
        .inspect_err(|_| {
            let _ = fs::remove_file(&prepared);
        })
        .map_err(|e| format!("تعذر تثبيت ملف التفعيل: {e}"))?;
    // Commit the license id only after the file is installed. If the file move
    // fails, the same valid activation remains retryable instead of being
    // permanently recorded as consumed without an installed license.
    persist_ledger(&ledger)?;
    let mut guard = runtime()
        .lock()
        .map_err(|_| "تعذر تهيئة عداد التفعيل.".to_string())?;
    *guard = doc.payload.duration_seconds.map(|seconds| RuntimeClock {
        license_id: doc.payload.license_id.clone(),
        checkpoint_remaining_ms: seconds.saturating_mul(1000),
        checkpoint_wall_ms: now,
        checkpoint_instant: Instant::now(),
    });
    Ok(info(&doc.payload, doc.payload.duration_seconds))
}

#[tauri::command]
pub fn get_license_device_id() -> Result<String, String> {
    device_id()
}

#[tauri::command]
pub fn get_license_status() -> Result<LicenseStatus, String> {
    status()
}

#[tauri::command]
pub fn install_license_file() -> Result<Option<LicenseInfo>, String> {
    let Some(path) = rfd::FileDialog::new().pick_file() else {
        return Ok(None);
    };
    let bytes = fs::read(&path).map_err(|e| format!("تعذر قراءة ملف التفعيل: {e}"))?;
    install_bytes(&bytes).map(Some)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn device_code_is_deterministic_and_does_not_expose_guid() {
        let a = format_device_code("{AABBCCDD-0011}").unwrap();
        let b = format_device_code("aabbccdd-0011").unwrap();
        assert_eq!(a, b);
        assert!(valid_device_code(&a));
        assert!(!a.contains("AABBCCDD"));
    }

    #[test]
    fn public_key_is_verify_only_material() {
        let bytes = URL_SAFE_NO_PAD.decode(PUBLIC_KEY_SEC1_B64).unwrap();
        assert_eq!(bytes.len(), 65);
        assert_eq!(bytes[0], 4);
        assert!(VerifyingKey::from_sec1_bytes(&bytes).is_ok());
    }

    #[test]
    fn signed_fixture_verifies_and_mutation_fails() {
        let raw = br#"{"schema":"efc-license","version":1,"keyId":"efc-license-v3","algorithm":"ECDSA_P256_SHA256","payload":{"licenseId":"EFC-TEST-FIXTURE","customerName":"Test Customer","centerName":"Test Center","deviceId":"EFC-1111-2222-3333-4444-5555","edition":"desktop","type":"perpetual","durationSeconds":null,"activationMode":"single-install","notes":"fixture"},"signature":"GWpBSl2Uos5_3b9RCzEy1hkILCaHWtHLIcAAd5PcwwTdOEZ4qtzoUgTy7Wd6HoHleBKnLJjFNQx_QsMQLXjRtA"}"#;
        let device = "EFC-1111-2222-3333-4444-5555";
        assert!(parse_and_verify(raw, device).is_ok());
        let changed = String::from_utf8(raw.to_vec())
            .unwrap()
            .replace("Test Center", "Other Center");
        assert!(parse_and_verify(changed.as_bytes(), device).is_err());
    }
}
