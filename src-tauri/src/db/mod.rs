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

/// Embedded migrations. Each entry is (version, name, SQL).
/// Migrations are applied in order, skipping any already recorded in `schema_version`.
const MIGRATIONS: &[(i32, &str, &str)] = &[
    (1, "initial_schema", include_str!("migrations/001_initial_schema.sql")),
    (2, "add_schema_version", include_str!("migrations/002_add_schema_version.sql")),
];

/// Initialize the SQLite database at `{app_data_dir}/hoshii/hoshii.db`.
///
/// Sets WAL mode, foreign keys, and busy_timeout, then runs migrations.
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

    // Run schema creation (idempotent via IF NOT EXISTS) for backward compat
    conn.execute_batch(include_str!("schema.sql"))
        .context("Failed to execute database schema")?;

    // Run migrations
    run_migrations(&conn)?;

    log::info!("Database schema initialized successfully");

    Ok(conn)
}

/// Run all unapplied migrations in order.
fn run_migrations(conn: &Connection) -> Result<()> {
    // Ensure schema_version table exists (migration 002 creates it,
    // but we need it to track migrations themselves)
    conn.execute_batch(
        "CREATE TABLE IF NOT EXISTS schema_version (
            version    INTEGER PRIMARY KEY,
            name       TEXT NOT NULL,
            applied_at DATETIME DEFAULT CURRENT_TIMESTAMP
        );"
    )
    .context("Failed to create schema_version table")?;

    let current_version: i32 = conn
        .query_row(
            "SELECT COALESCE(MAX(version), 0) FROM schema_version",
            [],
            |row| row.get(0),
        )
        .unwrap_or(0);

    log::info!("Current schema version: {}", current_version);

    for &(version, name, sql) in MIGRATIONS {
        if version <= current_version {
            continue;
        }

        log::info!("Applying migration {}: {}", version, name);

        conn.execute_batch(sql)
            .with_context(|| format!("Failed to apply migration {}: {}", version, name))?;

        conn.execute(
            "INSERT INTO schema_version (version, name) VALUES (?1, ?2)",
            rusqlite::params![version, name],
        )
        .with_context(|| format!("Failed to record migration {}", version))?;

        log::info!("Migration {} applied successfully", version);
    }

    Ok(())
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
            "app_settings",
            "schema_version",
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

    #[test]
    fn test_migrations_applied() {
        let tmp = TempDir::new().unwrap();
        let conn = init_db(tmp.path()).unwrap();

        let max_version: i32 = conn
            .query_row("SELECT MAX(version) FROM schema_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(max_version, MIGRATIONS.len() as i32);
    }

    #[test]
    fn test_migrations_idempotent() {
        let tmp = TempDir::new().unwrap();
        let conn = init_db(tmp.path()).unwrap();

        // Running migrations again should not error (all already applied)
        run_migrations(&conn).unwrap();

        let count: i32 = conn
            .query_row("SELECT COUNT(*) FROM schema_version", [], |row| row.get(0))
            .unwrap();
        assert_eq!(count, MIGRATIONS.len() as i32);
    }
}
