use rusqlite::params;
use tauri::State;

use crate::db::AppDatabase;
use crate::models::Volume;
use crate::services::volume_tracker;

/// Detect currently mounted volumes, upsert into DB, and return them.
/// Called on app launch and when user triggers a manual refresh.
#[tauri::command]
pub async fn detect_volumes(db: State<'_, AppDatabase>) -> Result<Vec<Volume>, String> {
    log::info!("detect_volumes: scanning mounted volumes");

    let detected = volume_tracker::detect_mounted_volumes()
        .map_err(|e| {
            log::error!("Failed to detect volumes: {}", e);
            format!("Failed to detect volumes: {}", e)
        })?;

    let conn = db.conn.lock().map_err(|e| {
        log::error!("Failed to acquire database lock: {}", e);
        format!("Database lock error: {}", e)
    })?;

    // Mark all volumes offline first, then update detected ones
    conn.execute("UPDATE volumes SET is_online = FALSE", [])
        .map_err(|e| {
            log::error!("Failed to mark volumes offline: {}", e);
            format!("Database error: {}", e)
        })?;

    for vol in &detected {
        conn.execute(
            "INSERT INTO volumes (uuid, label, mount_path, is_online, is_removable, total_bytes, last_seen)
             VALUES (?1, ?2, ?3, TRUE, ?4, ?5, CURRENT_TIMESTAMP)
             ON CONFLICT(uuid) DO UPDATE SET
                label = COALESCE(?2, label),
                mount_path = ?3,
                is_online = TRUE,
                is_removable = ?4,
                total_bytes = ?5,
                last_seen = CURRENT_TIMESTAMP",
            params![
                vol.uuid,
                vol.label,
                vol.mount_path.to_string_lossy().as_ref(),
                vol.is_removable,
                vol.total_bytes as i64,
            ],
        )
        .map_err(|e| {
            log::error!("Failed to upsert volume {}: {}", vol.uuid, e);
            format!("Database error: {}", e)
        })?;
    }

    log::info!("detect_volumes: upserted {} volumes", detected.len());

    get_all_volumes(&conn)
}

/// Get all known volumes from the database.
#[tauri::command]
pub async fn get_volumes(db: State<'_, AppDatabase>) -> Result<Vec<Volume>, String> {
    log::debug!("get_volumes: fetching all volumes");

    let conn = db.conn.lock().map_err(|e| {
        log::error!("Failed to acquire database lock: {}", e);
        format!("Database lock error: {}", e)
    })?;

    get_all_volumes(&conn)
}

/// Re-check which volumes are online and update the database.
/// Does not add new volumes — only refreshes status of known ones.
#[tauri::command]
pub async fn refresh_volume_status(db: State<'_, AppDatabase>) -> Result<Vec<Volume>, String> {
    log::info!("refresh_volume_status: checking volume connectivity");

    let detected = volume_tracker::detect_mounted_volumes()
        .map_err(|e| {
            log::error!("Failed to detect volumes: {}", e);
            format!("Failed to detect volumes: {}", e)
        })?;

    let conn = db.conn.lock().map_err(|e| {
        log::error!("Failed to acquire database lock: {}", e);
        format!("Database lock error: {}", e)
    })?;

    // Mark all offline first
    conn.execute("UPDATE volumes SET is_online = FALSE", [])
        .map_err(|e| {
            log::error!("Failed to mark volumes offline: {}", e);
            format!("Database error: {}", e)
        })?;

    // Update only known volumes that are currently mounted
    for vol in &detected {
        conn.execute(
            "UPDATE volumes SET
                mount_path = ?2,
                is_online = TRUE,
                total_bytes = ?3,
                last_seen = CURRENT_TIMESTAMP
             WHERE uuid = ?1",
            params![
                vol.uuid,
                vol.mount_path.to_string_lossy().as_ref(),
                vol.total_bytes as i64,
            ],
        )
        .map_err(|e| {
            log::error!("Failed to refresh volume {}: {}", vol.uuid, e);
            format!("Database error: {}", e)
        })?;
    }

    log::info!("refresh_volume_status: refreshed against {} mounted volumes", detected.len());

    get_all_volumes(&conn)
}

/// Helper: fetch all volumes from the database.
fn get_all_volumes(conn: &rusqlite::Connection) -> Result<Vec<Volume>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, uuid, label, mount_path, is_online, is_removable, total_bytes, last_seen
             FROM volumes ORDER BY label, uuid",
        )
        .map_err(|e| {
            log::error!("Failed to prepare volume query: {}", e);
            format!("Database error: {}", e)
        })?;

    let volumes = stmt
        .query_map([], |row| {
            Ok(Volume {
                id: row.get(0)?,
                uuid: row.get(1)?,
                label: row.get(2)?,
                mount_path: row.get(3)?,
                is_online: row.get(4)?,
                is_removable: row.get(5)?,
                total_bytes: row.get(6)?,
                last_seen: row.get(7)?,
            })
        })
        .map_err(|e| {
            log::error!("Failed to query volumes: {}", e);
            format!("Database error: {}", e)
        })?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| {
            log::error!("Failed to collect volume rows: {}", e);
            format!("Database error: {}", e)
        })?;

    Ok(volumes)
}
