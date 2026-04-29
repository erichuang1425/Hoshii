use std::collections::HashMap;
use std::path::PathBuf;

use rusqlite::params;
use serde::{Deserialize, Serialize};
use tauri::State;

use crate::db::AppDatabase;

/// Sidecar metadata format written alongside gallery directories.
#[derive(Debug, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
struct GalleryMeta {
    gallery_name: String,
    tags: Vec<String>,
    favorited: bool,
    last_read_page: i64,
}

const SIDECAR_FILENAME: &str = ".hoshii-meta.json";

/// Export metadata for a gallery to a `.hoshii-meta.json` sidecar file
/// next to the gallery directory.
#[tauri::command]
pub async fn export_metadata(
    db: State<'_, AppDatabase>,
    gallery_id: i64,
) -> Result<String, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Fetch gallery info
    let (name, path, favorited, last_read_page): (String, String, bool, i64) = conn
        .query_row(
            "SELECT name, path, favorited, last_read_page FROM galleries WHERE id = ?1 AND is_deleted = FALSE",
            params![gallery_id],
            |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
        )
        .map_err(|e| format!("Gallery not found: {}", e))?;

    // Fetch tags
    let mut stmt = conn
        .prepare(
            "SELECT t.name FROM tags t \
             JOIN gallery_tags gt ON gt.tag_id = t.id \
             WHERE gt.gallery_id = ?1 ORDER BY t.name",
        )
        .map_err(|e| format!("Failed to prepare tag query: {}", e))?;

    let tags: Vec<String> = stmt
        .query_map(params![gallery_id], |row| row.get(0))
        .map_err(|e| format!("Failed to query tags: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read tag: {}", e))?;

    let meta = GalleryMeta {
        gallery_name: name,
        tags,
        favorited,
        last_read_page,
    };

    let gallery_dir = PathBuf::from(&path);
    let sidecar_path = gallery_dir.join(SIDECAR_FILENAME);

    let json = serde_json::to_string_pretty(&meta)
        .map_err(|e| format!("Failed to serialize metadata: {}", e))?;

    std::fs::write(&sidecar_path, &json)
        .map_err(|e| format!("Failed to write sidecar file: {}", e))?;

    log::info!("Exported metadata for gallery {} to {}", gallery_id, sidecar_path.display());

    Ok(sidecar_path.display().to_string())
}

/// Import metadata from a `.hoshii-meta.json` sidecar file for a gallery.
/// Updates tags, favorited status, and reading progress.
#[tauri::command]
pub async fn import_metadata(
    db: State<'_, AppDatabase>,
    gallery_id: i64,
) -> Result<(), String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Get gallery path
    let path: String = conn
        .query_row(
            "SELECT path FROM galleries WHERE id = ?1 AND is_deleted = FALSE",
            params![gallery_id],
            |row| row.get(0),
        )
        .map_err(|e| format!("Gallery not found: {}", e))?;

    let sidecar_path = PathBuf::from(&path).join(SIDECAR_FILENAME);

    let content = std::fs::read_to_string(&sidecar_path)
        .map_err(|e| format!("Failed to read sidecar file: {}", e))?;

    let meta: GalleryMeta = serde_json::from_str(&content)
        .map_err(|e| format!("Failed to parse sidecar metadata: {}", e))?;

    // Update favorited and reading progress
    conn.execute(
        "UPDATE galleries SET favorited = ?1, last_read_page = ?2 WHERE id = ?3",
        params![meta.favorited, meta.last_read_page, gallery_id],
    )
    .map_err(|e| format!("Failed to update gallery: {}", e))?;

    // Sync tags: get existing tags, add missing ones, remove extras
    let mut existing_stmt = conn
        .prepare(
            "SELECT t.id, t.name FROM tags t \
             JOIN gallery_tags gt ON gt.tag_id = t.id \
             WHERE gt.gallery_id = ?1",
        )
        .map_err(|e| format!("Failed to prepare tag query: {}", e))?;

    let existing: HashMap<String, i64> = existing_stmt
        .query_map(params![gallery_id], |row| {
            Ok((row.get::<_, String>(1)?, row.get::<_, i64>(0)?))
        })
        .map_err(|e| format!("Failed to query existing tags: {}", e))?
        .collect::<Result<HashMap<_, _>, _>>()
        .map_err(|e| format!("Failed to read tag row: {}", e))?;

    let existing_names: std::collections::HashSet<String> =
        existing.keys().map(|k| k.to_lowercase()).collect();
    let import_names: std::collections::HashSet<String> =
        meta.tags.iter().map(|t| t.to_lowercase()).collect();

    // Add missing tags
    for tag_name in &meta.tags {
        if !existing_names.contains(&tag_name.to_lowercase()) {
            conn.execute(
                "INSERT OR IGNORE INTO tags (name) VALUES (?1)",
                params![tag_name],
            )
            .map_err(|e| format!("Failed to insert tag: {}", e))?;

            let tag_id: i64 = conn
                .query_row(
                    "SELECT id FROM tags WHERE name = ?1 COLLATE NOCASE",
                    params![tag_name],
                    |row| row.get(0),
                )
                .map_err(|e| format!("Failed to find tag: {}", e))?;

            conn.execute(
                "INSERT OR IGNORE INTO gallery_tags (gallery_id, tag_id) VALUES (?1, ?2)",
                params![gallery_id, tag_id],
            )
            .map_err(|e| format!("Failed to link tag: {}", e))?;
        }
    }

    // Remove tags not in import
    for (name, tag_id) in &existing {
        if !import_names.contains(&name.to_lowercase()) {
            conn.execute(
                "DELETE FROM gallery_tags WHERE gallery_id = ?1 AND tag_id = ?2",
                params![gallery_id, tag_id],
            )
            .map_err(|e| format!("Failed to remove tag link: {}", e))?;

            // Clean up orphaned tags
            conn.execute(
                "DELETE FROM tags WHERE id = ?1 AND NOT EXISTS \
                 (SELECT 1 FROM gallery_tags WHERE tag_id = ?1)",
                params![tag_id],
            )
            .map_err(|e| format!("Failed to clean up orphaned tag: {}", e))?;
        }
    }

    log::info!("Imported metadata for gallery {} from {}", gallery_id, sidecar_path.display());

    Ok(())
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

        (tmp, conn)
    }

    #[test]
    fn test_export_metadata_serialization() {
        let meta = super::GalleryMeta {
            gallery_name: "Test Gallery".to_string(),
            tags: vec!["action".to_string(), "comedy".to_string()],
            favorited: true,
            last_read_page: 5,
        };

        let json = serde_json::to_string_pretty(&meta).unwrap();
        let parsed: super::GalleryMeta = serde_json::from_str(&json).unwrap();

        assert_eq!(parsed.gallery_name, "Test Gallery");
        assert_eq!(parsed.tags.len(), 2);
        assert!(parsed.favorited);
        assert_eq!(parsed.last_read_page, 5);
    }

    #[test]
    fn test_sidecar_roundtrip() {
        let (_tmp, conn) = setup_db();

        // Create a gallery in a temp directory
        let gallery_dir = _tmp.path().join("test_gallery");
        std::fs::create_dir_all(&gallery_dir).unwrap();

        let gallery_path = gallery_dir.display().to_string();
        conn.execute(
            "INSERT INTO galleries (artist_id, name, path, favorited, last_read_page) VALUES (1, 'G1', ?1, TRUE, 10)",
            [&gallery_path],
        ).unwrap();

        // Add tags
        conn.execute("INSERT INTO tags (name) VALUES ('action')", []).unwrap();
        conn.execute("INSERT INTO tags (name) VALUES ('comedy')", []).unwrap();
        conn.execute("INSERT INTO gallery_tags (gallery_id, tag_id) VALUES (1, 1)", []).unwrap();
        conn.execute("INSERT INTO gallery_tags (gallery_id, tag_id) VALUES (1, 2)", []).unwrap();

        // Export
        let (name, path, favorited, last_read_page): (String, String, bool, i64) = conn
            .query_row(
                "SELECT name, path, favorited, last_read_page FROM galleries WHERE id = 1",
                [],
                |row| Ok((row.get(0)?, row.get(1)?, row.get(2)?, row.get(3)?)),
            )
            .unwrap();

        let mut stmt = conn
            .prepare("SELECT t.name FROM tags t JOIN gallery_tags gt ON gt.tag_id = t.id WHERE gt.gallery_id = 1 ORDER BY t.name")
            .unwrap();
        let tags: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        let meta = super::GalleryMeta {
            gallery_name: name,
            tags: tags.clone(),
            favorited,
            last_read_page,
        };

        let sidecar_path = std::path::PathBuf::from(&path).join(super::SIDECAR_FILENAME);
        let json = serde_json::to_string_pretty(&meta).unwrap();
        std::fs::write(&sidecar_path, &json).unwrap();

        // Read back and verify
        let content = std::fs::read_to_string(&sidecar_path).unwrap();
        let parsed: super::GalleryMeta = serde_json::from_str(&content).unwrap();

        assert_eq!(parsed.gallery_name, "G1");
        assert_eq!(parsed.tags, vec!["action", "comedy"]);
        assert!(parsed.favorited);
        assert_eq!(parsed.last_read_page, 10);
    }
}
