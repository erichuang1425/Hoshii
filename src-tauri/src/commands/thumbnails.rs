use tauri::{AppHandle, Manager};

use crate::services::media_detector;
use crate::services::thumbnail;

/// Generate a thumbnail for a media file.
///
/// Returns the filesystem path to the generated (or cached) thumbnail.
/// For video files, requires ffmpeg to be available.
#[tauri::command]
pub async fn generate_thumbnail(
    app: AppHandle,
    path: String,
    width: u32,
) -> Result<String, String> {
    let source_path = std::path::Path::new(&path);

    if !source_path.exists() {
        return Err(format!("Source file not found: {}", path));
    }

    let cache_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("hoshii")
        .join("thumbs");

    let ext = source_path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let media_type = media_detector::classify_extension(&ext);

    let result = match media_type {
        Some(crate::models::MediaType::Image) | Some(crate::models::MediaType::AvifStatic) => {
            thumbnail::generate_image_thumbnail(source_path, &cache_dir, width)
                .map(Some)
                .map_err(|e| format!("Thumbnail generation failed: {}", e))
        }
        Some(crate::models::MediaType::AnimatedImage) => {
            thumbnail::generate_gif_thumbnail(source_path, &cache_dir, width)
                .map(Some)
                .map_err(|e| format!("GIF thumbnail failed: {}", e))
        }
        Some(crate::models::MediaType::Video) => {
            // Check ffmpeg availability
            let ffmpeg_path = crate::services::video_processor::find_ffmpeg();
            thumbnail::generate_video_thumbnail(
                source_path,
                &cache_dir,
                width,
                ffmpeg_path.as_deref(),
            )
            .map_err(|e| format!("Video thumbnail failed: {}", e))
        }
        _ => Ok(None),
    }?;

    match result {
        Some(p) => Ok(p.to_string_lossy().to_string()),
        None => Err("Could not generate thumbnail (unsupported format or ffmpeg unavailable)".into()),
    }
}

/// Evict old thumbnails from the cache using LRU policy.
///
/// Returns the number of bytes freed.
#[tauri::command]
pub async fn evict_thumbnail_cache(
    app: AppHandle,
    max_bytes: Option<u64>,
) -> Result<u64, String> {
    let cache_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("hoshii")
        .join("thumbs");

    thumbnail::evict_lru(&cache_dir, max_bytes)
        .map_err(|e| format!("Cache eviction failed: {}", e))
}

/// Get the current thumbnail cache size in bytes.
#[tauri::command]
pub async fn get_thumbnail_cache_size(app: AppHandle) -> Result<u64, String> {
    let cache_dir = app
        .path()
        .app_local_data_dir()
        .map_err(|e| format!("Failed to get app data dir: {}", e))?
        .join("hoshii")
        .join("thumbs");

    Ok(thumbnail::cache_size(&cache_dir))
}
