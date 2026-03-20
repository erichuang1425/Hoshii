use std::path::Path;
use std::sync::Mutex;

use anyhow::{Context, Result};
use rusqlite::Connection;

/// Application database state, managed by Tauri.
/// Uses Mutex for thread-safe access from async command handlers.
// TODO(debt): [PERF] Use connection pool instead of Mutex<Connection> — Task 1.2
pub struct AppDatabase {
    pub conn: Mutex<Connection>,
}

/// Initialize the SQLite database at `{app_data_dir}/hoshii/hoshii.db`.
///
/// Sets WAL mode, foreign keys, and busy_timeout, then runs the schema DDL.
pub fn init_db(app_data_dir: &Path) -> Result<Connection> {
    let db_dir = app_data_dir.join("hoshii");
    std::fs::create_dir_all(&db_dir)
        .with_context(|| format!("Failed to create database directory: {}", db_dir.display()))?;

    let db_path = db_dir.join("hoshii.db");
    log::info!("Opening database at {}", db_path.display());

    let conn = Connection::open(&db_path)
        .with_context(|| format!("Failed to open database: {}", db_path.display()))?;

    // Critical PRAGMAs — do not remove (see SECURITY.md rule 6)
    conn.execute_batch("PRAGMA journal_mode = WAL;")
        .context("Failed to set WAL journal mode")?;
    conn.execute_batch("PRAGMA foreign_keys = ON;")
        .context("Failed to enable foreign keys")?;
    conn.execute_batch("PRAGMA busy_timeout = 5000;")
        .context("Failed to set busy timeout")?;

    log::info!("Database PRAGMAs set: WAL mode, foreign_keys ON, busy_timeout 5000ms");

    // Run schema creation (idempotent via IF NOT EXISTS)
    conn.execute_batch(include_str!("schema.sql"))
        .context("Failed to execute database schema")?;

    log::info!("Database schema initialized successfully");

    Ok(conn)
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_init_db_creates_database() {
        let tmp = TempDir::new().unwrap();
        let conn = init_db(tmp.path()).unwrap();

        // Verify WAL mode
        let journal_mode: String = conn
            .query_row("PRAGMA journal_mode;", [], |row| row.get(0))
            .unwrap();
        assert_eq!(journal_mode, "wal");

        // Verify foreign keys enabled
        let fk: i32 = conn
            .query_row("PRAGMA foreign_keys;", [], |row| row.get(0))
            .unwrap();
        assert_eq!(fk, 1);

        // Verify busy_timeout
        let timeout: i32 = conn
            .query_row("PRAGMA busy_timeout;", [], |row| row.get(0))
            .unwrap();
        assert_eq!(timeout, 5000);
    }

    #[test]
    fn test_schema_creates_all_tables() {
        let tmp = TempDir::new().unwrap();
        let conn = init_db(tmp.path()).unwrap();

        let expected_tables = [
            "volumes",
            "root_folders",
            "artists",
            "galleries",
            "gallery_media",
            "tags",
            "gallery_tags",
            "unorganized_files",
        ];

        for table in &expected_tables {
            let count: i32 = conn
                .query_row(
                    "SELECT COUNT(*) FROM sqlite_master WHERE type='table' AND name=?1",
                    [table],
                    |row| row.get(0),
                )
                .unwrap();
            assert_eq!(count, 1, "Table '{}' should exist", table);
        }
    }

    #[test]
    fn test_schema_is_idempotent() {
        let tmp = TempDir::new().unwrap();
        let conn = init_db(tmp.path()).unwrap();

        // Running schema again should not error
        conn.execute_batch(include_str!("schema.sql")).unwrap();
    }

    #[test]
    fn test_foreign_keys_enforced() {
        let tmp = TempDir::new().unwrap();
        let conn = init_db(tmp.path()).unwrap();

        // Inserting a root_folder referencing a non-existent volume should fail
        let result = conn.execute(
            "INSERT INTO root_folders (volume_id, path, relative_path) VALUES (9999, '/test', 'test')",
            [],
        );
        assert!(result.is_err(), "Foreign key constraint should be enforced");
    }
}
