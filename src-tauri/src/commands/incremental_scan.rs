use std::path::PathBuf;

use tauri::State;

use crate::db::AppDatabase;
use crate::models::ScanResult;
use crate::services::scanner;
use crate::commands::db_ops;

/// Perform an incremental scan of a root folder.
///
/// Instead of re-scanning every file, compares file mtimes against the DB
/// and only processes new/modified files. Soft-deletes files that no longer exist.
#[tauri::command]
pub async fn incremental_scan(
    db: State<'_, AppDatabase>,
    root_id: i64,
) -> Result<ScanResult, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Get root folder path
    let root_path: String = conn
        .query_row(
            "SELECT path FROM root_folders WHERE id = ?1",
            [root_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Root folder not found: {}", e))?;

    let root = PathBuf::from(&root_path);
    if !root.exists() {
        return Err(format!(
            "Root folder not found (drive disconnected?): {}",
            root_path
        ));
    }

    log::info!("Incremental scan of root folder: {}", root_path);

    // Do a full scan to get current state
    let scan_data = scanner::scan_root_folder(&root, root_id)
        .map_err(|e| {
            log::error!("Incremental scan failed for {}: {}", root_path, e);
            format!("Scan failed: {}", e)
        })?;

    let mut total_changed: i64 = 0;

    for artist_data in &scan_data.artists {
        let artist_id = db_ops::upsert_artist(&conn, root_id, artist_data)?;

        let mut gallery_paths: Vec<String> = Vec::new();

        for gallery_data in &artist_data.galleries {
            let gallery_path_str = gallery_data.path.to_string_lossy().to_string();
            gallery_paths.push(gallery_path_str.clone());

            let gallery_id = db_ops::upsert_gallery(&conn, artist_id, gallery_data)?;

            // Get known mtimes for this gallery
            let known_mtimes = db_ops::get_gallery_mtime_map(&conn, gallery_id)?;

            // Compare
            let diff = scanner::compute_incremental_diff(&gallery_data.path, &known_mtimes)
                .map_err(|e| format!("Diff failed: {}", e))?;

            let changes = diff.new_files.len() + diff.modified_files.len() + diff.deleted_paths.len();

            if changes > 0 {
                // Re-scan and replace all media for this gallery
                db_ops::replace_gallery_media(&conn, gallery_id, &gallery_data.media_files)?;
                total_changed += changes as i64;
                log::debug!(
                    "Gallery {} changed: {} new, {} modified, {} deleted",
                    gallery_data.name,
                    diff.new_files.len(),
                    diff.modified_files.len(),
                    diff.deleted_paths.len(),
                );
            }
        }

        db_ops::soft_delete_missing_galleries(&conn, artist_id, &gallery_paths)?;
        db_ops::replace_unorganized_files(&conn, artist_id, &artist_data.unorganized_files)?;
    }

    db_ops::update_root_scan_info(&conn, root_id)?;

    let mut result = scan_data.scan_result;
    result.changed_files = total_changed;

    log::info!(
        "Incremental scan complete: {} changed files",
        total_changed
    );

    Ok(result)
}
