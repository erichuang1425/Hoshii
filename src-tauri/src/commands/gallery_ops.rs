use rusqlite::params;
use tauri::State;

use crate::db::AppDatabase;
use crate::models::Gallery;

#[tauri::command]
pub async fn toggle_favorite(
    db: State<'_, AppDatabase>,
    gallery_id: i64,
) -> Result<bool, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Toggle the favorited flag and return new value
    conn.execute(
        "UPDATE galleries SET favorited = NOT favorited WHERE id = ?1 AND is_deleted = FALSE",
        params![gallery_id],
    )
    .map_err(|e| format!("Failed to toggle favorite: {}", e))?;

    let new_value: bool = conn
        .query_row(
            "SELECT favorited FROM galleries WHERE id = ?1",
            params![gallery_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Gallery not found: {}", e))?;

    Ok(new_value)
}

#[tauri::command]
pub async fn update_reading_progress(
    db: State<'_, AppDatabase>,
    gallery_id: i64,
    page: i64,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    conn.execute(
        "UPDATE galleries SET last_read_page = ?1, last_read_at = CURRENT_TIMESTAMP \
         WHERE id = ?2 AND is_deleted = FALSE",
        params![page, gallery_id],
    )
    .map_err(|e| format!("Failed to update reading progress: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn get_recent_galleries(
    db: State<'_, AppDatabase>,
    limit: Option<i64>,
) -> Result<Vec<Gallery>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let limit = limit.unwrap_or(20);

    let mut stmt = conn
        .prepare(
            "SELECT id, artist_id, name, path, page_count, total_size, cover_path, \
             has_backup_zip, zip_status, last_read_page, last_read_at, favorited \
             FROM galleries \
             WHERE last_read_at IS NOT NULL AND is_deleted = FALSE \
             ORDER BY last_read_at DESC \
             LIMIT ?1",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let galleries = stmt
        .query_map(params![limit], |row| {
            let zip_status_str: String = row.get(8)?;
            Ok(Gallery {
                id: row.get(0)?,
                artist_id: row.get(1)?,
                name: row.get(2)?,
                path: row.get(3)?,
                page_count: row.get(4)?,
                total_size: row.get(5)?,
                cover_path: row.get(6)?,
                has_backup_zip: row.get(7)?,
                zip_status: crate::models::ZipStatus::from_str_value(&zip_status_str),
                last_read_page: row.get(9)?,
                last_read_at: row.get(10)?,
                favorited: row.get(11)?,
            })
        })
        .map_err(|e| format!("Failed to query recent galleries: {}", e))?;

    galleries
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read gallery row: {}", e))
}

#[tauri::command]
pub async fn search_galleries(
    db: State<'_, AppDatabase>,
    query: String,
    root_id: Option<i64>,
) -> Result<Vec<Gallery>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let search_pattern = format!("%{}%", query);

    let (sql, params_vec): (&str, Vec<Box<dyn rusqlite::types::ToSql>>) = if let Some(rid) = root_id {
        (
            "SELECT g.id, g.artist_id, g.name, g.path, g.page_count, g.total_size, \
             g.cover_path, g.has_backup_zip, g.zip_status, g.last_read_page, \
             g.last_read_at, g.favorited \
             FROM galleries g \
             JOIN artists a ON a.id = g.artist_id \
             WHERE g.is_deleted = FALSE \
             AND (g.name LIKE ?1 OR a.name LIKE ?1) \
             AND a.root_id = ?2 \
             ORDER BY g.name COLLATE NOCASE \
             LIMIT 100",
            vec![
                Box::new(search_pattern) as Box<dyn rusqlite::types::ToSql>,
                Box::new(rid) as Box<dyn rusqlite::types::ToSql>,
            ],
        )
    } else {
        (
            "SELECT g.id, g.artist_id, g.name, g.path, g.page_count, g.total_size, \
             g.cover_path, g.has_backup_zip, g.zip_status, g.last_read_page, \
             g.last_read_at, g.favorited \
             FROM galleries g \
             JOIN artists a ON a.id = g.artist_id \
             WHERE g.is_deleted = FALSE \
             AND (g.name LIKE ?1 OR a.name LIKE ?1) \
             ORDER BY g.name COLLATE NOCASE \
             LIMIT 100",
            vec![Box::new(search_pattern) as Box<dyn rusqlite::types::ToSql>],
        )
    };

    let mut stmt = conn
        .prepare(sql)
        .map_err(|e| format!("Failed to prepare search query: {}", e))?;

    let param_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let galleries = stmt
        .query_map(param_refs.as_slice(), |row| {
            let zip_status_str: String = row.get(8)?;
            Ok(Gallery {
                id: row.get(0)?,
                artist_id: row.get(1)?,
                name: row.get(2)?,
                path: row.get(3)?,
                page_count: row.get(4)?,
                total_size: row.get(5)?,
                cover_path: row.get(6)?,
                has_backup_zip: row.get(7)?,
                zip_status: crate::models::ZipStatus::from_str_value(&zip_status_str),
                last_read_page: row.get(9)?,
                last_read_at: row.get(10)?,
                favorited: row.get(11)?,
            })
        })
        .map_err(|e| format!("Failed to search galleries: {}", e))?;

    galleries
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read gallery row: {}", e))
}

#[cfg(test)]
mod tests {
    use crate::db;
    use tempfile::TempDir;

    fn setup_db() -> (TempDir, rusqlite::Connection) {
        let tmp = TempDir::new().unwrap();
        let conn = db::init_db(tmp.path()).unwrap();

        conn.execute(
            "INSERT INTO volumes (uuid, label, mount_path, is_online) VALUES ('v1', 'V', '/v', TRUE)",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO root_folders (volume_id, path, relative_path) VALUES (1, '/v/r', 'r')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO artists (root_id, name, path) VALUES (1, 'Artist1', '/v/r/a')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO galleries (artist_id, name, path, favorited) VALUES (1, 'Gallery1', '/v/r/a/g1', FALSE)",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO galleries (artist_id, name, path, favorited) VALUES (1, 'Gallery2', '/v/r/a/g2', TRUE)",
            [],
        ).unwrap();

        (tmp, conn)
    }

    #[test]
    fn test_toggle_favorite() {
        let (_tmp, conn) = setup_db();

        // Toggle gallery 1 from false to true
        conn.execute(
            "UPDATE galleries SET favorited = NOT favorited WHERE id = 1",
            [],
        ).unwrap();

        let fav: bool = conn
            .query_row("SELECT favorited FROM galleries WHERE id = 1", [], |row| row.get(0))
            .unwrap();
        assert!(fav);

        // Toggle back
        conn.execute(
            "UPDATE galleries SET favorited = NOT favorited WHERE id = 1",
            [],
        ).unwrap();

        let fav: bool = conn
            .query_row("SELECT favorited FROM galleries WHERE id = 1", [], |row| row.get(0))
            .unwrap();
        assert!(!fav);
    }

    #[test]
    fn test_update_reading_progress() {
        let (_tmp, conn) = setup_db();

        conn.execute(
            "UPDATE galleries SET last_read_page = 5, last_read_at = CURRENT_TIMESTAMP WHERE id = 1",
            [],
        ).unwrap();

        let page: i64 = conn
            .query_row("SELECT last_read_page FROM galleries WHERE id = 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(page, 5);

        let read_at: Option<String> = conn
            .query_row("SELECT last_read_at FROM galleries WHERE id = 1", [], |row| row.get(0))
            .unwrap();
        assert!(read_at.is_some());
    }

    #[test]
    fn test_search_galleries() {
        let (_tmp, conn) = setup_db();

        let mut stmt = conn
            .prepare(
                "SELECT g.id, g.name FROM galleries g \
                 JOIN artists a ON a.id = g.artist_id \
                 WHERE g.is_deleted = FALSE AND (g.name LIKE ?1 OR a.name LIKE ?1) \
                 ORDER BY g.name COLLATE NOCASE",
            )
            .unwrap();

        let results: Vec<(i64, String)> = stmt
            .query_map(["%Gallery1%"], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(results.len(), 1);
        assert_eq!(results[0].1, "Gallery1");

        // Search by artist name
        let results: Vec<(i64, String)> = stmt
            .query_map(["%Artist1%"], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(results.len(), 2);
    }
}
