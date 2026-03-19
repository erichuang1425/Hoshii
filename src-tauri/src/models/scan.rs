use serde::{Deserialize, Serialize};

/// Result of scanning a root folder.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanResult {
    pub root_id: i64,
    pub artists_found: i64,
    pub galleries_found: i64,
    pub media_files_found: i64,
    pub unorganized_files: i64,
    pub orphaned_zips: i64,
    pub scan_duration_ms: i64,
    pub changed_files: i64,
    pub errors: Vec<ScanError>,
}

/// An error encountered during scanning.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ScanError {
    pub path: String,
    pub message: String,
    pub severity: ScanErrorSeverity,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ScanErrorSeverity {
    Warning,
    Error,
}

/// Status of ffmpeg availability on the system.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct FfmpegStatus {
    pub available: bool,
    pub version: Option<String>,
    pub path: Option<String>,
}

/// Application settings persisted in the database.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct AppSettings {
    pub theme: String,
    pub language: String,
    pub default_reading_mode: String,
    pub auto_play_animated: bool,
    pub auto_play_loop_threshold: i64,
    pub thumbnail_size: String,
    pub show_media_badges: bool,
    pub video_player_volume: f64,
    pub gallery_sort_order: String,
    pub thumbnail_cache_max_mb: i64,
    pub auto_export_metadata: bool,
}

impl Default for AppSettings {
    fn default() -> Self {
        Self {
            theme: "dark".to_string(),
            language: "en".to_string(),
            default_reading_mode: "single".to_string(),
            auto_play_animated: true,
            auto_play_loop_threshold: 30,
            thumbnail_size: "medium".to_string(),
            show_media_badges: true,
            video_player_volume: 1.0,
            gallery_sort_order: "name_asc".to_string(),
            thumbnail_cache_max_mb: 2048,
            auto_export_metadata: false,
        }
    }
}
