use tauri::State;

use crate::db::AppDatabase;
use crate::services::chrono_linking::{build_chronological_groups, parse_date_from_filename, ChronologicalGroup};

/// Get galleries under an artist sorted chronologically by parsed date.
/// Galleries without a detectable date are excluded.
#[tauri::command]
pub fn get_chronological_groups(
    db: State<'_, AppDatabase>,
    artist_id: i64,
) -> Result<Vec<ChronologicalGroup>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT id, name FROM galleries WHERE artist_id = ?1 ORDER BY name")
        .map_err(|e| format!("DB prepare error: {}", e))?;

    let galleries: Vec<(i64, String)> = stmt
        .query_map([artist_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| format!("DB query error: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("DB row error: {}", e))?;

    Ok(build_chronological_groups(&galleries))
}

/// Parse dates from media filenames in a gallery and return timeline entries.
/// Each entry has the media file index and the parsed date (or null if not parseable).
#[derive(serde::Serialize)]
pub struct TimelineEntry {
    pub index: usize,
    pub filename: String,
    pub date: Option<String>,
}

#[tauri::command]
pub fn get_gallery_timeline(
    db: State<'_, AppDatabase>,
    gallery_id: i64,
) -> Result<Vec<TimelineEntry>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT filename FROM gallery_media
             WHERE gallery_id = ?1
             ORDER BY sort_order",
        )
        .map_err(|e| format!("DB prepare error: {}", e))?;

    let filenames: Vec<String> = stmt
        .query_map([gallery_id], |row| row.get(0))
        .map_err(|e| format!("DB query error: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("DB row error: {}", e))?;

    let entries = filenames
        .into_iter()
        .enumerate()
        .map(|(i, filename)| {
            let date = parse_date_from_filename(&filename);
            TimelineEntry { index: i, filename, date }
        })
        .collect();

    Ok(entries)
}
