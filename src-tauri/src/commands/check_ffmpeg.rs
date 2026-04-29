use crate::models::FfmpegStatus;
use crate::services::video_processor;

/// Check if ffmpeg is available on the system.
///
/// Returns an FfmpegStatus with availability, version, and path.
#[tauri::command]
pub async fn check_ffmpeg() -> Result<FfmpegStatus, String> {
    Ok(video_processor::check_ffmpeg_status())
}
