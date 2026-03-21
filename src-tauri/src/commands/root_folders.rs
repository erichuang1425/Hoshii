use rusqlite::params;
use tauri::State;

use crate::db::AppDatabase;
use crate::models::RootFolder;

#[tauri::command]
pub async fn get_root_folders(db: State<'_, AppDatabase>) -> Result<Vec<RootFolder>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, volume_id, path, relative_path, label, last_scan, scan_version \
             FROM root_folders \
             ORDER BY path",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let folders = stmt
        .query_map([], |row| {
            Ok(RootFolder {
                id: row.get(0)?,
                volume_id: row.get(1)?,
                path: row.get(2)?,
                relative_path: row.get(3)?,
                label: row.get(4)?,
                last_scan: row.get(5)?,
                scan_version: row.get(6)?,
            })
        })
        .map_err(|e| format!("Failed to query root folders: {}", e))?;

    folders
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read root folder row: {}", e))
}

#[tauri::command]
pub async fn add_root_folder(
    db: State<'_, AppDatabase>,
    path: String,
    label: Option<String>,
) -> Result<RootFolder, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Resolve to absolute path and validate it exists
    let abs_path = std::path::Path::new(&path);
    if !abs_path.is_dir() {
        return Err(format!("Path does not exist or is not a directory: {}", path));
    }

    let canonical = abs_path
        .canonicalize()
        .map_err(|e| format!("Failed to canonicalize path: {}", e))?;
    let path_str = canonical.to_string_lossy().to_string();

    // Derive relative_path from the last component
    let relative_path = canonical
        .file_name()
        .map(|n| n.to_string_lossy().to_string())
        .unwrap_or_else(|| path_str.clone());

    // Find or create volume for this path's mount point
    // Create a 'local' placeholder volume if no online volume is detected
    let volume_id: i64 = conn
        .query_row(
            "SELECT id FROM volumes WHERE is_online = TRUE ORDER BY id LIMIT 1",
            [],
            |row| row.get(0),
        )
        .unwrap_or_else(|_| {
            conn.execute(
                "INSERT OR IGNORE INTO volumes (uuid, label, mount_path, is_online) \
                 VALUES ('local', 'Local', '/', TRUE)",
                [],
            )
            .ok();
            conn.query_row(
                "SELECT id FROM volumes WHERE uuid = 'local'",
                [],
                |row| row.get(0),
            )
            .map_err(|e| {
                log::error!("Failed to create or find local volume: {}", e);
                e
            })
            .unwrap_or_else(|_| {
                // Last resort: get any volume ID that exists
                conn.query_row("SELECT id FROM volumes ORDER BY id LIMIT 1", [], |row| row.get(0))
                    .unwrap_or(1)
            })
        });

    conn.execute(
        "INSERT INTO root_folders (volume_id, path, relative_path, label) \
         VALUES (?1, ?2, ?3, ?4)",
        params![volume_id, path_str, relative_path, label],
    )
    .map_err(|e| format!("Failed to add root folder: {}", e))?;

    let id = conn.last_insert_rowid();

    Ok(RootFolder {
        id,
        volume_id,
        path: path_str,
        relative_path,
        label,
        last_scan: None,
        scan_version: 0,
    })
}

#[tauri::command]
pub async fn remove_root_folder(
    db: State<'_, AppDatabase>,
    id: i64,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let affected = conn
        .execute("DELETE FROM root_folders WHERE id = ?1", params![id])
        .map_err(|e| format!("Failed to remove root folder: {}", e))?;

    if affected == 0 {
        return Err(format!("Root folder with id {} not found", id));
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use crate::db;
    use tempfile::TempDir;

    #[test]
    fn test_get_root_folders_empty() {
        let tmp = TempDir::new().unwrap();
        let conn = db::init_db(tmp.path()).unwrap();

        let mut stmt = conn
            .prepare("SELECT id FROM root_folders")
            .unwrap();
        let count = stmt.query_map([], |row| row.get::<_, i64>(0)).unwrap().count();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_add_and_remove_root_folder() {
        let tmp = TempDir::new().unwrap();
        let conn = db::init_db(tmp.path()).unwrap();

        // Create a volume first
        conn.execute(
            "INSERT INTO volumes (uuid, label, mount_path, is_online) VALUES ('v1', 'V', '/v', TRUE)",
            [],
        )
        .unwrap();

        // Add root folder
        conn.execute(
            "INSERT INTO root_folders (volume_id, path, relative_path, label) VALUES (1, '/v/root', 'root', 'Test')",
            [],
        )
        .unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM root_folders", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 1);

        // Remove it (cascade should clean up children)
        conn.execute("DELETE FROM root_folders WHERE id = 1", []).unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM root_folders", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }
}
