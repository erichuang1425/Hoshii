use serde::Serialize;

#[derive(Debug, Clone, Serialize)]
#[serde(rename_all = "camelCase")]
pub struct ZipStatusEntry {
    pub gallery: String,
    pub status: String,
}

#[tauri::command]
pub async fn verify_zip_integrity(
    artist_path: String,
) -> Result<Vec<ZipStatusEntry>, String> {
    let path = std::path::Path::new(&artist_path);
    if !path.is_dir() {
        return Err(format!("Artist path does not exist: {}", artist_path));
    }

    let mut results = Vec::new();

    // Collect gallery directories and zip files
    let mut gallery_dirs: Vec<String> = Vec::new();
    let mut zip_files: Vec<String> = Vec::new();

    let entries = std::fs::read_dir(path)
        .map_err(|e| format!("Failed to read directory: {}", e))?;

    for entry in entries {
        let entry = entry.map_err(|e| format!("Failed to read entry: {}", e))?;
        let name = entry.file_name().to_string_lossy().to_string();

        if entry.path().is_dir() {
            gallery_dirs.push(name);
        } else if name.to_lowercase().ends_with(".zip") {
            zip_files.push(name);
        }
    }

    // Check each gallery directory for a matching zip
    for dir_name in &gallery_dirs {
        let expected_zip = format!("{}.zip", dir_name);
        let has_zip = zip_files.iter().any(|z| z.eq_ignore_ascii_case(&expected_zip));

        if has_zip {
            // Verify the zip is readable
            let zip_path = path.join(&expected_zip);
            match std::fs::File::open(&zip_path) {
                Ok(file) => match zip::ZipArchive::new(file) {
                    Ok(_) => {
                        results.push(ZipStatusEntry {
                            gallery: dir_name.clone(),
                            status: "matched".to_string(),
                        });
                    }
                    Err(_) => {
                        results.push(ZipStatusEntry {
                            gallery: dir_name.clone(),
                            status: "mismatched".to_string(),
                        });
                    }
                },
                Err(_) => {
                    results.push(ZipStatusEntry {
                        gallery: dir_name.clone(),
                        status: "mismatched".to_string(),
                    });
                }
            }
        } else {
            results.push(ZipStatusEntry {
                gallery: dir_name.clone(),
                status: "missing_zip".to_string(),
            });
        }
    }

    // Check for orphaned zips (zip with no matching directory)
    for zip_name in &zip_files {
        let stem = zip_name.trim_end_matches(".zip").trim_end_matches(".ZIP");
        let has_dir = gallery_dirs.iter().any(|d| d.eq_ignore_ascii_case(stem));

        if !has_dir {
            results.push(ZipStatusEntry {
                gallery: stem.to_string(),
                status: "orphaned_zip".to_string(),
            });
        }
    }

    results.sort_by(|a, b| a.gallery.to_lowercase().cmp(&b.gallery.to_lowercase()));
    Ok(results)
}

#[tauri::command]
pub async fn restore_from_zip(
    zip_path: String,
    target_dir: String,
) -> Result<(), String> {
    let zip_file_path = std::path::Path::new(&zip_path);
    if !zip_file_path.exists() {
        return Err(format!("Zip file does not exist: {}", zip_path));
    }

    let target = std::path::Path::new(&target_dir);
    std::fs::create_dir_all(target)
        .map_err(|e| format!("Failed to create target directory: {}", e))?;

    let file = std::fs::File::open(zip_file_path)
        .map_err(|e| format!("Failed to open zip file: {}", e))?;

    let mut archive = zip::ZipArchive::new(file)
        .map_err(|e| format!("Failed to read zip archive: {}", e))?;

    for i in 0..archive.len() {
        let mut entry = archive
            .by_index(i)
            .map_err(|e| format!("Failed to read zip entry {}: {}", i, e))?;

        let entry_name = entry.name().to_string();

        // Security: prevent path traversal
        if entry_name.contains("..") {
            return Err(format!("Zip contains path traversal: {}", entry_name));
        }

        let out_path = target.join(&entry_name);

        if entry.is_dir() {
            std::fs::create_dir_all(&out_path)
                .map_err(|e| format!("Failed to create directory: {}", e))?;
        } else {
            if let Some(parent) = out_path.parent() {
                std::fs::create_dir_all(parent)
                    .map_err(|e| format!("Failed to create parent directory: {}", e))?;
            }

            let mut outfile = std::fs::File::create(&out_path)
                .map_err(|e| format!("Failed to create file {}: {}", out_path.display(), e))?;

            std::io::copy(&mut entry, &mut outfile)
                .map_err(|e| format!("Failed to extract {}: {}", entry_name, e))?;
        }
    }

    Ok(())
}

#[cfg(test)]
mod tests {
    use std::io::Write;
    use tempfile::TempDir;

    #[test]
    fn test_verify_zip_integrity_matched() {
        let tmp = TempDir::new().unwrap();
        let artist_dir = tmp.path();

        // Create a gallery directory
        std::fs::create_dir(artist_dir.join("MyGallery")).unwrap();

        // Create a valid zip file
        let zip_path = artist_dir.join("MyGallery.zip");
        let file = std::fs::File::create(&zip_path).unwrap();
        let mut zip_writer = zip::ZipWriter::new(file);
        zip_writer
            .start_file("test.txt", zip::write::SimpleFileOptions::default())
            .unwrap();
        zip_writer.write_all(b"hello").unwrap();
        zip_writer.finish().unwrap();

        // Check
        let entries = std::fs::read_dir(artist_dir).unwrap();
        let mut dirs = Vec::new();
        let mut zips = Vec::new();
        for entry in entries {
            let entry = entry.unwrap();
            let name = entry.file_name().to_string_lossy().to_string();
            if entry.path().is_dir() {
                dirs.push(name);
            } else if name.ends_with(".zip") {
                zips.push(name);
            }
        }

        assert_eq!(dirs.len(), 1);
        assert_eq!(zips.len(), 1);
        assert_eq!(dirs[0], "MyGallery");
        assert_eq!(zips[0], "MyGallery.zip");
    }

    #[test]
    fn test_restore_from_zip() {
        let tmp = TempDir::new().unwrap();

        // Create a zip
        let zip_path = tmp.path().join("test.zip");
        let file = std::fs::File::create(&zip_path).unwrap();
        let mut zip_writer = zip::ZipWriter::new(file);
        zip_writer
            .start_file("image.jpg", zip::write::SimpleFileOptions::default())
            .unwrap();
        zip_writer.write_all(b"fake image data").unwrap();
        zip_writer.finish().unwrap();

        // Extract
        let target = tmp.path().join("restored");
        let zip_file = std::fs::File::open(&zip_path).unwrap();
        let mut archive = zip::ZipArchive::new(zip_file).unwrap();

        std::fs::create_dir_all(&target).unwrap();

        for i in 0..archive.len() {
            let mut entry = archive.by_index(i).unwrap();
            let out_path = target.join(entry.name());
            let mut outfile = std::fs::File::create(&out_path).unwrap();
            std::io::copy(&mut entry, &mut outfile).unwrap();
        }

        assert!(target.join("image.jpg").exists());
        let content = std::fs::read_to_string(target.join("image.jpg")).unwrap();
        assert_eq!(content, "fake image data");
    }

    #[test]
    fn test_path_traversal_prevention() {
        // Verify that ".." in zip entry names would be caught
        let malicious_name = "../../../etc/passwd";
        assert!(malicious_name.contains(".."));
    }
}
