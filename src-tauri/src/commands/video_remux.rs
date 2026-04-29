use tauri::{AppHandle, Manager};

use crate::services::video_processor;

/// Remux a non-browser-native video (MKV, AVI, etc.) to MP4.
///
/// Returns the path to the remuxed MP4 file. Requires ffmpeg.
#[tauri::command]
pub async fn remux_video(app: AppHandle, path: String) -> Result<String, String> {
    let source_path = std::path::Path::new(&path);

    if !source_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    let cache_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("hoshii")
        .join("remuxed");

    let result = video_processor::remux_to_mp4(source_path, &cache_dir)
        .map_err(|e| format!("Remux failed: {}", e))?;

    Ok(result.to_string_lossy().to_string())
}

/// Convert an animated AVIF to WebP for browser playback.
///
/// Returns the path to the converted WebP file.
#[tauri::command]
pub async fn convert_animated_avif(app: AppHandle, path: String) -> Result<String, String> {
    let source_path = std::path::Path::new(&path);

    if !source_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    let cache_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("hoshii")
        .join("avif-converted");

    let result = video_processor::convert_animated_avif_to_webp(source_path, &cache_dir)
        .map_err(|e| format!("AVIF conversion failed: {}", e))?;

    Ok(result.to_string_lossy().to_string())
}
