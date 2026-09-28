#![cfg_attr(not(debug_assertions), windows_subsystem = "windows")]

mod bank_state;
mod certificate_state;
mod license;
mod receipt_pdf;

use bank_state::{load_bank_state, save_bank_state};
use certificate_state::{load_certificate_state, save_certificate_state};
use license::{get_license_device_id, get_license_status, install_license_file};
use receipt_pdf::save_receipt_pdf;
use rusqlite::{params, Connection, OptionalExtension};
use serde_json::Value;
use std::{
    fs,
    path::PathBuf,
    time::{SystemTime, UNIX_EPOCH},
};
use tauri::Manager;

fn app_data_dir(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app
        .path()
        .app_data_dir()
        .map_err(|e| format!("تعذر تحديد مجلد بيانات التطبيق: {e}"))?;
    fs::create_dir_all(&dir)
        .map_err(|e| format!("تعذر إنشاء مجلد بيانات التطبيق: {e}"))?;
    Ok(dir)
}

fn db_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    Ok(app_data_dir(app)?.join("efc-state-v1.sqlite"))
}

fn open_db(app: &tauri::AppHandle) -> Result<Connection, String> {
    let conn = Connection::open(db_path(app)?)
        .map_err(|e| format!("تعذر فتح قاعدة البيانات: {e}"))?;
    conn.execute_batch(
        "PRAGMA journal_mode=WAL;
         PRAGMA synchronous=NORMAL;
         CREATE TABLE IF NOT EXISTS app_state (
             key TEXT PRIMARY KEY NOT NULL,
             value TEXT NOT NULL,
             updated_at TEXT NOT NULL DEFAULT CURRENT_TIMESTAMP
         );",
    )
    .map_err(|e| format!("تعذر تهيئة قاعدة البيانات: {e}"))?;
    Ok(conn)
}

fn load_state_raw(app: &tauri::AppHandle) -> Result<Option<String>, String> {
    let conn = open_db(app)?;
    conn.query_row(
        "SELECT value FROM app_state WHERE key='main'",
        [],
        |row| row.get::<_, String>(0),
    )
    .optional()
    .map_err(|e| format!("تعذر قراءة بيانات التطبيق: {e}"))
}

fn save_state_raw(app: &tauri::AppHandle, state: &str) -> Result<(), String> {
    let conn = open_db(app)?;
    conn.execute(
        "INSERT INTO app_state(key,value,updated_at)
         VALUES('main', ?1, CURRENT_TIMESTAMP)
         ON CONFLICT(key) DO UPDATE SET
           value=excluded.value,
           updated_at=CURRENT_TIMESTAMP",
        params![state],
    )
    .map_err(|e| format!("تعذر حفظ بيانات التطبيق: {e}"))?;
    Ok(())
}

fn validate_state_json(raw: &str) -> Result<(), String> {
    let value: Value = serde_json::from_str(raw)
        .map_err(|_| "ملف النسخة ليس ملف JSON صالحًا.".to_string())?;
    let object = value
        .as_object()
        .ok_or_else(|| "ملف النسخة لا يحتوي بيانات EFC صالحة.".to_string())?;

    for key in ["students", "specialties", "paymentMethods"] {
        if !object.get(key).is_some_and(Value::is_array) {
            return Err(format!("ملف النسخة ناقص أو غير صالح: {key}"));
        }
    }
    for key in ["certificateBranches", "certificateReceipts"] {
        if let Some(value) = object.get(key) {
            if !value.is_array() {
                return Err(format!("ملف النسخة يحتوي بيانات شهادات غير صالحة: {key}"));
            }
        }
    }
    for key in ["bankEntries", "bankTombstones"] {
        if let Some(value) = object.get(key) {
            if !value.is_array() {
                return Err(format!("ملف النسخة يحتوي بيانات بنك غير صالحة: {key}"));
            }
        }
    }
    if let Some(value) = object.get("bankNextReceiptNo") {
        if !value.as_u64().is_some_and(|number| number > 0) {
            return Err("ملف النسخة يحتوي عداد روسيات بنك غير صالح.".to_string());
        }
    }
    Ok(())
}

fn write_safety_backup(app: &tauri::AppHandle) -> Result<(), String> {
    let Some(current) = load_state_raw(app)? else {
        return Ok(());
    };
    validate_state_json(&current)?;
    let combined = certificate_state::merge_into_main_state(app, &current)?;
    let combined = bank_state::merge_into_main_state(app, &combined)?;
    let backups = app_data_dir(app)?.join("backups");
    fs::create_dir_all(&backups)
        .map_err(|e| format!("تعذر إنشاء مجلد نسخ الأمان: {e}"))?;
    let stamp = SystemTime::now()
        .duration_since(UNIX_EPOCH)
        .map_err(|e| format!("تعذر إنشاء وقت نسخة الأمان: {e}"))?
        .as_millis();
    fs::write(backups.join(format!("auto-before-restore-{stamp}.json")), combined)
        .map_err(|e| format!("تعذر إنشاء نسخة الأمان قبل الاستعادة: {e}"))?;
    Ok(())
}

#[tauri::command]
fn load_app_state(app: tauri::AppHandle) -> Result<Option<String>, String> {
    license::require_valid_license()?;
    load_state_raw(&app)
}

#[tauri::command]
fn save_app_state(app: tauri::AppHandle, state: String) -> Result<(), String> {
    license::require_valid_license()?;
    validate_state_json(&state)?;
    save_state_raw(&app, &state)
}

#[tauri::command]
fn export_backup(app: tauri::AppHandle, suggested_name: String) -> Result<Option<String>, String> {
    license::require_valid_license()?;
    let state = load_state_raw(&app)?.unwrap_or_else(|| {
        r#"{"version":3,"updatedAt":0,"students":[],"specialties":[],"paymentMethods":[]}"#.to_string()
    });
    validate_state_json(&state)?;
    let combined = certificate_state::merge_into_main_state(&app, &state)?;
    let combined = bank_state::merge_into_main_state(&app, &combined)?;

    let Some(path) = rfd::FileDialog::new()
        .add_filter("EFC data backup", &["json"])
        .set_file_name(&suggested_name)
        .save_file()
    else {
        return Ok(None);
    };

    fs::write(&path, combined).map_err(|e| format!("تعذر حفظ ملف النسخة: {e}"))?;
    Ok(Some(path.to_string_lossy().into_owned()))
}

#[tauri::command]
fn import_backup(app: tauri::AppHandle) -> Result<Option<String>, String> {
    license::require_valid_license()?;
    let Some(path) = rfd::FileDialog::new()
        .add_filter("EFC data backup", &["json"])
        .pick_file()
    else {
        return Ok(None);
    };

    let state = fs::read_to_string(&path)
        .map_err(|e| format!("تعذر قراءة ملف النسخة: {e}"))?;
    validate_state_json(&state)?;

    // Keep the current database intact. The browser layer merges the selected
    // backup into the current state and then persists the merged result.
    // This safety snapshot is intentionally additive and never deletes older snapshots.
    write_safety_backup(&app)?;
    Ok(Some(state))
}

#[tauri::command]
fn exit_app(app: tauri::AppHandle) {
    app.exit(0);
}

fn main() {
    let app = tauri::Builder::default()
        .invoke_handler(tauri::generate_handler![
            get_license_device_id,
            get_license_status,
            install_license_file,
            load_app_state,
            save_app_state,
            export_backup,
            import_backup,
            load_certificate_state,
            save_certificate_state,
            load_bank_state,
            save_bank_state,
            save_receipt_pdf,
            exit_app
        ])
        .build(tauri::generate_context!())
        .expect("error while building Centre EFC");

    app.run(|app_handle, event| {
        if let tauri::RunEvent::WindowEvent { label, event, .. } = event {
            if label != "main" {
                return;
            }
            if let tauri::WindowEvent::CloseRequested { api, .. } = event {
                // The activation window must always remain closable. Once licensed,
                // the frontend flushes pending state before offering the save dialog.
                if license::require_valid_license().is_err() {
                    return;
                }
                api.prevent_close();
                if let Some(window) = app_handle.get_webview_window("main") {
                    if window
                        .eval("if(typeof window.EFC_REQUEST_CLOSE_BACKUP==='function'){window.EFC_REQUEST_CLOSE_BACKUP();}else{window.__TAURI__?.core?.invoke('exit_app');}")
                        .is_err()
                    {
                        app_handle.exit(0);
                    }
                } else {
                    app_handle.exit(0);
                }
            }
        }
    });
}
