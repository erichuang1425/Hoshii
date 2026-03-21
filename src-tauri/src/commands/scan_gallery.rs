use std::path::PathBuf;

use tauri::State;

use crate::db::AppDatabase;
use crate::models::{MediaEntry, MediaGroup};
use crate::services::scanner;
use crate::commands::db_ops;

/// Scan a single gallery directory and return its sorted media entries.
/// This is used for re-scanning a specific gallery without a full root scan.
#[tauri::command]
pub async fn scan_gallery(
    db: State<'_, AppDatabase>,
    gallery_id: i64,
) -> Result<Vec<MediaEntry>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Get gallery path from DB
    let gallery_path: String = conn
        .query_row(
            "SELECT path FROM galleries WHERE id = ?1",
            [gallery_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Gallery not found: {}", e))?;

    let path = PathBuf::from(&gallery_path);
    if !path.exists() {
        return Err(format!(
            "Gallery not found (drive disconnected?): {}",
            gallery_path
        ));
    }

    log::info!("Scanning gallery: {}", gallery_path);

    let gallery_data = scanner::scan_gallery_dir(&path)
        .map_err(|e| {
            log::error!("Gallery scan failed for {}: {}", gallery_path, e);
            format!("Gallery scan failed: {}", e)
        })?;

    // Update gallery metadata
    conn.execute(
        "UPDATE galleries SET page_count = ?1, total_size = ?2, cover_path = ?3, has_backup_zip = ?4 WHERE id = ?5",
        rusqlite::params![
            gallery_data.media_files.len() as i64,
            gallery_data.total_size as i64,
            gallery_data.cover_path,
            gallery_data.has_backup_zip,
            gallery_id,
        ],
    )
    .map_err(|e| format!("Failed to update gallery: {}", e))?;

    // Replace media entries
    db_ops::replace_gallery_media(&conn, gallery_id, &gallery_data.media_files)?;

    // Return fresh media entries
    db_ops::get_gallery_media(&conn, gallery_id)
}

/// Get all media entries for a gallery (from DB, no disk scan).
#[tauri::command]
pub async fn get_gallery_media(
    db: State<'_, AppDatabase>,
    gallery_id: i64,
) -> Result<Vec<MediaEntry>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;
    db_ops::get_gallery_media(&conn, gallery_id)
}

/// Get media groups for a gallery (from DB).
#[tauri::command]
pub async fn get_media_groups(
    db: State<'_, AppDatabase>,
    gallery_id: i64,
) -> Result<Vec<MediaGroup>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;
    db_ops::get_media_groups(&conn, gallery_id)
}

/// Get all artists for a root folder.
#[tauri::command]
pub async fn get_artists(
    db: State<'_, AppDatabase>,
    root_id: i64,
) -> Result<Vec<crate::models::Artist>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;
    db_ops::get_artists(&conn, root_id)
}

/// Get all galleries for an artist, optionally sorted.
#[tauri::command]
pub async fn get_galleries(
    db: State<'_, AppDatabase>,
    artist_id: i64,
    sort: Option<String>,
) -> Result<Vec<crate::models::Gallery>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;
    db_ops::get_galleries(&conn, artist_id, sort.as_deref())
}
