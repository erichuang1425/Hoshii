use rusqlite::{params, Connection};

use crate::models::{Artist, Gallery, MediaEntry, MediaType, MediaGroup};
use crate::services::scanner::{ArtistScanData, GalleryScanData, MediaFileScanData, UnorganizedFileScanData};

/// Insert or update an artist in the database. Returns the artist ID.
pub fn upsert_artist(conn: &Connection, root_id: i64, artist: &ArtistScanData) -> Result<i64, String> {
    let path_str = artist.path.to_string_lossy().to_string();

    // Try to find existing artist by path
    let existing: Option<i64> = conn
        .query_row(
            "SELECT id FROM artists WHERE path = ?1",
            params![path_str],
            |row| row.get(0),
        )
        .ok();

    if let Some(id) = existing {
        conn.execute(
            "UPDATE artists SET name = ?1, gallery_count = ?2 WHERE id = ?3",
            params![artist.name, artist.galleries.len() as i64, id],
        )
        .map_err(|e| format!("Failed to update artist: {}", e))?;
        Ok(id)
    } else {
        conn.execute(
            "INSERT INTO artists (root_id, name, path, gallery_count) VALUES (?1, ?2, ?3, ?4)",
            params![root_id, artist.name, path_str, artist.galleries.len() as i64],
        )
        .map_err(|e| format!("Failed to insert artist: {}", e))?;
        Ok(conn.last_insert_rowid())
    }
}

/// Insert or update a gallery in the database. Returns the gallery ID.
pub fn upsert_gallery(conn: &Connection, artist_id: i64, gallery: &GalleryScanData) -> Result<i64, String> {
    let path_str = gallery.path.to_string_lossy().to_string();

    let existing: Option<i64> = conn
        .query_row(
            "SELECT id FROM galleries WHERE path = ?1",
            params![path_str],
            |row| row.get(0),
        )
        .ok();

    if let Some(id) = existing {
        conn.execute(
            "UPDATE galleries SET name = ?1, page_count = ?2, total_size = ?3, \
             cover_path = ?4, has_backup_zip = ?5 WHERE id = ?6",
            params![
                gallery.name,
                gallery.media_files.len() as i64,
                gallery.total_size as i64,
                gallery.cover_path,
                gallery.has_backup_zip,
                id,
            ],
        )
        .map_err(|e| format!("Failed to update gallery: {}", e))?;
        Ok(id)
    } else {
        conn.execute(
            "INSERT INTO galleries (artist_id, name, path, page_count, total_size, cover_path, has_backup_zip) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7)",
            params![
                artist_id,
                gallery.name,
                path_str,
                gallery.media_files.len() as i64,
                gallery.total_size as i64,
                gallery.cover_path,
                gallery.has_backup_zip,
            ],
        )
        .map_err(|e| format!("Failed to insert gallery: {}", e))?;
        Ok(conn.last_insert_rowid())
    }
}

/// Batch insert media files for a gallery.
/// Deletes existing media entries for the gallery first, then inserts fresh.
pub fn replace_gallery_media(
    conn: &Connection,
    gallery_id: i64,
    media_files: &[MediaFileScanData],
) -> Result<(), String> {
    // Remove existing media for this gallery
    conn.execute(
        "DELETE FROM gallery_media WHERE gallery_id = ?1",
        params![gallery_id],
    )
    .map_err(|e| format!("Failed to delete old media: {}", e))?;

    let mut stmt = conn
        .prepare(
            "INSERT INTO gallery_media \
             (gallery_id, filename, path, relative_path, sort_order, group_name, media_type, file_size, mtime) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6, ?7, ?8, ?9)",
        )
        .map_err(|e| format!("Failed to prepare insert statement: {}", e))?;

    for media in media_files {
        stmt.execute(params![
            gallery_id,
            media.filename,
            media.path.to_string_lossy().to_string(),
            media.relative_path,
            media.sort_order,
            media.group_name,
            media.media_type.as_str(),
            media.file_size as i64,
            media.mtime,
        ])
        .map_err(|e| format!("Failed to insert media: {}", e))?;
    }

    Ok(())
}

/// Insert unorganized files for an artist (replaces existing).
pub fn replace_unorganized_files(
    conn: &Connection,
    artist_id: i64,
    files: &[UnorganizedFileScanData],
) -> Result<(), String> {
    conn.execute(
        "DELETE FROM unorganized_files WHERE artist_id = ?1",
        params![artist_id],
    )
    .map_err(|e| format!("Failed to delete old unorganized files: {}", e))?;

    let mut stmt = conn
        .prepare(
            "INSERT INTO unorganized_files (artist_id, filename, path, media_type, file_size, mtime) \
             VALUES (?1, ?2, ?3, ?4, ?5, ?6)",
        )
        .map_err(|e| format!("Failed to prepare statement: {}", e))?;

    for file in files {
        stmt.execute(params![
            artist_id,
            file.filename,
            file.path.to_string_lossy().to_string(),
            file.media_type.as_ref().map(|t| t.as_str()),
            file.file_size as i64,
            file.mtime,
        ])
        .map_err(|e| format!("Failed to insert unorganized file: {}", e))?;
    }

    Ok(())
}

/// Soft-delete galleries that no longer exist on disk for a given artist.
pub fn soft_delete_missing_galleries(
    conn: &Connection,
    artist_id: i64,
    existing_paths: &[String],
) -> Result<i64, String> {
    if existing_paths.is_empty() {
        // Mark all galleries for this artist as deleted
        let count = conn
            .execute(
                "UPDATE galleries SET is_deleted = TRUE WHERE artist_id = ?1 AND is_deleted = FALSE",
                params![artist_id],
            )
            .map_err(|e| format!("Failed to soft-delete galleries: {}", e))?;
        return Ok(count as i64);
    }

    // Build a query to soft-delete galleries whose paths are NOT in the list
    let placeholders: Vec<String> = (0..existing_paths.len())
        .map(|i| format!("?{}", i + 2))
        .collect();
    let sql = format!(
        "UPDATE galleries SET is_deleted = TRUE WHERE artist_id = ?1 AND is_deleted = FALSE AND path NOT IN ({})",
        placeholders.join(", ")
    );

    let mut params_vec: Vec<Box<dyn rusqlite::types::ToSql>> = Vec::new();
    params_vec.push(Box::new(artist_id));
    for path in existing_paths {
        params_vec.push(Box::new(path.clone()));
    }

    let params_refs: Vec<&dyn rusqlite::types::ToSql> = params_vec.iter().map(|p| p.as_ref()).collect();

    let count = conn
        .execute(&sql, params_refs.as_slice())
        .map_err(|e| format!("Failed to soft-delete galleries: {}", e))?;

    Ok(count as i64)
}

/// Get all media entries for a gallery, ordered by sort_order.
pub fn get_gallery_media(conn: &Connection, gallery_id: i64) -> Result<Vec<MediaEntry>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT id, gallery_id, filename, path, relative_path, sort_order, group_name, \
             media_type, width, height, file_size, duration_ms, is_animated, mtime \
             FROM gallery_media WHERE gallery_id = ?1 ORDER BY sort_order",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let entries = stmt
        .query_map(params![gallery_id], |row| {
            let media_type_str: String = row.get(7)?;
            Ok(MediaEntry {
                id: row.get(0)?,
                gallery_id: row.get(1)?,
                filename: row.get(2)?,
                path: row.get(3)?,
                relative_path: row.get(4)?,
                sort_order: row.get(5)?,
                group_name: row.get(6)?,
                media_type: MediaType::from_str_value(&media_type_str),
                width: row.get(8)?,
                height: row.get(9)?,
                file_size: row.get(10)?,
                duration_ms: row.get(11)?,
                is_animated: row.get(12)?,
                mtime: row.get(13)?,
            })
        })
        .map_err(|e| format!("Failed to query media: {}", e))?;

    entries.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to read media row: {}", e))
}

/// Get media groups for a gallery based on stored group names.
pub fn get_media_groups(conn: &Connection, gallery_id: i64) -> Result<Vec<MediaGroup>, String> {
    let media = get_gallery_media(conn, gallery_id)?;

    if media.is_empty() {
        return Ok(Vec::new());
    }

    let mut groups: Vec<MediaGroup> = Vec::new();
    for (i, entry) in media.iter().enumerate() {
        if let Some(last) = groups.last_mut() {
            if last.name == entry.group_name {
                last.count += 1;
                continue;
            }
        }
        groups.push(MediaGroup {
            name: entry.group_name.clone(),
            start_index: i,
            count: 1,
        });
    }

    Ok(groups)
}

/// Get all artists for a root folder, including the cover path from their first gallery.
pub fn get_artists(conn: &Connection, root_id: i64) -> Result<Vec<Artist>, String> {
    let mut stmt = conn
        .prepare(
            "SELECT a.id, a.root_id, a.name, a.path, a.gallery_count, \
             (SELECT g.cover_path FROM galleries g WHERE g.artist_id = a.id \
              AND g.is_deleted = FALSE AND g.cover_path IS NOT NULL \
              ORDER BY g.name COLLATE NOCASE LIMIT 1) AS cover_path \
             FROM artists a WHERE a.root_id = ?1 ORDER BY a.name COLLATE NOCASE",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let entries = stmt
        .query_map(params![root_id], |row| {
            Ok(Artist {
                id: row.get(0)?,
                root_id: row.get(1)?,
                name: row.get(2)?,
                path: row.get(3)?,
                gallery_count: row.get(4)?,
                cover_path: row.get(5)?,
            })
        })
        .map_err(|e| format!("Failed to query artists: {}", e))?;

    entries.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to read artist row: {}", e))
}

/// Get all galleries for an artist (excluding soft-deleted).
pub fn get_galleries(conn: &Connection, artist_id: i64, sort: Option<&str>) -> Result<Vec<Gallery>, String> {
    let order_clause = match sort {
        Some("name_desc") => "name COLLATE NOCASE DESC",
        Some("date_desc") => "last_read_at DESC NULLS LAST, name COLLATE NOCASE",
        Some("date_asc") => "last_read_at ASC NULLS LAST, name COLLATE NOCASE",
        Some("size_asc") => "total_size ASC, name COLLATE NOCASE",
        Some("size_desc") => "total_size DESC, name COLLATE NOCASE",
        Some("pages_desc") => "page_count DESC, name COLLATE NOCASE",
        Some("last_read") => "last_read_at DESC NULLS LAST, name COLLATE NOCASE",
        _ => "name COLLATE NOCASE ASC",
    };
    let sql = format!(
        "SELECT id, artist_id, name, path, page_count, total_size, cover_path, \
         has_backup_zip, zip_status, last_read_page, last_read_at, favorited \
         FROM galleries WHERE artist_id = ?1 AND is_deleted = FALSE ORDER BY {}",
        order_clause
    );
    let mut stmt = conn
        .prepare(&sql)
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let entries = stmt
        .query_map(params![artist_id], |row| {
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
        .map_err(|e| format!("Failed to query galleries: {}", e))?;

    entries.collect::<Result<Vec<_>, _>>().map_err(|e| format!("Failed to read gallery row: {}", e))
}

/// Get the known mtime map for a gallery's media (for incremental scan).
pub fn get_gallery_mtime_map(conn: &Connection, gallery_id: i64) -> Result<std::collections::HashMap<String, i64>, String> {
    let mut stmt = conn
        .prepare("SELECT path, mtime FROM gallery_media WHERE gallery_id = ?1")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let mut map = std::collections::HashMap::new();
    let rows = stmt
        .query_map(params![gallery_id], |row| {
            let path: String = row.get(0)?;
            let mtime: i64 = row.get(1)?;
            Ok((path, mtime))
        })
        .map_err(|e| format!("Failed to query mtime map: {}", e))?;

    for row in rows {
        let (path, mtime) = row.map_err(|e| format!("Failed to read row: {}", e))?;
        map.insert(path, mtime);
    }

    Ok(map)
}

/// Update the last_scan timestamp and increment scan_version for a root folder.
pub fn update_root_scan_info(conn: &Connection, root_id: i64) -> Result<(), String> {
    conn.execute(
        "UPDATE root_folders SET last_scan = datetime('now'), scan_version = scan_version + 1 WHERE id = ?1",
        params![root_id],
    )
    .map_err(|e| format!("Failed to update root scan info: {}", e))?;
    Ok(())
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use std::path::PathBuf;
    use tempfile::TempDir;

    fn setup_db() -> (TempDir, Connection) {
        let tmp = TempDir::new().unwrap();
        let conn = db::init_db(tmp.path()).unwrap();
        // Insert a volume and root folder for testing
        conn.execute(
            "INSERT INTO volumes (uuid, label, mount_path, is_online) VALUES ('test-uuid', 'TestDrive', '/mnt/test', TRUE)",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO root_folders (volume_id, path, relative_path, label) VALUES (1, '/mnt/test/root', 'root', 'TestRoot')",
            [],
        ).unwrap();
        (tmp, conn)
    }

    #[test]
    fn test_upsert_artist_insert() {
        let (_tmp, conn) = setup_db();
        let artist = ArtistScanData {
            name: "ArtistA".to_string(),
            path: PathBuf::from("/mnt/test/root/ArtistA"),
            galleries: vec![],
            unorganized_files: vec![],
        };
        let id = upsert_artist(&conn, 1, &artist).unwrap();
        assert_eq!(id, 1);

        // Verify in DB
        let name: String = conn.query_row("SELECT name FROM artists WHERE id = 1", [], |r| r.get(0)).unwrap();
        assert_eq!(name, "ArtistA");
    }

    #[test]
    fn test_upsert_artist_update() {
        let (_tmp, conn) = setup_db();
        let artist = ArtistScanData {
            name: "ArtistA".to_string(),
            path: PathBuf::from("/mnt/test/root/ArtistA"),
            galleries: vec![],
            unorganized_files: vec![],
        };
        let id1 = upsert_artist(&conn, 1, &artist).unwrap();

        // Update with different name (same path)
        let artist2 = ArtistScanData {
            name: "ArtistA_Updated".to_string(),
            path: PathBuf::from("/mnt/test/root/ArtistA"),
            galleries: vec![],
            unorganized_files: vec![],
        };
        let id2 = upsert_artist(&conn, 1, &artist2).unwrap();
        assert_eq!(id1, id2);

        let name: String = conn.query_row("SELECT name FROM artists WHERE id = ?1", [id2], |r| r.get(0)).unwrap();
        assert_eq!(name, "ArtistA_Updated");
    }

    #[test]
    fn test_upsert_gallery_and_media() {
        let (_tmp, conn) = setup_db();

        // Insert artist first
        conn.execute(
            "INSERT INTO artists (root_id, name, path, gallery_count) VALUES (1, 'ArtistA', '/mnt/test/root/ArtistA', 1)",
            [],
        ).unwrap();

        let gallery = GalleryScanData {
            name: "Gallery1".to_string(),
            path: PathBuf::from("/mnt/test/root/ArtistA/Gallery1"),
            media_files: vec![
                MediaFileScanData {
                    filename: "1.jpg".to_string(),
                    path: PathBuf::from("/mnt/test/root/ArtistA/Gallery1/1.jpg"),
                    relative_path: "1.jpg".to_string(),
                    sort_order: 0,
                    group_name: "".to_string(),
                    media_type: MediaType::Image,
                    file_size: 1024,
                    mtime: 1000,
                },
                MediaFileScanData {
                    filename: "2.gif".to_string(),
                    path: PathBuf::from("/mnt/test/root/ArtistA/Gallery1/2.gif"),
                    relative_path: "2.gif".to_string(),
                    sort_order: 1,
                    group_name: "".to_string(),
                    media_type: MediaType::AnimatedImage,
                    file_size: 2048,
                    mtime: 1001,
                },
            ],
            total_size: 3072,
            cover_path: Some("/mnt/test/root/ArtistA/Gallery1/1.jpg".to_string()),
            has_backup_zip: false,
        };

        let gallery_id = upsert_gallery(&conn, 1, &gallery).unwrap();
        assert_eq!(gallery_id, 1);

        replace_gallery_media(&conn, gallery_id, &gallery.media_files).unwrap();

        // Query media back
        let media = get_gallery_media(&conn, gallery_id).unwrap();
        assert_eq!(media.len(), 2);
        assert_eq!(media[0].filename, "1.jpg");
        assert_eq!(media[0].media_type, MediaType::Image);
        assert_eq!(media[1].filename, "2.gif");
        assert_eq!(media[1].media_type, MediaType::AnimatedImage);
    }

    #[test]
    fn test_get_media_groups() {
        let (_tmp, conn) = setup_db();

        conn.execute(
            "INSERT INTO artists (root_id, name, path) VALUES (1, 'A', '/a')",
            [],
        ).unwrap();
        conn.execute(
            "INSERT INTO galleries (artist_id, name, path) VALUES (1, 'G', '/a/g')",
            [],
        ).unwrap();

        // Insert media with groups
        let media = vec![
            MediaFileScanData {
                filename: "eva1.jpg".to_string(),
                path: PathBuf::from("/a/g/eva1.jpg"),
                relative_path: "eva1.jpg".to_string(),
                sort_order: 0,
                group_name: "eva".to_string(),
                media_type: MediaType::Image,
                file_size: 100,
                mtime: 1000,
            },
            MediaFileScanData {
                filename: "eva2.jpg".to_string(),
                path: PathBuf::from("/a/g/eva2.jpg"),
                relative_path: "eva2.jpg".to_string(),
                sort_order: 1,
                group_name: "eva".to_string(),
                media_type: MediaType::Image,
                file_size: 100,
                mtime: 1000,
            },
            MediaFileScanData {
                filename: "lucy1.jpg".to_string(),
                path: PathBuf::from("/a/g/lucy1.jpg"),
                relative_path: "lucy1.jpg".to_string(),
                sort_order: 2,
                group_name: "lucy".to_string(),
                media_type: MediaType::Image,
                file_size: 100,
                mtime: 1000,
            },
        ];

        replace_gallery_media(&conn, 1, &media).unwrap();

        let groups = get_media_groups(&conn, 1).unwrap();
        assert_eq!(groups.len(), 2);
        assert_eq!(groups[0].name, "eva");
        assert_eq!(groups[0].count, 2);
        assert_eq!(groups[1].name, "lucy");
        assert_eq!(groups[1].count, 1);
    }

    #[test]
    fn test_get_gallery_mtime_map() {
        let (_tmp, conn) = setup_db();

        conn.execute("INSERT INTO artists (root_id, name, path) VALUES (1, 'A', '/a')", []).unwrap();
        conn.execute("INSERT INTO galleries (artist_id, name, path) VALUES (1, 'G', '/a/g')", []).unwrap();

        let media = vec![
            MediaFileScanData {
                filename: "1.jpg".to_string(),
                path: PathBuf::from("/a/g/1.jpg"),
                relative_path: "1.jpg".to_string(),
                sort_order: 0,
                group_name: "".to_string(),
                media_type: MediaType::Image,
                file_size: 100,
                mtime: 12345,
            },
        ];
        replace_gallery_media(&conn, 1, &media).unwrap();

        let map = get_gallery_mtime_map(&conn, 1).unwrap();
        assert_eq!(map.len(), 1);
        assert_eq!(map.get("/a/g/1.jpg"), Some(&12345));
    }
}
