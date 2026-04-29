use std::collections::HashMap;
use std::fs;
use std::path::{Path, PathBuf};
use std::time::Instant;

use anyhow::{Context, Result};

use crate::models::{MediaType, ScanError, ScanErrorSeverity, ScanResult};
use crate::services::media_detector;
use crate::services::natural_sort;

/// Result of scanning a single gallery directory for media files.
#[derive(Debug, Clone)]
pub struct GalleryScanData {
    pub name: String,
    pub path: PathBuf,
    pub media_files: Vec<MediaFileScanData>,
    pub total_size: u64,
    pub cover_path: Option<String>,
    pub has_backup_zip: bool,
}

/// A single media file discovered during scanning.
#[derive(Debug, Clone)]
pub struct MediaFileScanData {
    pub filename: String,
    pub path: PathBuf,
    pub relative_path: String,
    pub sort_order: i64,
    pub group_name: String,
    pub media_type: MediaType,
    pub file_size: u64,
    pub mtime: i64,
}

/// Result of scanning an artist directory.
#[derive(Debug, Clone)]
pub struct ArtistScanData {
    pub name: String,
    pub path: PathBuf,
    pub galleries: Vec<GalleryScanData>,
    pub unorganized_files: Vec<UnorganizedFileScanData>,
}

/// An unorganized file found directly in an artist folder.
#[derive(Debug, Clone)]
pub struct UnorganizedFileScanData {
    pub filename: String,
    pub path: PathBuf,
    pub media_type: Option<MediaType>,
    pub file_size: u64,
    pub mtime: i64,
}

/// Result of a full root folder scan.
#[derive(Debug)]
pub struct RootScanData {
    pub artists: Vec<ArtistScanData>,
    pub scan_result: ScanResult,
}

/// Scan a root folder: root → artists → galleries → media files.
///
/// Directory structure expected:
/// ```text
/// root_folder/
///   artist_a/
///     gallery_1/
///       1.jpg, 2.jpg, 3.mp4 ...
///     gallery_2/
///       page_001.jpg ...
///   artist_b/
///     ...
/// ```
pub fn scan_root_folder(root_path: &Path, root_id: i64) -> Result<RootScanData> {
    let start = Instant::now();
    let mut errors: Vec<ScanError> = Vec::new();
    let mut artists: Vec<ArtistScanData> = Vec::new();
    let mut total_media = 0i64;
    let mut total_galleries = 0i64;
    let mut total_unorganized = 0i64;
    if !root_path.exists() {
        return Err(anyhow::anyhow!(
            "Root folder not found (drive disconnected?): {}",
            root_path.display()
        ));
    }

    // Read top-level entries (artist folders)
    let entries = fs::read_dir(root_path)
        .with_context(|| format!("Failed to read root directory: {}", root_path.display()))?;

    for entry in entries {
        let entry = match entry {
            Ok(e) => e,
            Err(e) => {
                errors.push(ScanError {
                    path: root_path.to_string_lossy().to_string(),
                    message: format!("Failed to read directory entry: {}", e),
                    severity: ScanErrorSeverity::Warning,
                });
                continue;
            }
        };

        let path = entry.path();
        if !path.is_dir() {
            continue; // Skip files at root level
        }

        // Skip hidden directories
        match path.file_name().and_then(|n| n.to_str()) {
            Some(n) if !n.starts_with('.') => {}
            _ => continue,
        }

        match scan_artist_dir(&path) {
            Ok(artist_data) => {
                total_galleries += artist_data.galleries.len() as i64;
                total_unorganized += artist_data.unorganized_files.len() as i64;
                for gallery in &artist_data.galleries {
                    total_media += gallery.media_files.len() as i64;
                }
                artists.push(artist_data);
            }
            Err(e) => {
                log::warn!("Failed to scan artist dir {}: {}", path.display(), e);
                errors.push(ScanError {
                    path: path.to_string_lossy().to_string(),
                    message: format!("Failed to scan artist directory: {}", e),
                    severity: ScanErrorSeverity::Warning,
                });
            }
        }
    }

    let duration = start.elapsed();
    let artists_count = artists.len() as i64;

    Ok(RootScanData {
        artists,
        scan_result: ScanResult {
            root_id,
            artists_found: artists_count,
            galleries_found: total_galleries,
            media_files_found: total_media,
            unorganized_files: total_unorganized,
            orphaned_zips: 0,
            scan_duration_ms: duration.as_millis() as i64,
            changed_files: 0, // Set by incremental scan
            errors,
        },
    })
}

/// Scan an artist directory for galleries and unorganized files.
pub fn scan_artist_dir(artist_path: &Path) -> Result<ArtistScanData> {
    let name = artist_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let mut galleries: Vec<GalleryScanData> = Vec::new();
    let mut unorganized_files: Vec<UnorganizedFileScanData> = Vec::new();

    let entries = fs::read_dir(artist_path)
        .with_context(|| format!("Failed to read artist directory: {}", artist_path.display()))?;

    for entry in entries {
        let entry = entry?;
        let path = entry.path();

        if path.is_dir() {
            // Skip hidden directories
            match path.file_name().and_then(|n| n.to_str()) {
                Some(n) if !n.starts_with('.') => {}
                _ => continue,
            }

            match scan_gallery_dir(&path) {
                Ok(gallery_data) => {
                    if !gallery_data.media_files.is_empty() {
                        galleries.push(gallery_data);
                    }
                }
                Err(e) => {
                    log::warn!("Failed to scan gallery {}: {}", path.display(), e);
                }
            }
        } else if path.is_file() {
            // Files directly in artist folder = unorganized
            let filename = match path.file_name().and_then(|n| n.to_str()) {
                Some(n) if !n.starts_with('.') => n.to_string(),
                _ => continue,
            };

            let ext = filename.rsplit('.').next().unwrap_or("");
            let media_type = media_detector::classify_extension(ext);

            let metadata = fs::metadata(&path).ok();
            let file_size = metadata.as_ref().map_or(0, |m| m.len());
            let mtime = metadata
                .and_then(|m| m.modified().ok())
                .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
                .map_or(0, |d| d.as_secs() as i64);

            unorganized_files.push(UnorganizedFileScanData {
                filename,
                path,
                media_type,
                file_size,
                mtime,
            });
        }
    }

    Ok(ArtistScanData {
        name,
        path: artist_path.to_path_buf(),
        galleries,
        unorganized_files,
    })
}

/// Scan a gallery directory for media files.
///
/// Media files are naturally sorted and assigned sort order + group names.
pub fn scan_gallery_dir(gallery_path: &Path) -> Result<GalleryScanData> {
    let name = gallery_path
        .file_name()
        .and_then(|n| n.to_str())
        .unwrap_or("unknown")
        .to_string();

    let entries = fs::read_dir(gallery_path)
        .with_context(|| format!("Failed to read gallery directory: {}", gallery_path.display()))?;

    let mut media_filenames: Vec<String> = Vec::new();
    let mut file_info: HashMap<String, (PathBuf, u64, i64)> = HashMap::new();
    let mut has_backup_zip = false;
    let mut total_size: u64 = 0;

    for entry in entries {
        let entry = entry?;
        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        let filename = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) if !n.starts_with('.') => n.to_string(),
            _ => continue,
        };

        // Check for backup zip
        if filename.ends_with(".zip") {
            has_backup_zip = true;
            continue;
        }

        if !media_detector::is_media_file(&filename) {
            continue;
        }

        let metadata = fs::metadata(&path).ok();
        let file_size = metadata.as_ref().map_or(0, |m| m.len());
        let mtime = metadata
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map_or(0, |d| d.as_secs() as i64);

        total_size += file_size;
        file_info.insert(filename.clone(), (path, file_size, mtime));
        media_filenames.push(filename);
    }

    // Natural sort the filenames
    natural_sort::natural_sort(&mut media_filenames);

    // Build media entries with sort order and group names
    let mut media_files: Vec<MediaFileScanData> = Vec::new();
    for (idx, filename) in media_filenames.iter().enumerate() {
        let sort_key = natural_sort::extract_sort_key(filename);
        let ext = filename.rsplit('.').next().unwrap_or("");
        let media_type = media_detector::classify_extension(ext).unwrap_or(MediaType::Image);

        let (ref path, file_size, mtime) = file_info[filename];
        let relative_path = filename.clone(); // relative to gallery folder

        media_files.push(MediaFileScanData {
            filename: filename.clone(),
            path: path.clone(),
            relative_path,
            sort_order: idx as i64,
            group_name: sort_key.group,
            media_type,
            file_size,
            mtime,
        });
    }

    // Cover is the first sorted media file (if any)
    let cover_path = media_files.first().map(|f| f.path.to_string_lossy().to_string());

    Ok(GalleryScanData {
        name,
        path: gallery_path.to_path_buf(),
        media_files,
        total_size,
        cover_path,
        has_backup_zip,
    })
}

/// Data about a file used for incremental comparison.
#[derive(Debug, Clone)]
pub struct FileSnapshot {
    pub path: String,
    pub mtime: i64,
    pub file_size: u64,
}

/// Result of incremental scan comparison.
#[derive(Debug, Clone)]
pub struct IncrementalDiff {
    pub new_files: Vec<PathBuf>,
    pub modified_files: Vec<PathBuf>,
    pub deleted_paths: Vec<String>,
}

/// Compare current filesystem state against known DB entries to find changes.
///
/// `known_files` should be a map of absolute path → mtime for all files currently in the DB
/// for the given gallery.
pub fn compute_incremental_diff(
    gallery_path: &Path,
    known_files: &HashMap<String, i64>,
) -> Result<IncrementalDiff> {
    let mut new_files: Vec<PathBuf> = Vec::new();
    let mut modified_files: Vec<PathBuf> = Vec::new();
    let mut seen_paths: std::collections::HashSet<String> = std::collections::HashSet::new();

    if !gallery_path.exists() {
        // Gallery folder deleted — all files are "deleted"
        return Ok(IncrementalDiff {
            new_files: Vec::new(),
            modified_files: Vec::new(),
            deleted_paths: known_files.keys().cloned().collect(),
        });
    }

    let entries = fs::read_dir(gallery_path)
        .with_context(|| format!("Failed to read gallery: {}", gallery_path.display()))?;

    for entry in entries {
        let entry = entry?;
        let path = entry.path();

        if !path.is_file() {
            continue;
        }

        let filename = match path.file_name().and_then(|n| n.to_str()) {
            Some(n) if !n.starts_with('.') => n.to_string(),
            _ => continue,
        };

        if !media_detector::is_media_file(&filename) {
            continue;
        }

        let path_str = path.to_string_lossy().to_string();
        seen_paths.insert(path_str.clone());

        let current_mtime = fs::metadata(&path)
            .ok()
            .and_then(|m| m.modified().ok())
            .and_then(|t| t.duration_since(std::time::UNIX_EPOCH).ok())
            .map_or(0, |d| d.as_secs() as i64);

        match known_files.get(&path_str) {
            Some(&known_mtime) => {
                if current_mtime != known_mtime {
                    modified_files.push(path);
                }
                // else: unchanged, skip
            }
            None => {
                new_files.push(path);
            }
        }
    }

    // Files in DB but not on disk = deleted
    let deleted_paths: Vec<String> = known_files
        .keys()
        .filter(|p| !seen_paths.contains(*p))
        .cloned()
        .collect();

    Ok(IncrementalDiff {
        new_files,
        modified_files,
        deleted_paths,
    })
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::fs::{self, File};
    use std::io::Write;
    use tempfile::TempDir;

    fn create_test_file(dir: &Path, name: &str, content: &[u8]) {
        let path = dir.join(name);
        let mut f = File::create(&path).unwrap();
        f.write_all(content).unwrap();
    }

    #[test]
    fn test_scan_gallery_dir_basic() {
        let tmp = TempDir::new().unwrap();
        let gallery = tmp.path().join("test_gallery");
        fs::create_dir(&gallery).unwrap();

        create_test_file(&gallery, "3.jpg", b"fake jpg 3");
        create_test_file(&gallery, "1.jpg", b"fake jpg 1");
        create_test_file(&gallery, "2.jpg", b"fake jpg 2");
        create_test_file(&gallery, "readme.txt", b"not media");

        let result = scan_gallery_dir(&gallery).unwrap();
        assert_eq!(result.name, "test_gallery");
        assert_eq!(result.media_files.len(), 3);

        // Verify natural sort order
        let filenames: Vec<&str> = result.media_files.iter().map(|f| f.filename.as_str()).collect();
        assert_eq!(filenames, vec!["1.jpg", "2.jpg", "3.jpg"]);

        // Verify sort_order
        assert_eq!(result.media_files[0].sort_order, 0);
        assert_eq!(result.media_files[1].sort_order, 1);
        assert_eq!(result.media_files[2].sort_order, 2);
    }

    #[test]
    fn test_scan_gallery_dir_mixed_media() {
        let tmp = TempDir::new().unwrap();
        let gallery = tmp.path().join("mixed");
        fs::create_dir(&gallery).unwrap();

        create_test_file(&gallery, "3.gif", b"gif");
        create_test_file(&gallery, "1.jpg", b"jpg");
        create_test_file(&gallery, "2.mp4", b"mp4");

        let result = scan_gallery_dir(&gallery).unwrap();
        assert_eq!(result.media_files.len(), 3);

        assert_eq!(result.media_files[0].filename, "1.jpg");
        assert_eq!(result.media_files[0].media_type, MediaType::Image);

        assert_eq!(result.media_files[1].filename, "2.mp4");
        assert_eq!(result.media_files[1].media_type, MediaType::Video);

        assert_eq!(result.media_files[2].filename, "3.gif");
        assert_eq!(result.media_files[2].media_type, MediaType::AnimatedImage);
    }

    #[test]
    fn test_scan_gallery_with_zip() {
        let tmp = TempDir::new().unwrap();
        let gallery = tmp.path().join("gallery_with_zip");
        fs::create_dir(&gallery).unwrap();

        create_test_file(&gallery, "1.jpg", b"jpg");
        create_test_file(&gallery, "backup.zip", b"zip");

        let result = scan_gallery_dir(&gallery).unwrap();
        assert!(result.has_backup_zip);
        assert_eq!(result.media_files.len(), 1);
    }

    #[test]
    fn test_scan_gallery_skips_hidden() {
        let tmp = TempDir::new().unwrap();
        let gallery = tmp.path().join("gallery");
        fs::create_dir(&gallery).unwrap();

        create_test_file(&gallery, "1.jpg", b"jpg");
        create_test_file(&gallery, ".thumbs.db", b"hidden");
        create_test_file(&gallery, ".DS_Store", b"hidden");

        let result = scan_gallery_dir(&gallery).unwrap();
        assert_eq!(result.media_files.len(), 1);
    }

    #[test]
    fn test_scan_gallery_group_names() {
        let tmp = TempDir::new().unwrap();
        let gallery = tmp.path().join("grouped");
        fs::create_dir(&gallery).unwrap();

        create_test_file(&gallery, "lucy1.jpg", b"a");
        create_test_file(&gallery, "lucy2.jpg", b"b");
        create_test_file(&gallery, "eva1.jpg", b"c");
        create_test_file(&gallery, "eva2.jpg", b"d");

        let result = scan_gallery_dir(&gallery).unwrap();
        assert_eq!(result.media_files.len(), 4);

        // Should be sorted: eva1, eva2, lucy1, lucy2
        assert_eq!(result.media_files[0].group_name, "eva");
        assert_eq!(result.media_files[1].group_name, "eva");
        assert_eq!(result.media_files[2].group_name, "lucy");
        assert_eq!(result.media_files[3].group_name, "lucy");
    }

    #[test]
    fn test_scan_artist_dir() {
        let tmp = TempDir::new().unwrap();
        let artist = tmp.path().join("artist_x");
        fs::create_dir(&artist).unwrap();

        let gallery1 = artist.join("gallery_a");
        fs::create_dir(&gallery1).unwrap();
        create_test_file(&gallery1, "1.jpg", b"a");

        let gallery2 = artist.join("gallery_b");
        fs::create_dir(&gallery2).unwrap();
        create_test_file(&gallery2, "1.jpg", b"b");

        // Unorganized file in artist dir
        create_test_file(&artist, "loose.jpg", b"loose");

        let result = scan_artist_dir(&artist).unwrap();
        assert_eq!(result.name, "artist_x");
        assert_eq!(result.galleries.len(), 2);
        assert_eq!(result.unorganized_files.len(), 1);
    }

    #[test]
    fn test_scan_root_folder() {
        let tmp = TempDir::new().unwrap();
        let root = tmp.path().join("root");
        fs::create_dir(&root).unwrap();

        let artist = root.join("artist_1");
        fs::create_dir(&artist).unwrap();

        let gallery = artist.join("gallery_a");
        fs::create_dir(&gallery).unwrap();
        create_test_file(&gallery, "1.jpg", b"a");
        create_test_file(&gallery, "2.png", b"b");

        let result = scan_root_folder(&root, 1).unwrap();
        assert_eq!(result.scan_result.galleries_found, 1);
        assert_eq!(result.scan_result.media_files_found, 2);
        assert_eq!(result.artists.len(), 1);
    }

    #[test]
    fn test_scan_root_folder_nonexistent() {
        let result = scan_root_folder(Path::new("/nonexistent/path"), 1);
        assert!(result.is_err());
    }

    #[test]
    fn test_incremental_diff_new_files() {
        let tmp = TempDir::new().unwrap();
        let gallery = tmp.path().join("gallery");
        fs::create_dir(&gallery).unwrap();

        create_test_file(&gallery, "1.jpg", b"a");
        create_test_file(&gallery, "2.jpg", b"b");

        let known: HashMap<String, i64> = HashMap::new(); // DB has nothing

        let diff = compute_incremental_diff(&gallery, &known).unwrap();
        assert_eq!(diff.new_files.len(), 2);
        assert!(diff.modified_files.is_empty());
        assert!(diff.deleted_paths.is_empty());
    }

    #[test]
    fn test_incremental_diff_deleted_files() {
        let tmp = TempDir::new().unwrap();
        let gallery = tmp.path().join("gallery");
        fs::create_dir(&gallery).unwrap();

        // DB knows about files that no longer exist
        let mut known: HashMap<String, i64> = HashMap::new();
        known.insert(
            gallery.join("deleted.jpg").to_string_lossy().to_string(),
            1000,
        );

        let diff = compute_incremental_diff(&gallery, &known).unwrap();
        assert!(diff.new_files.is_empty());
        assert!(diff.modified_files.is_empty());
        assert_eq!(diff.deleted_paths.len(), 1);
    }

    #[test]
    fn test_incremental_diff_nonexistent_gallery() {
        let mut known: HashMap<String, i64> = HashMap::new();
        known.insert("/some/path/1.jpg".to_string(), 1000);
        known.insert("/some/path/2.jpg".to_string(), 1000);

        let diff = compute_incremental_diff(Path::new("/nonexistent"), &known).unwrap();
        assert_eq!(diff.deleted_paths.len(), 2);
    }

    #[test]
    fn test_scan_gallery_empty() {
        let tmp = TempDir::new().unwrap();
        let gallery = tmp.path().join("empty_gallery");
        fs::create_dir(&gallery).unwrap();

        let result = scan_gallery_dir(&gallery).unwrap();
        assert!(result.media_files.is_empty());
        assert!(result.cover_path.is_none());
    }

    #[test]
    fn test_scan_gallery_cover_is_first_sorted() {
        let tmp = TempDir::new().unwrap();
        let gallery = tmp.path().join("cover_test");
        fs::create_dir(&gallery).unwrap();

        create_test_file(&gallery, "10.jpg", b"ten");
        create_test_file(&gallery, "1.jpg", b"one");
        create_test_file(&gallery, "5.jpg", b"five");

        let result = scan_gallery_dir(&gallery).unwrap();
        assert!(result.cover_path.is_some());
        // Cover should be 1.jpg (first in natural sort)
        assert!(result.cover_path.unwrap().ends_with("1.jpg"));
    }
}
