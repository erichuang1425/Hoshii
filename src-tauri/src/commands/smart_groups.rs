use tauri::State;

use crate::db::AppDatabase;
use crate::services::smart_grouping::{compute_smart_groups, SmartGroup};

/// Get smart groups for all galleries under an artist.
/// Groups galleries by fuzzy name similarity (normalized + Levenshtein distance).
#[tauri::command]
pub fn get_smart_groups(
    db: State<'_, AppDatabase>,
    artist_id: i64,
    threshold: Option<usize>,
) -> Result<Vec<SmartGroup>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let threshold = threshold.unwrap_or(2);

    let mut stmt = conn
        .prepare("SELECT id, name FROM galleries WHERE artist_id = ?1 ORDER BY name")
        .map_err(|e| format!("DB prepare error: {}", e))?;

    let galleries: Vec<(i64, String)> = stmt
        .query_map([artist_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| format!("DB query error: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("DB row error: {}", e))?;

    Ok(compute_smart_groups(&galleries, threshold))
}

/// Get smart groups for all galleries under a root folder (across artists).
#[tauri::command]
pub fn get_smart_groups_for_root(
    db: State<'_, AppDatabase>,
    root_id: i64,
    threshold: Option<usize>,
) -> Result<Vec<SmartGroup>, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;
    let threshold = threshold.unwrap_or(2);

    let mut stmt = conn
        .prepare(
            "SELECT g.id, g.name FROM galleries g
             JOIN artists a ON a.id = g.artist_id
             WHERE a.root_id = ?1
             ORDER BY g.name",
        )
        .map_err(|e| format!("DB prepare error: {}", e))?;

    let galleries: Vec<(i64, String)> = stmt
        .query_map([root_id], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| format!("DB query error: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("DB row error: {}", e))?;

    Ok(compute_smart_groups(&galleries, threshold))
}
