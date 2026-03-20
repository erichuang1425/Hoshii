use rusqlite::params;
use tauri::State;

use crate::db::AppDatabase;
use crate::models::Gallery;

#[tauri::command]
pub async fn get_favorite_galleries(db: State<'_, AppDatabase>) -> Result<Vec<Gallery>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, artist_id, name, path, page_count, total_size, cover_path, \
             has_backup_zip, zip_status, last_read_page, last_read_at, favorited \
             FROM galleries \
             WHERE favorited = 1 AND is_deleted = FALSE \
             ORDER BY last_read_at DESC",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let galleries = stmt
        .query_map([], |row| {
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
        .map_err(|e| format!("Failed to query favorites: {}", e))?;

    galleries
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read gallery row: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use tempfile::TempDir;

    fn setup_db_with_galleries() -> (TempDir, rusqlite::Connection) {
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
            "INSERT INTO artists (root_id, name, path) VALUES (1, 'A', '/v/r/a')",
            [],
        ).unwrap();

        // Insert two galleries: one favorited, one not
        conn.execute(
            "INSERT INTO galleries (artist_id, name, path, favorited, last_read_at) VALUES (1, 'Fav1', '/v/r/a/f1', TRUE, '2024-01-01')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO galleries (artist_id, name, path, favorited) VALUES (1, 'NotFav', '/v/r/a/nf', FALSE)",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO galleries (artist_id, name, path, favorited, last_read_at) VALUES (1, 'Fav2', '/v/r/a/f2', TRUE, '2024-06-01')",
            [],
        ).unwrap();

        (tmp, conn)
    }

    #[test]
    fn test_get_favorite_galleries_returns_only_favorited() {
        let (_tmp, conn) = setup_db_with_galleries();

        let mut stmt = conn
            .prepare(
                "SELECT id, artist_id, name, path, page_count, total_size, cover_path, \
                 has_backup_zip, zip_status, last_read_page, last_read_at, favorited \
                 FROM galleries \
                 WHERE favorited = 1 AND is_deleted = FALSE \
                 ORDER BY last_read_at DESC",
            )
            .unwrap();

        let galleries: Vec<Gallery> = stmt
            .query_map([], |row| {
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
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(galleries.len(), 2);
        // Ordered by last_read_at DESC: Fav2 (2024-06-01) before Fav1 (2024-01-01)
        assert_eq!(galleries[0].name, "Fav2");
        assert_eq!(galleries[1].name, "Fav1");
        assert!(galleries.iter().all(|g| g.favorited));
    }

    #[test]
    fn test_get_favorite_galleries_excludes_deleted() {
        let (_tmp, conn) = setup_db_with_galleries();

        // Soft-delete Fav1
        conn.execute("UPDATE galleries SET is_deleted = TRUE WHERE name = 'Fav1'", []).unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT id FROM galleries WHERE favorited = 1 AND is_deleted = FALSE",
            )
            .unwrap();

        let count = stmt.query_map([], |row| row.get::<_, i64>(0)).unwrap().count();
        assert_eq!(count, 1);
    }
}
