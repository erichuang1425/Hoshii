use rusqlite::params;
use tauri::State;

use crate::db::AppDatabase;
use crate::models::{Gallery, MediaType, UnorganizedFile};

#[tauri::command]
pub async fn get_unorganized_files(
    db: State<'_, AppDatabase>,
    artist_id: i64,
) -> Result<Vec<UnorganizedFile>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT id, artist_id, filename, path, media_type, file_size \
             FROM unorganized_files \
             WHERE artist_id = ?1 \
             ORDER BY filename COLLATE NOCASE",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let files = stmt
        .query_map(params![artist_id], |row| {
            let media_type_str: Option<String> = row.get(4)?;
            Ok(UnorganizedFile {
                id: row.get(0)?,
                artist_id: row.get(1)?,
                filename: row.get(2)?,
                path: row.get(3)?,
                media_type: media_type_str.map(|s| MediaType::from_str_value(&s)),
                file_size: row.get(5)?,
            })
        })
        .map_err(|e| format!("Failed to query unorganized files: {}", e))?;

    files
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read file row: {}", e))
}

#[tauri::command]
pub async fn move_files_to_gallery(
    files: Vec<String>,
    gallery_path: String,
) -> Result<(), String> {
    let dest = std::path::Path::new(&gallery_path);
    if !dest.is_dir() {
        return Err(format!("Gallery path does not exist: {}", gallery_path));
    }

    for file_path in &files {
        let source = std::path::Path::new(file_path);
        if !source.exists() {
            return Err(format!("Source file does not exist: {}", file_path));
        }

        let filename = source
            .file_name()
            .ok_or_else(|| format!("Invalid filename: {}", file_path))?;

        let target = dest.join(filename);
        if target.exists() {
            return Err(format!(
                "Target already exists: {}",
                target.display()
            ));
        }

        std::fs::rename(source, &target).map_err(|e| {
            format!("Failed to move {} to {}: {}", file_path, target.display(), e)
        })?;
    }

    Ok(())
}

#[tauri::command]
pub async fn create_gallery_folder(
    db: State<'_, AppDatabase>,
    artist_path: String,
    name: String,
) -> Result<Gallery, String> {
    let parent = std::path::Path::new(&artist_path);
    if !parent.is_dir() {
        return Err(format!("Artist path does not exist: {}", artist_path));
    }

    let gallery_dir = parent.join(&name);
    if gallery_dir.exists() {
        return Err(format!("Gallery folder already exists: {}", gallery_dir.display()));
    }

    std::fs::create_dir(&gallery_dir).map_err(|e| {
        format!("Failed to create gallery folder: {}", e)
    })?;

    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    // Find artist_id from path
    let artist_id: i64 = conn
        .query_row(
            "SELECT id FROM artists WHERE path = ?1",
            params![artist_path],
            |row| row.get(0),
        )
        .map_err(|e| format!("Artist not found for path: {}", e))?;

    let gallery_path = gallery_dir.to_string_lossy().to_string();

    conn.execute(
        "INSERT INTO galleries (artist_id, name, path) VALUES (?1, ?2, ?3)",
        params![artist_id, name, gallery_path],
    )
    .map_err(|e| format!("Failed to insert gallery: {}", e))?;

    let id = conn.last_insert_rowid();

    // Update artist gallery count
    conn.execute(
        "UPDATE artists SET gallery_count = \
         (SELECT COUNT(*) FROM galleries WHERE artist_id = ?1 AND is_deleted = FALSE) \
         WHERE id = ?1",
        params![artist_id],
    )
    .map_err(|e| format!("Failed to update gallery count: {}", e))?;

    Ok(Gallery {
        id,
        artist_id,
        name,
        path: gallery_path,
        page_count: 0,
        total_size: 0,
        cover_path: None,
        has_backup_zip: false,
        zip_status: crate::models::ZipStatus::Unknown,
        last_read_page: 0,
        last_read_at: None,
        favorited: false,
    })
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

        (tmp, conn)
    }

    #[test]
    fn test_get_unorganized_files_empty() {
        let (_tmp, conn) = setup_db();

        let mut stmt = conn
            .prepare("SELECT id FROM unorganized_files WHERE artist_id = 1")
            .unwrap();
        let count = stmt.query_map([], |row| row.get::<_, i64>(0)).unwrap().count();
        assert_eq!(count, 0);
    }

    #[test]
    fn test_get_unorganized_files_with_data() {
        let (_tmp, conn) = setup_db();

        conn.execute(
            "INSERT INTO unorganized_files (artist_id, filename, path, media_type, file_size) \
             VALUES (1, 'loose.jpg', '/v/r/a/loose.jpg', 'image', 1024)",
            [],
        ).unwrap();

        let mut stmt = conn
            .prepare("SELECT filename FROM unorganized_files WHERE artist_id = 1")
            .unwrap();
        let files: Vec<String> = stmt
            .query_map([], |row| row.get(0))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(files.len(), 1);
        assert_eq!(files[0], "loose.jpg");
    }

    #[test]
    fn test_move_files_between_dirs() {
        let tmp = TempDir::new().unwrap();
        let src_dir = tmp.path().join("source");
        let dst_dir = tmp.path().join("dest");
        std::fs::create_dir_all(&src_dir).unwrap();
        std::fs::create_dir_all(&dst_dir).unwrap();

        let file_path = src_dir.join("test.jpg");
        std::fs::write(&file_path, b"test").unwrap();

        let target = dst_dir.join("test.jpg");
        std::fs::rename(&file_path, &target).unwrap();

        assert!(!file_path.exists());
        assert!(target.exists());
    }
}
