use crate::services::video_processor;

/// Probe a media file for metadata (dimensions, duration, animation, type).
#[tauri::command]
pub async fn probe_media(path: String) -> Result<video_processor::ProbeResult, String> {
    let source_path = std::path::Path::new(&path);

    if !source_path.exists() {
        return Err(format!("File not found: {}", path));
    }

    video_processor::probe_media(source_path).map_err(|e| format!("Probe failed: {}", e))
}
