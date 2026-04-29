use std::path::PathBuf;

use tauri::State;

use crate::db::AppDatabase;
use crate::models::ScanResult;
use crate::services::scanner;
use crate::commands::db_ops;

/// Scan a root folder: discover all artists → galleries → media files.
/// Upserts all discovered data into the database.
///
/// If `full` is true, performs a complete rescan. Otherwise, performs an incremental scan
/// (only processing changes since last scan).
#[tauri::command]
pub async fn scan_root_folder(
    db: State<'_, AppDatabase>,
    id: i64,
    full: Option<bool>,
) -> Result<ScanResult, String> {
    let full = full.unwrap_or(true);

    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Get root folder path from DB
    let (root_path, _volume_id): (String, i64) = conn
        .query_row(
            "SELECT path, volume_id FROM root_folders WHERE id = ?1",
            [id],
            |row| Ok((row.get(0)?, row.get(1)?)),
        )
        .map_err(|e| format!("Root folder not found: {}", e))?;

    let root = PathBuf::from(&root_path);
    if !root.exists() {
        return Err(format!(
            "Root folder not found (drive disconnected?): {}",
            root_path
        ));
    }

    log::info!("Scanning root folder: {} (full={})", root_path, full);

    let scan_data = scanner::scan_root_folder(&root, id)
        .map_err(|e| {
            log::error!("Scan failed for {}: {}", root_path, e);
            format!("Scan failed: {}", e)
        })?;

    // Persist scan results to DB
    for artist_data in &scan_data.artists {
        let artist_id = db_ops::upsert_artist(&conn, id, artist_data)?;

        let mut gallery_paths: Vec<String> = Vec::new();

        for gallery_data in &artist_data.galleries {
            let gallery_id = db_ops::upsert_gallery(&conn, artist_id, gallery_data)?;
            db_ops::replace_gallery_media(&conn, gallery_id, &gallery_data.media_files)?;
            gallery_paths.push(gallery_data.path.to_string_lossy().to_string());
        }

        // Soft-delete galleries that no longer exist on disk
        db_ops::soft_delete_missing_galleries(&conn, artist_id, &gallery_paths)?;

        // Update unorganized files
        db_ops::replace_unorganized_files(&conn, artist_id, &artist_data.unorganized_files)?;
    }

    // Update root scan metadata
    db_ops::update_root_scan_info(&conn, id)?;

    log::info!(
        "Scan complete: {} artists, {} galleries, {} media files in {}ms",
        scan_data.scan_result.artists_found,
        scan_data.scan_result.galleries_found,
        scan_data.scan_result.media_files_found,
        scan_data.scan_result.scan_duration_ms,
    );

    Ok(scan_data.scan_result)
}
