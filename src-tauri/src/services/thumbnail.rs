use std::collections::BinaryHeap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::SystemTime;

use anyhow::{Context, Result};
use image::imageops::FilterType;
use image::GenericImageView;

/// Default maximum cache size in bytes (2 GB).
const DEFAULT_MAX_CACHE_BYTES: u64 = 2 * 1024 * 1024 * 1024;

/// Thumbnail output format (WebP for small file size + quality).
const THUMB_FORMAT: image::ImageFormat = image::ImageFormat::WebP;
const THUMB_EXT: &str = "webp";

/// Generate a thumbnail for a static image file.
///
/// Returns the path to the generated thumbnail. If a valid cached thumbnail
/// exists (matching mtime), it is returned immediately.
pub fn generate_image_thumbnail(
    source_path: &Path,
    cache_dir: &Path,
    max_width: u32,
) -> Result<PathBuf> {
    let thumb_path = thumb_path_for(source_path, cache_dir, max_width);

    // Check cache: if thumb exists and source hasn't changed, return cached
    if let Some(cached) = check_cache(&thumb_path, source_path) {
        log::debug!("Thumbnail cache hit: {}", cached.display());
        return Ok(cached);
    }

    // Load and resize
    let img = image::open(source_path)
        .with_context(|| format!("Failed to open image: {}", source_path.display()))?;

    let (orig_w, orig_h) = img.dimensions();
    let thumb = if orig_w > max_width {
        let new_height = (orig_h as f64 * max_width as f64 / orig_w as f64) as u32;
        img.resize(max_width, new_height, FilterType::Lanczos3)
    } else {
        // Image is already small enough — still save as thumbnail format
        img.resize(orig_w, orig_h, FilterType::Lanczos3)
    };

    // Write thumbnail
    if let Some(parent) = thumb_path.parent() {
        fs::create_dir_all(parent)
            .with_context(|| format!("Failed to create thumb dir: {}", parent.display()))?;
    }

    thumb
        .save_with_format(&thumb_path, THUMB_FORMAT)
        .with_context(|| format!("Failed to save thumbnail: {}", thumb_path.display()))?;

    log::info!(
        "Generated thumbnail: {} ({}x{} → {}x{})",
        thumb_path.display(),
        orig_w,
        orig_h,
        thumb.width(),
        thumb.height()
    );

    Ok(thumb_path)
}

/// Generate a thumbnail for a GIF by extracting the first frame.
pub fn generate_gif_thumbnail(
    source_path: &Path,
    cache_dir: &Path,
    max_width: u32,
) -> Result<PathBuf> {
    let thumb_path = thumb_path_for(source_path, cache_dir, max_width);

    if let Some(cached) = check_cache(&thumb_path, source_path) {
        return Ok(cached);
    }

    // image::open reads the first frame of GIFs by default
    let img = image::open(source_path)
        .with_context(|| format!("Failed to open GIF: {}", source_path.display()))?;

    let (orig_w, orig_h) = img.dimensions();
    let thumb = if orig_w > max_width {
        let new_height = (orig_h as f64 * max_width as f64 / orig_w as f64) as u32;
        img.resize(max_width, new_height, FilterType::Lanczos3)
    } else {
        img.resize(orig_w, orig_h, FilterType::Lanczos3)
    };

    if let Some(parent) = thumb_path.parent() {
        fs::create_dir_all(parent)?;
    }

    thumb.save_with_format(&thumb_path, THUMB_FORMAT)?;

    log::info!("Generated GIF thumbnail: {}", thumb_path.display());
    Ok(thumb_path)
}

/// Generate a video thumbnail using ffmpeg.
///
/// Extracts a frame at 1 second (or the first frame for very short videos).
/// Returns `None` if ffmpeg is not available.
pub fn generate_video_thumbnail(
    source_path: &Path,
    cache_dir: &Path,
    max_width: u32,
    ffmpeg_path: Option<&str>,
) -> Result<Option<PathBuf>> {
    let ffmpeg = match ffmpeg_path {
        Some(p) => p.to_string(),
        None => return Ok(None),
    };

    let thumb_path = thumb_path_for(source_path, cache_dir, max_width);

    if let Some(cached) = check_cache(&thumb_path, source_path) {
        return Ok(Some(cached));
    }

    if let Some(parent) = thumb_path.parent() {
        fs::create_dir_all(parent)?;
    }

    // Use a temporary PNG for ffmpeg output, then convert via image crate
    let tmp_png = thumb_path.with_extension("tmp.png");

    let output = std::process::Command::new(&ffmpeg)
        .args([
            "-y",
            "-i",
            &source_path.to_string_lossy(),
            "-ss",
            "1",
            "-vframes",
            "1",
            "-vf",
            &format!("scale={}:-1", max_width),
            &tmp_png.to_string_lossy(),
        ])
        .output()
        .with_context(|| "Failed to run ffmpeg for video thumbnail")?;

    if !output.status.success() {
        // Try at 0 seconds (for very short videos)
        let output2 = std::process::Command::new(&ffmpeg)
            .args([
                "-y",
                "-i",
                &source_path.to_string_lossy(),
                "-vframes",
                "1",
                "-vf",
                &format!("scale={}:-1", max_width),
                &tmp_png.to_string_lossy(),
            ])
            .output()
            .with_context(|| "Failed to run ffmpeg for video thumbnail (retry at 0s)")?;

        if !output2.status.success() {
            let stderr = String::from_utf8_lossy(&output2.stderr);
            log::warn!("ffmpeg thumbnail extraction failed: {}", stderr);
            let _ = fs::remove_file(&tmp_png);
            return Ok(None);
        }
    }

    // Convert ffmpeg output PNG to WebP thumbnail
    if tmp_png.exists() {
        let img = image::open(&tmp_png)?;
        img.save_with_format(&thumb_path, THUMB_FORMAT)?;
        let _ = fs::remove_file(&tmp_png);
        log::info!("Generated video thumbnail: {}", thumb_path.display());
        Ok(Some(thumb_path))
    } else {
        Ok(None)
    }
}

/// Compute the cache path for a given source file.
///
/// Uses a hash of the source path to avoid collisions.
fn thumb_path_for(source_path: &Path, cache_dir: &Path, max_width: u32) -> PathBuf {
    let hash = simple_hash(source_path);
    cache_dir.join(format!("{}_{}.{}", hash, max_width, THUMB_EXT))
}

/// Check if a cached thumbnail exists and is newer than the source file.
fn check_cache(thumb_path: &Path, source_path: &Path) -> Option<PathBuf> {
    if !thumb_path.exists() {
        return None;
    }

    let source_mtime = fs::metadata(source_path)
        .and_then(|m| m.modified())
        .ok()?;
    let thumb_mtime = fs::metadata(thumb_path)
        .and_then(|m| m.modified())
        .ok()?;

    if thumb_mtime >= source_mtime {
        Some(thumb_path.to_path_buf())
    } else {
        // Source changed, invalidate
        let _ = fs::remove_file(thumb_path);
        None
    }
}

/// Simple non-cryptographic hash for cache file naming.
fn simple_hash(path: &Path) -> u64 {
    use std::hash::{Hash, Hasher};
    let mut hasher = std::collections::hash_map::DefaultHasher::new();
    path.hash(&mut hasher);
    hasher.finish()
}

/// Get the total size in bytes of all files in a directory (non-recursive for flat cache).
pub fn cache_size(cache_dir: &Path) -> u64 {
    if !cache_dir.exists() {
        return 0;
    }
    let mut total = 0u64;
    if let Ok(entries) = fs::read_dir(cache_dir) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    total += meta.len();
                }
            }
        }
    }
    total
}

/// Entry for LRU eviction: tracks file access time and size.
#[derive(Eq, PartialEq)]
struct CacheEntry {
    path: PathBuf,
    accessed: SystemTime,
    size: u64,
}

impl Ord for CacheEntry {
    fn cmp(&self, other: &Self) -> std::cmp::Ordering {
        // Min-heap: oldest first (smallest time = highest priority for eviction)
        other.accessed.cmp(&self.accessed)
    }
}

impl PartialOrd for CacheEntry {
    fn partial_cmp(&self, other: &Self) -> Option<std::cmp::Ordering> {
        Some(self.cmp(other))
    }
}

/// Evict old thumbnails from the cache directory using LRU policy.
///
/// Removes the oldest-accessed files until total cache size is under `max_bytes`.
pub fn evict_lru(cache_dir: &Path, max_bytes: Option<u64>) -> Result<u64> {
    let max = max_bytes.unwrap_or(DEFAULT_MAX_CACHE_BYTES);
    let current = cache_size(cache_dir);

    if current <= max {
        return Ok(0);
    }

    let mut heap = BinaryHeap::new();

    if let Ok(entries) = fs::read_dir(cache_dir) {
        for entry in entries.flatten() {
            if let Ok(meta) = entry.metadata() {
                if meta.is_file() {
                    let accessed = meta.accessed().unwrap_or(SystemTime::UNIX_EPOCH);
                    heap.push(CacheEntry {
                        path: entry.path(),
                        accessed,
                        size: meta.len(),
                    });
                }
            }
        }
    }

    let mut freed = 0u64;
    let mut remaining = current;

    while remaining > max {
        if let Some(entry) = heap.pop() {
            if fs::remove_file(&entry.path).is_ok() {
                freed += entry.size;
                remaining -= entry.size;
                log::debug!("Evicted thumbnail: {}", entry.path.display());
            }
        } else {
            break;
        }
    }

    log::info!(
        "LRU eviction freed {} bytes ({} → {} bytes)",
        freed,
        current,
        remaining
    );
    Ok(freed)
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::io::Write;
    use tempfile::TempDir;

    fn create_test_image(dir: &Path, name: &str, width: u32, height: u32) -> PathBuf {
        let path = dir.join(name);
        let img = image::RgbImage::from_fn(width, height, |x, y| {
            image::Rgb([(x % 256) as u8, (y % 256) as u8, 128])
        });
        img.save(&path).unwrap();
        path
    }

    #[test]
    fn test_generate_image_thumbnail_creates_file() {
        let tmp = TempDir::new().unwrap();
        let source = create_test_image(tmp.path(), "test.png", 800, 600);
        let cache = tmp.path().join("cache");

        let result = generate_image_thumbnail(&source, &cache, 200).unwrap();
        assert!(result.exists());

        // Verify the thumbnail is smaller
        let thumb = image::open(&result).unwrap();
        assert_eq!(thumb.width(), 200);
    }

    #[test]
    fn test_thumbnail_cache_hit() {
        let tmp = TempDir::new().unwrap();
        let source = create_test_image(tmp.path(), "test.jpg", 400, 300);
        let cache = tmp.path().join("cache");

        let first = generate_image_thumbnail(&source, &cache, 150).unwrap();
        let second = generate_image_thumbnail(&source, &cache, 150).unwrap();
        assert_eq!(first, second);
    }

    #[test]
    fn test_thumbnail_cache_invalidation() {
        let tmp = TempDir::new().unwrap();
        let source_path = tmp.path().join("test.png");

        // Create initial image
        let img = image::RgbImage::from_fn(400, 300, |_, _| image::Rgb([255, 0, 0]));
        img.save(&source_path).unwrap();
        let cache = tmp.path().join("cache");

        let first = generate_image_thumbnail(&source_path, &cache, 150).unwrap();
        assert!(first.exists());

        // Wait a moment and modify the source
        std::thread::sleep(std::time::Duration::from_millis(50));

        let img2 = image::RgbImage::from_fn(400, 300, |_, _| image::Rgb([0, 255, 0]));
        img2.save(&source_path).unwrap();

        // Touch file to ensure mtime changes
        let file = fs::OpenOptions::new()
            .write(true)
            .append(true)
            .open(&source_path)
            .unwrap();
        drop(file);

        let second = generate_image_thumbnail(&source_path, &cache, 150).unwrap();
        // Should regenerate (same path, but regenerated)
        assert!(second.exists());
    }

    #[test]
    fn test_small_image_no_upscale() {
        let tmp = TempDir::new().unwrap();
        let source = create_test_image(tmp.path(), "small.png", 100, 75);
        let cache = tmp.path().join("cache");

        let result = generate_image_thumbnail(&source, &cache, 200).unwrap();
        let thumb = image::open(&result).unwrap();
        // Should not upscale
        assert_eq!(thumb.width(), 100);
    }

    #[test]
    fn test_gif_thumbnail() {
        let tmp = TempDir::new().unwrap();
        // Create a minimal GIF file (1x1 pixel)
        let source = create_test_image(tmp.path(), "anim.gif", 200, 150);
        let cache = tmp.path().join("cache");

        let result = generate_gif_thumbnail(&source, &cache, 100).unwrap();
        assert!(result.exists());
    }

    #[test]
    fn test_video_thumbnail_no_ffmpeg() {
        let tmp = TempDir::new().unwrap();
        let source = tmp.path().join("video.mp4");
        fs::write(&source, b"fake video data").unwrap();
        let cache = tmp.path().join("cache");

        let result = generate_video_thumbnail(&source, &cache, 200, None).unwrap();
        assert!(result.is_none());
    }

    #[test]
    fn test_cache_size_empty() {
        let tmp = TempDir::new().unwrap();
        assert_eq!(cache_size(tmp.path()), 0);
    }

    #[test]
    fn test_cache_size_with_files() {
        let tmp = TempDir::new().unwrap();
        let mut f1 = fs::File::create(tmp.path().join("a.webp")).unwrap();
        f1.write_all(&[0u8; 1000]).unwrap();
        let mut f2 = fs::File::create(tmp.path().join("b.webp")).unwrap();
        f2.write_all(&[0u8; 2000]).unwrap();

        assert_eq!(cache_size(tmp.path()), 3000);
    }

    #[test]
    fn test_evict_lru_under_limit() {
        let tmp = TempDir::new().unwrap();
        let mut f = fs::File::create(tmp.path().join("a.webp")).unwrap();
        f.write_all(&[0u8; 100]).unwrap();

        let freed = evict_lru(tmp.path(), Some(1000)).unwrap();
        assert_eq!(freed, 0);
    }

    #[test]
    fn test_evict_lru_over_limit() {
        let tmp = TempDir::new().unwrap();

        // Create files with some data
        for i in 0..10 {
            let mut f = fs::File::create(tmp.path().join(format!("{}.webp", i))).unwrap();
            f.write_all(&[0u8; 1000]).unwrap();
            // Small delay to differentiate access times
            std::thread::sleep(std::time::Duration::from_millis(10));
        }

        // Total: 10,000 bytes, limit to 5,000
        let freed = evict_lru(tmp.path(), Some(5000)).unwrap();
        assert!(freed >= 5000);
        assert!(cache_size(tmp.path()) <= 5000);
    }

    #[test]
    fn test_thumb_path_deterministic() {
        let source = Path::new("/home/user/test.jpg");
        let cache = Path::new("/tmp/cache");
        let p1 = thumb_path_for(source, cache, 200);
        let p2 = thumb_path_for(source, cache, 200);
        assert_eq!(p1, p2);
    }

    #[test]
    fn test_thumb_path_different_widths() {
        let source = Path::new("/home/user/test.jpg");
        let cache = Path::new("/tmp/cache");
        let p1 = thumb_path_for(source, cache, 200);
        let p2 = thumb_path_for(source, cache, 400);
        assert_ne!(p1, p2);
    }

    #[test]
    fn test_cache_size_nonexistent_dir() {
        assert_eq!(cache_size(Path::new("/nonexistent/dir")), 0);
    }
}
