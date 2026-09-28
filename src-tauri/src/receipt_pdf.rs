use base64::{engine::general_purpose::STANDARD, Engine as _};
use std::{fs, path::{Path, PathBuf}};

fn sanitize_file_name(name: &str) -> String {
    let mut cleaned = String::new();
    for ch in name.trim().chars() {
        if ch.is_control() || matches!(ch, '<' | '>' | ':' | '"' | '/' | '\\' | '|' | '?' | '*') {
            cleaned.push('_');
        } else {
            cleaned.push(ch);
        }
    }
    let cleaned = cleaned.trim().trim_end_matches('.').trim();
    let stem = cleaned.strip_suffix(".pdf").unwrap_or(cleaned).trim();
    let stem = if stem.is_empty() { "EFC-receipt" } else { stem };
    format!("{stem}.pdf")
}

fn ensure_pdf_extension(path: PathBuf) -> PathBuf {
    if path.extension().and_then(|value| value.to_str()).is_some_and(|value| value.eq_ignore_ascii_case("pdf")) {
        return path;
    }
    let parent = path.parent().map(Path::to_path_buf).unwrap_or_default();
    let stem = path.file_stem().and_then(|value| value.to_str()).unwrap_or("EFC-receipt");
    parent.join(format!("{stem}.pdf"))
}

#[tauri::command]
pub fn save_receipt_pdf(file_name: String, data_base64: String) -> Result<Option<String>, String> {
    crate::license::require_valid_license()?;
    let bytes = STANDARD
        .decode(data_base64.as_bytes())
        .map_err(|e| format!("تعذر فك بيانات PDF: {e}"))?;
    if !bytes.starts_with(b"%PDF-") {
        return Err("ملف الروسي الناتج ليس PDF صالحًا.".to_string());
    }

    let suggested = sanitize_file_name(&file_name);
    let Some(selected) = rfd::FileDialog::new()
        .add_filter("PDF", &["pdf"])
        .set_file_name(&suggested)
        .save_file()
    else {
        return Ok(None);
    };

    let path = ensure_pdf_extension(selected);
    fs::write(&path, bytes)
        .map_err(|e| format!("تعذر حفظ ملف الروسي: {e}"))?;
    Ok(Some(path.to_string_lossy().into_owned()))
}
