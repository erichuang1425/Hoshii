use std::fs;
use std::path::{Path, PathBuf};
use std::process::Command;

use anyhow::{Context, Result};

use crate::models::FfmpegStatus;

/// Find ffmpeg binary in PATH. Returns the full path if found.
pub fn find_ffmpeg() -> Option<String> {
    let output = Command::new("which").arg("ffmpeg").output().ok()?;
    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() {
            return Some(path);
        }
    }

    // Fallback: try common locations
    for candidate in &["/usr/bin/ffmpeg", "/usr/local/bin/ffmpeg"] {
        if Path::new(candidate).exists() {
            return Some(candidate.to_string());
        }
    }

    None
}

/// Find ffprobe binary in PATH. Returns the full path if found.
pub fn find_ffprobe() -> Option<String> {
    let output = Command::new("which").arg("ffprobe").output().ok()?;
    if output.status.success() {
        let path = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !path.is_empty() {
            return Some(path);
        }
    }

    for candidate in &["/usr/bin/ffprobe", "/usr/local/bin/ffprobe"] {
        if Path::new(candidate).exists() {
            return Some(candidate.to_string());
        }
    }

    None
}

/// Check ffmpeg availability on the system.
pub fn check_ffmpeg_status() -> FfmpegStatus {
    let path = find_ffmpeg();

    if let Some(ref ffmpeg_path) = path {
        let version = get_ffmpeg_version(ffmpeg_path);
        FfmpegStatus {
            available: true,
            version,
            path: Some(ffmpeg_path.clone()),
        }
    } else {
        FfmpegStatus {
            available: false,
            version: None,
            path: None,
        }
    }
}

/// Get ffmpeg version string (e.g., "6.1.1").
fn get_ffmpeg_version(ffmpeg_path: &str) -> Option<String> {
    let output = Command::new(ffmpeg_path)
        .args(["-version"])
        .output()
        .ok()?;

    let stdout = String::from_utf8_lossy(&output.stdout);
    // Parse "ffmpeg version 6.1.1 Copyright ..."
    stdout
        .lines()
        .next()
        .and_then(|line| {
            line.split_whitespace()
                .nth(2)
                .map(|v| v.to_string())
        })
}

/// Media probe result from ffprobe.
#[derive(Debug, Clone, serde::Serialize, serde::Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct ProbeResult {
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub duration_ms: Option<i64>,
    pub is_animated: bool,
    pub media_type: String,
}

/// Probe media file metadata using the image crate for images
/// and ffprobe for video files.
pub fn probe_media(path: &Path) -> Result<ProbeResult> {
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let media_type = crate::services::media_detector::classify_extension(&ext);

    match media_type {
        Some(crate::models::MediaType::Image) | Some(crate::models::MediaType::AvifStatic) => {
            probe_image(path)
        }
        Some(crate::models::MediaType::AnimatedImage) => probe_animated_image(path),
        Some(crate::models::MediaType::Video) => probe_video(path),
        Some(crate::models::MediaType::AvifAnimated) => {
            let mut result = probe_image(path)?;
            result.is_animated = true;
            result.media_type = "avif_animated".to_string();
            Ok(result)
        }
        None => Err(anyhow::anyhow!("Unsupported media type for: {}", path.display())),
    }
}

/// Probe a static image file for dimensions.
fn probe_image(path: &Path) -> Result<ProbeResult> {
    let (width, height) = image_dimensions(path)?;
    let ext = path
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_lowercase();

    let media_type = if ext == "avif" {
        "avif_static"
    } else {
        "image"
    };

    Ok(ProbeResult {
        width: Some(width as i32),
        height: Some(height as i32),
        duration_ms: None,
        is_animated: false,
        media_type: media_type.to_string(),
    })
}

/// Probe an animated image (GIF, APNG).
fn probe_animated_image(path: &Path) -> Result<ProbeResult> {
    let (width, height) = image_dimensions(path)?;

    Ok(ProbeResult {
        width: Some(width as i32),
        height: Some(height as i32),
        duration_ms: None,
        is_animated: true,
        media_type: "animated_image".to_string(),
    })
}

/// Get image dimensions via the image crate.
fn image_dimensions(path: &Path) -> Result<(u32, u32)> {
    image::image_dimensions(path)
        .with_context(|| format!("Failed to read image dimensions: {}", path.display()))
}

/// Probe a video file for dimensions, duration, etc.
///
/// Uses ffprobe if available, otherwise returns minimal info.
fn probe_video(path: &Path) -> Result<ProbeResult> {
    if let Some(ffprobe_path) = find_ffprobe() {
        probe_video_ffprobe(&ffprobe_path, path)
    } else {
        // Without ffprobe, return what we know (it's a video)
        Ok(ProbeResult {
            width: None,
            height: None,
            duration_ms: None,
            is_animated: false,
            media_type: "video".to_string(),
        })
    }
}

/// Probe video using ffprobe JSON output.
fn probe_video_ffprobe(ffprobe_path: &str, path: &Path) -> Result<ProbeResult> {
    let output = Command::new(ffprobe_path)
        .args([
            "-v", "quiet",
            "-print_format", "json",
            "-show_streams",
            "-show_format",
            &path.to_string_lossy(),
        ])
        .output()
        .with_context(|| "Failed to run ffprobe")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("ffprobe failed: {}", stderr));
    }

    let json: serde_json::Value =
        serde_json::from_slice(&output.stdout).context("Failed to parse ffprobe output")?;

    let mut width = None;
    let mut height = None;
    let mut duration_ms = None;

    // Extract from first video stream
    if let Some(streams) = json["streams"].as_array() {
        for stream in streams {
            if stream["codec_type"].as_str() == Some("video") {
                width = stream["width"].as_i64().map(|v| v as i32);
                height = stream["height"].as_i64().map(|v| v as i32);
                break;
            }
        }
    }

    // Extract duration from format
    if let Some(dur_str) = json["format"]["duration"].as_str() {
        if let Ok(dur_secs) = dur_str.parse::<f64>() {
            duration_ms = Some((dur_secs * 1000.0) as i64);
        }
    }

    Ok(ProbeResult {
        width,
        height,
        duration_ms,
        is_animated: false,
        media_type: "video".to_string(),
    })
}

/// Remux a video file to MP4 using ffmpeg (fast, stream copy).
///
/// Returns the path to the remuxed file. The remuxed file is cached.
pub fn remux_to_mp4(source_path: &Path, cache_dir: &Path) -> Result<PathBuf> {
    let hash = simple_hash(source_path);
    let output_path = cache_dir.join(format!("{}.mp4", hash));

    // Check cache
    if output_path.exists() {
        let source_mtime = fs::metadata(source_path)
            .and_then(|m| m.modified())
            .ok();
        let output_mtime = fs::metadata(&output_path)
            .and_then(|m| m.modified())
            .ok();

        if let (Some(s), Some(o)) = (source_mtime, output_mtime) {
            if o >= s {
                log::debug!("Remux cache hit: {}", output_path.display());
                return Ok(output_path);
            }
        }
    }

    let ffmpeg = find_ffmpeg()
        .ok_or_else(|| anyhow::anyhow!("ffmpeg not available for remuxing"))?;

    fs::create_dir_all(cache_dir)
        .with_context(|| format!("Failed to create remux cache dir: {}", cache_dir.display()))?;

    // Try fast remux first (stream copy)
    let output = Command::new(&ffmpeg)
        .args([
            "-y",
            "-i", &source_path.to_string_lossy(),
            "-c", "copy",
            "-movflags", "+faststart",
            &output_path.to_string_lossy(),
        ])
        .output()
        .context("Failed to run ffmpeg remux")?;

    if output.status.success() {
        log::info!(
            "Remuxed video: {} → {}",
            source_path.display(),
            output_path.display()
        );
        return Ok(output_path);
    }

    // Fast remux failed — try transcoding
    log::warn!(
        "Fast remux failed for {}, falling back to transcode",
        source_path.display()
    );

    let output = Command::new(&ffmpeg)
        .args([
            "-y",
            "-i", &source_path.to_string_lossy(),
            "-c:v", "libx264",
            "-preset", "fast",
            "-crf", "23",
            "-c:a", "aac",
            "-b:a", "128k",
            "-movflags", "+faststart",
            &output_path.to_string_lossy(),
        ])
        .output()
        .context("Failed to run ffmpeg transcode")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("ffmpeg transcode failed: {}", stderr));
    }

    log::info!(
        "Transcoded video: {} → {}",
        source_path.display(),
        output_path.display()
    );
    Ok(output_path)
}

/// Convert animated AVIF to WebP for browser compatibility.
pub fn convert_animated_avif_to_webp(
    source_path: &Path,
    cache_dir: &Path,
) -> Result<PathBuf> {
    let hash = simple_hash(source_path);
    let output_path = cache_dir.join(format!("{}.webp", hash));

    // Check cache
    if output_path.exists() {
        let source_mtime = fs::metadata(source_path)
            .and_then(|m| m.modified())
            .ok();
        let output_mtime = fs::metadata(&output_path)
            .and_then(|m| m.modified())
            .ok();

        if let (Some(s), Some(o)) = (source_mtime, output_mtime) {
            if o >= s {
                return Ok(output_path);
            }
        }
    }

    let ffmpeg = find_ffmpeg()
        .ok_or_else(|| anyhow::anyhow!("ffmpeg not available for AVIF conversion"))?;

    fs::create_dir_all(cache_dir)?;

    let output = Command::new(&ffmpeg)
        .args([
            "-y",
            "-i", &source_path.to_string_lossy(),
            "-c:v", "libwebp",
            "-loop", "0",
            "-preset", "default",
            "-quality", "75",
            &output_path.to_string_lossy(),
        ])
        .output()
        .context("Failed to convert animated AVIF")?;

    if !output.status.success() {
        let stderr = String::from_utf8_lossy(&output.stderr);
        return Err(anyhow::anyhow!("AVIF→WebP conversion failed: {}", stderr));
    }

    log::info!(
        "Converted animated AVIF: {} → {}",
        source_path.display(),
        output_path.display()
    );
    Ok(output_path)
}

/// Detect if a WebP file is animated by inspecting its header.
///
/// WebP animation uses the VP8X chunk with the animation bit (bit 1) set.
pub fn is_animated_webp(path: &Path) -> Result<bool> {
    let data = fs::read(path).with_context(|| format!("Failed to read: {}", path.display()))?;

    // WebP file: RIFF....WEBP
    if data.len() < 21 || &data[0..4] != b"RIFF" || &data[8..12] != b"WEBP" {
        return Ok(false);
    }

    // Look for VP8X chunk
    if data.len() >= 21 && &data[12..16] == b"VP8X" {
        // Byte 20 has flags: bit 1 = animation
        let flags = data[20];
        return Ok((flags & 0x02) != 0);
    }

    Ok(false)
}

/// Detect if an AVIF file is animated by inspecting the ftyp box.
///
/// `avis` brand indicates an image sequence (animated).
/// `avif` or `mif1` brand indicates a single image (static).
pub fn is_animated_avif(path: &Path) -> Result<bool> {
    let data = fs::read(path).with_context(|| format!("Failed to read: {}", path.display()))?;

    // ISOBMFF structure: boxes with [size(4)][type(4)][data...]
    // ftyp box should be near the start
    if data.len() < 12 {
        return Ok(false);
    }

    let mut offset = 0;
    while offset + 8 <= data.len() {
        let box_size = u32::from_be_bytes([
            data[offset],
            data[offset + 1],
            data[offset + 2],
            data[offset + 3],
        ]) as usize;
        let box_type = &data[offset + 4..offset + 8];

        if box_type == b"ftyp" && offset + 12 <= data.len() {
            let major_brand = &data[offset + 8..offset + 12];
            if major_brand == b"avis" {
                return Ok(true);
            }

            // Also check compatible brands
            let end = if box_size > 0 {
                (offset + box_size).min(data.len())
            } else {
                data.len()
            };
            let mut brand_offset = offset + 16; // skip major brand + minor version
            while brand_offset + 4 <= end {
                if &data[brand_offset..brand_offset + 4] == b"avis" {
                    return Ok(true);
                }
                brand_offset += 4;
            }

            return Ok(false);
        }

        if box_size == 0 {
            break;
        }
        offset += box_size;
    }

    Ok(false)
}

fn simple_hash(path: &Path) -> u64 {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    path.hash(&mut hasher);
    hasher.finish()
}

#[cfg(test)]
mod tests {
    use super::*;
    use tempfile::TempDir;

    #[test]
    fn test_check_ffmpeg_status_returns_struct() {
        let status = check_ffmpeg_status();
        // Just verify it doesn't panic and returns a valid struct
        assert!(status.available || !status.available);
        if status.available {
            assert!(status.path.is_some());
        } else {
            assert!(status.version.is_none());
        }
    }

    #[test]
    fn test_probe_image_png() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("test.png");
        let img = image::RgbImage::from_fn(320, 240, |_, _| image::Rgb([100, 150, 200]));
        img.save(&path).unwrap();

        let result = probe_media(&path).unwrap();
        assert_eq!(result.width, Some(320));
        assert_eq!(result.height, Some(240));
        assert_eq!(result.media_type, "image");
        assert!(!result.is_animated);
        assert!(result.duration_ms.is_none());
    }

    #[test]
    fn test_probe_image_jpg() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("photo.jpg");
        let img = image::RgbImage::from_fn(640, 480, |_, _| image::Rgb([50, 100, 150]));
        img.save(&path).unwrap();

        let result = probe_media(&path).unwrap();
        assert_eq!(result.width, Some(640));
        assert_eq!(result.height, Some(480));
        assert_eq!(result.media_type, "image");
    }

    #[test]
    fn test_probe_gif() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("anim.gif");
        let img = image::RgbImage::from_fn(100, 80, |_, _| image::Rgb([255, 0, 0]));
        img.save(&path).unwrap();

        let result = probe_media(&path).unwrap();
        assert_eq!(result.width, Some(100));
        assert_eq!(result.height, Some(80));
        assert_eq!(result.media_type, "animated_image");
        assert!(result.is_animated);
    }

    #[test]
    fn test_probe_video_without_ffprobe() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("test.mp4");
        fs::write(&path, b"fake video").unwrap();

        let result = probe_media(&path).unwrap();
        assert_eq!(result.media_type, "video");
        // Without ffprobe, dimensions are unknown
    }

    #[test]
    fn test_probe_unsupported_extension() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("readme.txt");
        fs::write(&path, b"hello").unwrap();

        let result = probe_media(&path);
        assert!(result.is_err());
    }

    #[test]
    fn test_is_animated_webp_static() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("static.webp");
        let img = image::RgbImage::from_fn(10, 10, |_, _| image::Rgb([0, 0, 0]));
        img.save(&path).unwrap();

        // Saved as static WebP — should not be animated
        let animated = is_animated_webp(&path).unwrap();
        assert!(!animated);
    }

    #[test]
    fn test_is_animated_webp_not_webp() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("notwebp.webp");
        fs::write(&path, b"not a webp file at all").unwrap();

        let animated = is_animated_webp(&path).unwrap();
        assert!(!animated);
    }

    #[test]
    fn test_is_animated_avif_fake_file() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("test.avif");
        fs::write(&path, b"not an avif").unwrap();

        let animated = is_animated_avif(&path).unwrap();
        assert!(!animated);
    }

    #[test]
    fn test_is_animated_avif_static_ftyp() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("static.avif");

        // Construct a minimal ftyp box: [size=20][ftyp][avif][0000][mif1]
        let mut data = Vec::new();
        data.extend_from_slice(&20u32.to_be_bytes()); // box size
        data.extend_from_slice(b"ftyp");               // box type
        data.extend_from_slice(b"avif");               // major brand
        data.extend_from_slice(&0u32.to_be_bytes());   // minor version
        data.extend_from_slice(b"mif1");               // compatible brand
        fs::write(&path, &data).unwrap();

        let animated = is_animated_avif(&path).unwrap();
        assert!(!animated);
    }

    #[test]
    fn test_is_animated_avif_animated_ftyp() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("animated.avif");

        // Construct ftyp box with avis brand
        let mut data = Vec::new();
        data.extend_from_slice(&20u32.to_be_bytes()); // box size
        data.extend_from_slice(b"ftyp");               // box type
        data.extend_from_slice(b"avis");               // major brand (animated)
        data.extend_from_slice(&0u32.to_be_bytes());   // minor version
        data.extend_from_slice(b"msf1");               // compatible brand
        fs::write(&path, &data).unwrap();

        let animated = is_animated_avif(&path).unwrap();
        assert!(animated);
    }

    #[test]
    fn test_is_animated_avif_compatible_brand() {
        let tmp = TempDir::new().unwrap();
        let path = tmp.path().join("anim2.avif");

        // Major brand is avif but avis is in compatible brands
        let mut data = Vec::new();
        data.extend_from_slice(&24u32.to_be_bytes()); // box size
        data.extend_from_slice(b"ftyp");               // box type
        data.extend_from_slice(b"avif");               // major brand (static)
        data.extend_from_slice(&0u32.to_be_bytes());   // minor version
        data.extend_from_slice(b"mif1");               // compatible brand
        data.extend_from_slice(b"avis");               // compatible brand (animated)
        fs::write(&path, &data).unwrap();

        let animated = is_animated_avif(&path).unwrap();
        assert!(animated);
    }

    #[test]
    fn test_remux_no_ffmpeg() {
        let tmp = TempDir::new().unwrap();
        let source = tmp.path().join("video.mkv");
        fs::write(&source, b"fake mkv").unwrap();
        let cache = tmp.path().join("remux_cache");

        // If ffmpeg is not installed, this should fail gracefully
        if find_ffmpeg().is_none() {
            let result = remux_to_mp4(&source, &cache);
            assert!(result.is_err());
        }
    }

    #[test]
    fn test_convert_avif_no_ffmpeg() {
        let tmp = TempDir::new().unwrap();
        let source = tmp.path().join("anim.avif");
        fs::write(&source, b"fake avif").unwrap();
        let cache = tmp.path().join("avif_cache");

        if find_ffmpeg().is_none() {
            let result = convert_animated_avif_to_webp(&source, &cache);
            assert!(result.is_err());
        }
    }

    #[test]
    fn test_simple_hash_deterministic() {
        let p = Path::new("/test/file.mp4");
        let h1 = simple_hash(p);
        let h2 = simple_hash(p);
        assert_eq!(h1, h2);
    }

    #[test]
    fn test_simple_hash_different_paths() {
        let p1 = Path::new("/test/file1.mp4");
        let p2 = Path::new("/test/file2.mp4");
        assert_ne!(simple_hash(p1), simple_hash(p2));
    }
}
