use rusqlite::{params, Connection, OptionalExtension};
use serde_json::{json, Number, Value};
use std::{fs, path::PathBuf};
use tauri::Manager;

const BANK_KEY: &str = "bank";

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| format!("تعذر تحديد مجلد بيانات التطبيق: {e}"))?;
    fs::create_dir_all(&dir).map_err(|e| format!("تعذر إنشاء مجلد بيانات التطبيق: {e}"))?;
    Ok(dir)
}

fn open_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let conn = Connection::open(app_data_dir(app)?.join("efc-state-v1.sqlite"))
        .map_err(|e| format!("تعذر فتح قاعدة البيانات: {e}"))?;
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA synchronous=NORMAL;
         CREATE TABLE IF NOT EXISTS app_state (
             key TEXT PRIMARY KEY NOT NULL,
             value TEXT NOT NULL,
             updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
         );",
    ).map_err(|e| format!("تعذر تهيئة قاعدة البيانات: {e}"))?;
    Ok(conn)
}

fn bank_next_receipt_no(value: &Value) -> u64 {
    let object = value.as_object();
    let configured = object.and_then(|item| item.get("nextReceiptNo")).and_then(Value::as_u64).filter(|number| *number > 0).unwrap_or(1);
    let max_existing = object.and_then(|item| item.get("entries")).and_then(Value::as_array).map(|entries| {
        entries.iter().filter_map(|entry| entry.get("receiptNo").and_then(Value::as_u64)).max().unwrap_or(0)
    }).unwrap_or(0);
    configured.max(max_existing.saturating_add(1)).max(1)
}

pub fn validate_bank_state(raw: &str) -> Result<(), String> {
    let value: Value = serde_json::from_str(raw).map_err(|_| "بيانات البنك ليست JSON صالحًا.".to_string())?;
    let object = value.as_object().ok_or_else(|| "بيانات البنك غير صالحة.".to_string())?;
    for key in ["entries", "tombstones"] {
        if !object.get(key).is_some_and(Value::is_array) {
            return Err(format!("بيانات البنك ناقصة أو غير صالحة: {key}"));
        }
    }
    if let Some(next) = object.get("nextReceiptNo") {
        if !next.as_u64().is_some_and(|number| number > 0) {
            return Err("بيانات البنك تحتوي عداد روسيات غير صالح.".to_string());
        }
    }
    Ok(())
}

pub fn load_raw(app: &tauri::AppHandle) -> Result<Option<String>, String> {
    let conn = open_db(app)?;
    conn.query_row("SELECT value FROM app_state WHERE key=?1", params![BANK_KEY], |row| row.get::<_, String>(0))
        .optional().map_err(|e| format!("تعذر قراءة بيانات البنك: {e}"))
}

pub fn save_raw(app: &tauri::AppHandle, state: &str) -> Result<(), String> {
    validate_bank_state(state)?;
    let conn = open_db(app)?;
    conn.execute(
        "INSERT INTO app_state(key,value,updated_at)
         VALUES(?1, ?2, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET value=excluded.value, updated_at=CURRENT_TIMESTAMP",
        params![BANK_KEY, state],
    ).map_err(|e| format!("تعذر حفظ بيانات البنك: {e}"))?;
    Ok(())
}

pub fn merge_into_main_state(app: &tauri::AppHandle, main_raw: &str) -> Result<String, String> {
    let mut main: Value = serde_json::from_str(main_raw).map_err(|_| "بيانات EFC الرئيسية غير صالحة.".to_string())?;
    let Some(object) = main.as_object_mut() else { return Err("بيانات EFC الرئيسية غير صالحة.".to_string()); };
    let bank = load_raw(app)?.and_then(|raw| serde_json::from_str::<Value>(&raw).ok()).unwrap_or_else(|| json!({
        "entries": [],
        "tombstones": [],
        "nextReceiptNo": 1
    }));
    let bank_object = bank.as_object();
    object.insert("bankEntries".to_string(), bank_object.and_then(|item| item.get("entries")).cloned().unwrap_or_else(|| Value::Array(vec![])));
    object.insert("bankTombstones".to_string(), bank_object.and_then(|item| item.get("tombstones")).cloned().unwrap_or_else(|| Value::Array(vec![])));
    object.insert("bankNextReceiptNo".to_string(), Value::Number(Number::from(bank_next_receipt_no(&bank))));
    serde_json::to_string(&main).map_err(|e| format!("تعذر تجهيز نسخة بيانات البنك: {e}"))
}

#[tauri::command]
pub fn load_bank_state(app: tauri::AppHandle) -> Result<Option<String>, String> {
    crate::license::require_valid_license()?;
    load_raw(&app)
}

#[tauri::command]
pub fn save_bank_state(app: tauri::AppHandle, state: String) -> Result<(), String> {
    crate::license::require_valid_license()?;
    save_raw(&app, &state)
}
