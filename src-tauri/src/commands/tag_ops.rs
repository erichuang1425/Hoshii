use rusqlite::params;
use tauri::State;

use crate::db::AppDatabase;
use crate::models::{Gallery, Tag};

#[tauri::command]
pub async fn get_gallery_tags(
    db: State<'_, AppDatabase>,
    gallery_id: i64,
) -> Result<Vec<Tag>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name \
             FROM tags t \
             JOIN gallery_tags gt ON gt.tag_id = t.id \
             WHERE gt.gallery_id = ?1 \
             ORDER BY t.name",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let tags = stmt
        .query_map(params![gallery_id], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                gallery_count: None,
            })
        })
        .map_err(|e| format!("Failed to query gallery tags: {}", e))?;

    tags.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read tag row: {}", e))
}

#[tauri::command]
pub async fn add_tag(
    db: State<'_, AppDatabase>,
    gallery_id: i64,
    tag: String,
) -> Result<Tag, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let tag_name = tag.trim().to_string();
    if tag_name.is_empty() {
        return Err("Tag name cannot be empty".to_string());
    }

    // Insert tag if it doesn't exist (COLLATE NOCASE handles case-insensitive uniqueness)
    conn.execute(
        "INSERT OR IGNORE INTO tags (name) VALUES (?1)",
        params![tag_name],
    )
    .map_err(|e| format!("Failed to insert tag: {}", e))?;

    // Get the tag id
    let tag_id: i64 = conn
        .query_row(
            "SELECT id FROM tags WHERE name = ?1 COLLATE NOCASE",
            params![tag_name],
            |row| row.get(0),
        )
        .map_err(|e| format!("Failed to find tag: {}", e))?;

    // Link tag to gallery (ignore if already linked)
    conn.execute(
        "INSERT OR IGNORE INTO gallery_tags (gallery_id, tag_id) VALUES (?1, ?2)",
        params![gallery_id, tag_id],
    )
    .map_err(|e| format!("Failed to link tag to gallery: {}", e))?;

    Ok(Tag {
        id: tag_id,
        name: tag_name,
        gallery_count: None,
    })
}

#[tauri::command]
pub async fn remove_tag(
    db: State<'_, AppDatabase>,
    gallery_id: i64,
    tag_id: i64,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    conn.execute(
        "DELETE FROM gallery_tags WHERE gallery_id = ?1 AND tag_id = ?2",
        params![gallery_id, tag_id],
    )
    .map_err(|e| format!("Failed to remove tag: {}", e))?;

    // Clean up orphaned tags (no galleries reference them)
    conn.execute(
        "DELETE FROM tags WHERE id = ?1 AND NOT EXISTS \
         (SELECT 1 FROM gallery_tags WHERE tag_id = ?1)",
        params![tag_id],
    )
    .map_err(|e| format!("Failed to clean up orphaned tag: {}", e))?;

    Ok(())
}

#[tauri::command]
pub async fn search_by_tags(
    db: State<'_, AppDatabase>,
    tags: Vec<String>,
) -> Result<Vec<Gallery>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    if tags.is_empty() {
        return Ok(vec![]);
    }

    // Build parameterized IN clause
    let placeholders: Vec<String> = tags.iter().enumerate().map(|(i, _)| format!("?{}", i + 1)).collect();
    let in_clause = placeholders.join(", ");
    let tag_count = tags.len();

    let sql = format!(
        "SELECT g.id, g.artist_id, g.name, g.path, g.page_count, g.total_size, \
         g.cover_path, g.has_backup_zip, g.zip_status, g.last_read_page, \
         g.last_read_at, g.favorited \
         FROM galleries g \
         JOIN gallery_tags gt ON gt.gallery_id = g.id \
         JOIN tags t ON t.id = gt.tag_id \
         WHERE g.is_deleted = FALSE AND t.name IN ({}) \
         GROUP BY g.id \
         HAVING COUNT(DISTINCT t.id) = ?{} \
         ORDER BY g.name COLLATE NOCASE",
        in_clause,
        tag_count + 1
    );

    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Failed to prepare tag search query: {}", e))?;

    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = tags
        .iter()
        .map(|t| Box::new(t.clone()) as Box<dyn rusqlite::types::ToSql>)
        .collect();
    params_vec.push(Box::new(tag_count as i64));

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
        .map_err(|e| format!("Failed to search by tags: {}", e))?;

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
            "INSERT INTO artists (root_id, name, path) VALUES (1, 'A', '/v/r/a')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO galleries (artist_id, name, path) VALUES (1, 'G1', '/v/r/a/g1')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO galleries (artist_id, name, path) VALUES (1, 'G2', '/v/r/a/g2')",
            [],
        ).unwrap();
        conn.execute("INSERT INTO tags (name) VALUES ('action')", []).unwrap();
        conn.execute("INSERT INTO tags (name) VALUES ('comedy')", []).unwrap();

        (tmp, conn)
    }

    #[test]
    fn test_add_and_get_gallery_tags() {
        let (_tmp, conn) = setup_db();

        // Link tag to gallery
        conn.execute("INSERT INTO gallery_tags (gallery_id, tag_id) VALUES (1, 1)", []).unwrap();
        conn.execute("INSERT INTO gallery_tags (gallery_id, tag_id) VALUES (1, 2)", []).unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT t.id, t.name FROM tags t \
                 JOIN gallery_tags gt ON gt.tag_id = t.id \
                 WHERE gt.gallery_id = 1 ORDER BY t.name",
            )
            .unwrap();

        let tags: Vec<(i64, String)> = stmt
            .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(tags.len(), 2);
        assert_eq!(tags[0].1, "action");
        assert_eq!(tags[1].1, "comedy");
    }

    #[test]
    fn test_remove_tag_cleans_up_orphans() {
        let (_tmp, conn) = setup_db();

        conn.execute("INSERT INTO gallery_tags (gallery_id, tag_id) VALUES (1, 1)", []).unwrap();

        // Remove the link
        conn.execute("DELETE FROM gallery_tags WHERE gallery_id = 1 AND tag_id = 1", []).unwrap();

        // Clean up orphaned tags
        conn.execute(
            "DELETE FROM tags WHERE id = 1 AND NOT EXISTS (SELECT 1 FROM gallery_tags WHERE tag_id = 1)",
            [],
        ).unwrap();

        let count: i64 = conn
            .query_row("SELECT COUNT(*) FROM tags WHERE id = 1", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_search_by_tags() {
        let (_tmp, conn) = setup_db();

        // Tag G1 with both, G2 with just action
        conn.execute("INSERT INTO gallery_tags (gallery_id, tag_id) VALUES (1, 1)", []).unwrap();
        conn.execute("INSERT INTO gallery_tags (gallery_id, tag_id) VALUES (1, 2)", []).unwrap();
        conn.execute("INSERT INTO gallery_tags (gallery_id, tag_id) VALUES (2, 1)", []).unwrap();

        // Search for galleries with both tags
        let mut stmt = conn
            .prepare(
                "SELECT g.id FROM galleries g \
                 JOIN gallery_tags gt ON gt.gallery_id = g.id \
                 JOIN tags t ON t.id = gt.tag_id \
                 WHERE g.is_deleted = FALSE AND t.name IN ('action', 'comedy') \
                 GROUP BY g.id \
                 HAVING COUNT(DISTINCT t.id) = 2",
            )
            .unwrap();

        let ids: Vec<i64> = stmt
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(ids.len(), 1);
        assert_eq!(ids[0], 1);
    }
}
