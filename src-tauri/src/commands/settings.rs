use rusqlite::params;
use tauri::State;

use crate::db::AppDatabase;
use crate::models::AppSettings;

#[tauri::command]
pub async fn get_settings(db: State<'_, AppDatabase>) -> Result<AppSettings, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT key, value FROM app_settings")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let rows: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| format!("Failed to query settings: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read settings row: {}", e))?;

    let mut settings = AppSettings::default();

    for (key, value) in rows {
        match key.as_str() {
            "theme" => settings.theme = value,
            "language" => settings.language = value,
            "default_reading_mode" => settings.default_reading_mode = value,
            "auto_play_animated" => settings.auto_play_animated = value == "true",
            "auto_play_loop_threshold" => {
                if let Ok(v) = value.parse() { settings.auto_play_loop_threshold = v; }
            }
            "thumbnail_size" => settings.thumbnail_size = value,
            "show_media_badges" => settings.show_media_badges = value == "true",
            "video_player_volume" => {
                if let Ok(v) = value.parse() { settings.video_player_volume = v; }
            }
            "gallery_sort_order" => settings.gallery_sort_order = value,
            "thumbnail_cache_max_mb" => {
                if let Ok(v) = value.parse() { settings.thumbnail_cache_max_mb = v; }
            }
            "auto_export_metadata" => settings.auto_export_metadata = value == "true",
            "default_reading_direction" => settings.default_reading_direction = value,
            "default_fit_mode" => settings.default_fit_mode = value,
            "auto_scroll_speed" => {
                if let Ok(v) = value.parse() { settings.auto_scroll_speed = v; }
            }
            "smart_grouping_threshold" => {
                if let Ok(v) = value.parse() { settings.smart_grouping_threshold = v; }
            }
            "enable_smart_grouping" => settings.enable_smart_grouping = value == "true",
            "enable_chronological_linking" => settings.enable_chronological_linking = value == "true",
            _ => {}
        }
    }

    Ok(settings)
}

#[tauri::command]
pub async fn update_settings(
    db: State<'_, AppDatabase>,
    settings: serde_json::Value,
) -> Result<AppSettings, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let obj = settings.as_object().ok_or("Settings must be an object")?;

    for (key, value) in obj {
        let db_key = to_snake_case(key);
        let db_value = match value {
            serde_json::Value::Bool(b) => b.to_string(),
            serde_json::Value::Number(n) => n.to_string(),
            serde_json::Value::String(s) => s.clone(),
            _ => continue,
        };

        conn.execute(
            "INSERT INTO app_settings (key, value) VALUES (?1, ?2) \
             ON CONFLICT(key) DO UPDATE SET value = ?2",
            params![db_key, db_value],
        )
        .map_err(|e| format!("Failed to update setting '{}': {}", db_key, e))?;
    }

    drop(conn);
    get_settings_inner(&db)
}

fn get_settings_inner(db: &AppDatabase) -> Result<AppSettings, String> {
    let conn = db.conn.lock().map_err(|e| format!("DB lock error: {}", e))?;

    let mut stmt = conn
        .prepare("SELECT key, value FROM app_settings")
        .map_err(|e| format!("Failed to prepare query: {}", e))?;

    let rows: Vec<(String, String)> = stmt
        .query_map([], |row| Ok((row.get(0)?, row.get(1)?)))
        .map_err(|e| format!("Failed to query settings: {}", e))?
        .collect::<Result<Vec<_>, _>>()
        .map_err(|e| format!("Failed to read settings row: {}", e))?;

    let mut settings = AppSettings::default();

    for (key, value) in rows {
        match key.as_str() {
            "theme" => settings.theme = value,
            "language" => settings.language = value,
            "default_reading_mode" => settings.default_reading_mode = value,
            "auto_play_animated" => settings.auto_play_animated = value == "true",
            "auto_play_loop_threshold" => {
                if let Ok(v) = value.parse() { settings.auto_play_loop_threshold = v; }
            }
            "thumbnail_size" => settings.thumbnail_size = value,
            "show_media_badges" => settings.show_media_badges = value == "true",
            "video_player_volume" => {
                if let Ok(v) = value.parse() { settings.video_player_volume = v; }
            }
            "gallery_sort_order" => settings.gallery_sort_order = value,
            "thumbnail_cache_max_mb" => {
                if let Ok(v) = value.parse() { settings.thumbnail_cache_max_mb = v; }
            }
            "auto_export_metadata" => settings.auto_export_metadata = value == "true",
            "default_reading_direction" => settings.default_reading_direction = value,
            "default_fit_mode" => settings.default_fit_mode = value,
            "auto_scroll_speed" => {
                if let Ok(v) = value.parse() { settings.auto_scroll_speed = v; }
            }
            "smart_grouping_threshold" => {
                if let Ok(v) = value.parse() { settings.smart_grouping_threshold = v; }
            }
            "enable_smart_grouping" => settings.enable_smart_grouping = value == "true",
            "enable_chronological_linking" => settings.enable_chronological_linking = value == "true",
            _ => {}
        }
    }

    Ok(settings)
}

fn to_snake_case(s: &str) -> String {
    let mut result = String::new();
    for (i, c) in s.chars().enumerate() {
        if c.is_uppercase() {
            if i > 0 {
                result.push('_');
            }
            result.push(c.to_lowercase().next().unwrap_or(c));
        } else {
            result.push(c);
        }
    }
    result
}

#[cfg(test)]
mod tests {
    use super::*;
    use crate::db;
    use tempfile::TempDir;

    #[test]
    fn test_get_settings_returns_defaults() {
        let tmp = TempDir::new().unwrap();
        let conn = db::init_db(tmp.path()).unwrap();

        let mut stmt = conn.prepare("SELECT key, value FROM app_settings").unwrap();
        let rows: Vec<(String, String)> = stmt
            .query_map([], |row| Ok((row.get(0).unwrap(), row.get(1).unwrap())))
            .unwrap()
            .collect::<Result<Vec<_>, _>>()
            .unwrap();

        assert!(rows.is_empty());

        let settings = AppSettings::default();
        assert_eq!(settings.theme, "dark");
        assert_eq!(settings.language, "en");
    }

    #[test]
    fn test_upsert_settings() {
        let tmp = TempDir::new().unwrap();
        let conn = db::init_db(tmp.path()).unwrap();

        conn.execute(
            "INSERT INTO app_settings (key, value) VALUES ('theme', 'light') \
             ON CONFLICT(key) DO UPDATE SET value = 'light'",
            [],
        )
        .unwrap();

        let value: String = conn
            .query_row(
                "SELECT value FROM app_settings WHERE key = 'theme'",
                [],
                |row| row.get(0),
            )
            .unwrap();
        assert_eq!(value, "light");
    }

    #[test]
    fn test_to_snake_case() {
        assert_eq!(to_snake_case("autoPlayAnimated"), "auto_play_animated");
        assert_eq!(to_snake_case("theme"), "theme");
        assert_eq!(to_snake_case("thumbnailCacheMaxMb"), "thumbnail_cache_max_mb");
    }
}
