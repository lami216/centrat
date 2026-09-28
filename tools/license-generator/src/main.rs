use base64::{engine::general_purpose::URL_SAFE_NO_PAD, Engine as _};
use p256::{
    ecdsa::{signature::{Signer, Verifier}, Signature, SigningKey},
    pkcs8::DecodePrivateKey,
};
use rand_core::{OsRng, RngCore};
use serde::{Deserialize, Serialize};
use std::{
    env,
    fs,
    io::{self, Write},
    path::{Path, PathBuf},
    time::{SystemTime, UNIX_EPOCH},
};

const LICENSE_SCHEMA: &str = "efc-license";
const LICENSE_VERSION: u8 = 1;
const LICENSE_KEY_ID: &str = "efc-license-v3";
const LICENSE_ALGORITHM: &str = "ECDSA_P256_SHA256";
const DEFAULT_KEY_FILE: &str = "EFC-license-master-private-v3.pem";
const PUBLIC_KEY_SEC1_B64: &str = "BDDLo6mYqhmQbaUyS_xmMkebb3Nz28ZmWU3bF6alhqeXt7mxLrk_pxDc4vaz9RXV5mICatMtADIQvkF4EdLM8LY";

#[derive(Clone, Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase", deny_unknown_fields)]
struct LicensePayload {
    license_id: String,
    customer_name: String,
    center_name: String,
    device_id: String,
    edition: String,
    #[serde(rename = "type")]
    license_type: String,
    duration_seconds: Option<u64>,
    activation_mode: String,
    notes: String,
}

#[derive(Serialize)]
#[serde(rename_all = "camelCase")]
struct LicenseDocument {
    schema: String,
    version: u8,
    key_id: String,
    algorithm: String,
    payload: LicensePayload,
    signature: String,
}

fn prompt(label: &str) -> Result<String, String> {
    print!("{label}: ");
    io::stdout().flush().map_err(|e| e.to_string())?;
    let mut value = String::new();
    io::stdin().read_line(&mut value).map_err(|e| e.to_string())?;
    Ok(value.trim().to_string())
}

fn clean_path(value: &str) -> PathBuf {
    PathBuf::from(value.trim().trim_matches('"').trim_matches('\''))
}

fn executable_dir() -> PathBuf {
    env::current_exe()
        .ok()
        .and_then(|path| path.parent().map(Path::to_path_buf))
        .or_else(|| env::current_dir().ok())
        .unwrap_or_else(|| PathBuf::from("."))
}

fn valid_device_code(value: &str) -> bool {
    let parts = value.split('-').collect::<Vec<_>>();
    parts.len() == 6
        && parts[0] == "EFC"
        && parts[1..]
            .iter()
            .all(|part| part.len() == 4 && part.chars().all(|ch| ch.is_ascii_hexdigit()))
}

fn load_signing_key() -> Result<SigningKey, String> {
    let exe_dir = executable_dir();
    let default = exe_dir.join(DEFAULT_KEY_FILE);
    let path = if let Some(value) = env::var_os("EFC_LICENSE_PRIVATE_KEY") {
        PathBuf::from(value)
    } else if default.is_file() {
        default
    } else {
        let entered = prompt("مسار المفتاح الخاص EFC-license-master-private-v3.pem")?;
        clean_path(&entered)
    };
    let pem = fs::read_to_string(&path)
        .map_err(|e| format!("تعذر قراءة المفتاح الخاص {}: {e}", path.display()))?;
    let signing_key = SigningKey::from_pkcs8_pem(&pem)
        .map_err(|_| "المفتاح الخاص غير صالح أو ليس بصيغة PKCS#8 PEM.".to_string())?;
    let expected = URL_SAFE_NO_PAD
        .decode(PUBLIC_KEY_SEC1_B64)
        .map_err(|_| "تعذر قراءة المفتاح العام المدمج.".to_string())?;
    let actual = signing_key.verifying_key().to_encoded_point(false);
    if actual.as_bytes() != expected.as_slice() {
        return Err("هذا المفتاح الخاص لا يخص نسخة EFC الحالية. لم يتم إنشاء ملف تفعيل.".to_string());
    }
    Ok(signing_key)
}

fn make_license_id() -> Result<String, String> {
    let seconds = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|_| "تعذر قراءة وقت الجهاز.".to_string())?
        .as_secs();
    let mut random = [0u8; 6];
    OsRng.fill_bytes(&mut random);
    let suffix = random.iter().map(|byte| format!("{byte:02X}")).collect::<String>();
    Ok(format!("EFC-{seconds}-{suffix}"))
}

fn create_payload() -> Result<LicensePayload, String> {
    let customer_name = prompt("اسم العميل/المسؤول")?;
    if customer_name.is_empty() {
        return Err("اسم العميل مطلوب.".to_string());
    }
    let center_name = prompt("اسم المركز")?;
    if center_name.is_empty() {
        return Err("اسم المركز مطلوب.".to_string());
    }
    let device_id = prompt("رقم جهاز EFC")?.to_uppercase();
    if !valid_device_code(&device_id) {
        return Err("رقم الجهاز غير صالح. انسخه من شاشة تفعيل EFC كما هو.".to_string());
    }
    println!("نوع التفعيل: 1 = دائم، 2 = مؤقت");
    let kind = prompt("الاختيار")?;
    let (license_type, duration_seconds) = match kind.as_str() {
        "1" => ("perpetual".to_string(), None),
        "2" => {
            let hours = prompt("مدة التفعيل بالساعات")?
                .parse::<u64>()
                .map_err(|_| "أدخل عدد ساعات صحيحًا.".to_string())?;
            if hours == 0 {
                return Err("مدة التفعيل يجب أن تكون أكبر من صفر.".to_string());
            }
            let seconds = hours
                .checked_mul(3600)
                .ok_or_else(|| "مدة التفعيل كبيرة جدًا.".to_string())?;
            ("temporary".to_string(), Some(seconds))
        }
        _ => return Err("اختيار نوع التفعيل غير صحيح.".to_string()),
    };
    let notes = prompt("ملاحظة اختيارية")?;
    Ok(LicensePayload {
        license_id: make_license_id()?,
        customer_name,
        center_name,
        device_id,
        edition: "desktop".to_string(),
        license_type,
        duration_seconds,
        activation_mode: "single-install".to_string(),
        notes,
    })
}

fn safe_file_part(value: &str) -> String {
    value
        .chars()
        .map(|ch| if ch.is_ascii_alphanumeric() || ch == '-' || ch == '_' { ch } else { '_' })
        .collect()
}

fn run() -> Result<PathBuf, String> {
    println!("============================================");
    println!("      EFC - أداة توليد ملفات التفعيل");
    println!("============================================");
    println!("المفتاح الخاص لا يُرسل للعميل ولا يوضع داخل البرنامج.\n");
    let signing_key = load_signing_key()?;
    let payload = create_payload()?;
    let canonical = serde_json::to_vec(&payload)
        .map_err(|e| format!("تعذر تجهيز بيانات التفعيل: {e}"))?;
    let signature: Signature = signing_key.sign(&canonical);
    signing_key
        .verifying_key()
        .verify(&canonical, &signature)
        .map_err(|_| "فشل اختبار التوقيع قبل إنشاء الملف.".to_string())?;
    let document = LicenseDocument {
        schema: LICENSE_SCHEMA.to_string(),
        version: LICENSE_VERSION,
        key_id: LICENSE_KEY_ID.to_string(),
        algorithm: LICENSE_ALGORITHM.to_string(),
        payload: payload.clone(),
        signature: URL_SAFE_NO_PAD.encode(signature.to_bytes()),
    };
    let json = serde_json::to_string_pretty(&document)
        .map_err(|e| format!("تعذر إنشاء ملف التفعيل: {e}"))?;
    let filename = format!(
        "EFC-activation-{}-{}.efc-license",
        safe_file_part(&payload.device_id),
        safe_file_part(&payload.license_id)
    );
    let path = executable_dir().join(filename);
    fs::write(&path, json.as_bytes())
        .map_err(|e| format!("تعذر حفظ ملف التفعيل {}: {e}", path.display()))?;
    Ok(path)
}

fn main() {
    match run() {
        Ok(path) => {
            println!("\nتم إنشاء ملف التفعيل بنجاح:");
            println!("{}", path.display());
        }
        Err(error) => {
            eprintln!("\nخطأ: {error}");
        }
    }
    println!("\nاضغط Enter للإغلاق...");
    let mut pause = String::new();
    let _ = io::stdin().read_line(&mut pause);
}
