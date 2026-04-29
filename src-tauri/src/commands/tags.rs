use tauri::State;

use crate::db::AppDatabase;

#[derive(Debug, Clone, serde::Serialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: i64,
    pub name: String,
    pub gallery_count: i64,
}

#[tauri::command]
pub async fn get_all_tags(db: State<'_, AppDatabase>) -> Result<Vec<Tag>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = conn
        .prepare(
            "SELECT t.id, t.name, COUNT(gt.gallery_id) as gallery_count \
             FROM tags t \
             LEFT JOIN gallery_tags gt ON gt.tag_id = t.id \
             GROUP BY t.id \
             ORDER BY t.name",
        )
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let tags = stmt
        .query_map([], |row| {
            Ok(Tag {
                id: row.get(0)?,
                name: row.get(1)?,
                gallery_count: row.get(2)?,
            })
        })
        .map_err(|e| format!("Failed to query tags: {}", e))?;

    tags.collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read tag row: {}", e))
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use tempfile::TempDir;

    #[test]
    fn test_get_all_tags_empty() {
        let tmp = TempDir::new().unwrap();
        let conn = db::init_db(tmp.path()).unwrap();

        let db_state = AppDatabase {
            conn: std::sync::Mutex::new(conn),
        };
        let locked = db_state.conn.lock().unwrap();

        let mut stmt = locked
            .prepare(
                "SELECT t.id, t.name, COUNT(gt.gallery_id) as gallery_count \
                 FROM tags t \
                 LEFT JOIN gallery_tags gt ON gt.tag_id = t.id \
                 GROUP BY t.id \
                 ORDER BY t.name",
            )
            .unwrap();

        let tags: Vec<Tag> = stmt
            .query_map([], |row| {
                Ok(Tag {
                    id: row.get(0).unwrap(),
                    name: row.get(1).unwrap(),
                    gallery_count: row.get(2).unwrap(),
                })
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert!(tags.is_empty());
    }

    #[test]
    fn test_get_all_tags_with_data() {
        let tmp = TempDir::new().unwrap();
        let conn = db::init_db(tmp.path()).unwrap();

        // Insert test data
        conn.execute("INSERT INTO tags (name) VALUES ('action')", []).unwrap();
        conn.execute("INSERT INTO tags (name) VALUES ('comedy')", []).unwrap();

        // Insert volume, root, artist, gallery for gallery_tags FK
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

        // Tag gallery 1 and 2 with 'action', only gallery 1 with 'comedy'
        conn.execute("INSERT INTO gallery_tags (gallery_id, tag_id) VALUES (1, 1)", []).unwrap();
        conn.execute("INSERT INTO gallery_tags (gallery_id, tag_id) VALUES (2, 1)", []).unwrap();
        conn.execute("INSERT INTO gallery_tags (gallery_id, tag_id) VALUES (1, 2)", []).unwrap();

        let mut stmt = conn
            .prepare(
                "SELECT t.id, t.name, COUNT(gt.gallery_id) as gallery_count \
                 FROM tags t \
                 LEFT JOIN gallery_tags gt ON gt.tag_id = t.id \
                 GROUP BY t.id \
                 ORDER BY t.name",
            )
            .unwrap();

        let tags: Vec<Tag> = stmt
            .query_map([], |row| {
                Ok(Tag {
                    id: row.get(0).unwrap(),
                    name: row.get(1).unwrap(),
                    gallery_count: row.get(2).unwrap(),
                })
            })
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert_eq!(tags.len(), 2);
        assert_eq!(tags[0].name, "action");
        assert_eq!(tags[0].gallery_count, 2);
        assert_eq!(tags[1].name, "comedy");
        assert_eq!(tags[1].gallery_count, 1);
    }
}
