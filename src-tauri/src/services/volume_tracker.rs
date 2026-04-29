use std::path::PathBuf;

use anyhow::{Context, Result};

use crate::models::VolumeInfo;

/// Detect all currently mounted volumes on the system.
/// Returns a list of VolumeInfo with UUID, mount path, label, and capacity.
pub fn detect_mounted_volumes() -> Result<Vec<VolumeInfo>> {
    log::debug!("Detecting mounted volumes");

    #[cfg(target_os = "linux")]
    let volumes = detect_volumes_linux()?;

    #[cfg(target_os = "macos")]
    let volumes = detect_volumes_macos()?;

    #[cfg(target_os = "windows")]
    let volumes = detect_volumes_windows()?;

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    let volumes: Vec<VolumeInfo> = Vec::new();

    log::info!("Detected {} mounted volumes", volumes.len());
    Ok(volumes)
}

/// Extract the volume UUID for a given mount path.
/// Returns None if the UUID cannot be determined.
pub fn get_volume_uuid(mount_path: &std::path::Path) -> Result<Option<String>> {
    #[cfg(target_os = "linux")]
    return get_uuid_linux(mount_path);

    #[cfg(target_os = "macos")]
    return get_uuid_macos(mount_path);

    #[cfg(target_os = "windows")]
    return get_uuid_windows(mount_path);

    #[cfg(not(any(target_os = "linux", target_os = "macos", target_os = "windows")))]
    {
        let _ = mount_path;
        Ok(None)
    }
}

// ─── Linux implementation ────────────────────────────────────────────────────

#[cfg(target_os = "linux")]
fn detect_volumes_linux() -> Result<Vec<VolumeInfo>> {
    let mut volumes = Vec::new();

    // Read mounted filesystems from /proc/mounts
    let mounts = std::fs::read_to_string("/proc/mounts")
        .context("Failed to read /proc/mounts")?;

    for line in mounts.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() < 3 {
            continue;
        }

        let device = parts[0];
        let mount_point = parts[1];
        let fs_type = parts[2];

        // Skip virtual/system filesystems
        if !device.starts_with("/dev/") {
            continue;
        }
        // Skip common system mounts
        if mount_point == "/" || mount_point == "/boot" || mount_point.starts_with("/boot/") {
            continue;
        }
        // Only include real filesystem types
        if !matches!(fs_type, "ext4" | "ext3" | "ext2" | "xfs" | "btrfs" | "ntfs" | "ntfs3"
            | "vfat" | "exfat" | "fuseblk" | "hfsplus" | "apfs") {
            continue;
        }

        // Unescape octal sequences in mount paths (e.g., \040 for space)
        let mount_point = unescape_mount_path(mount_point);
        let mount_path = PathBuf::from(&mount_point);

        let uuid = get_uuid_for_device_linux(device).unwrap_or_default();
        if uuid.is_empty() {
            log::debug!("Skipping volume at {} — no UUID found", mount_point);
            continue;
        }

        let label = get_label_for_device_linux(device);
        let (total_bytes, free_bytes) = get_disk_space(&mount_path);
        let is_removable = check_removable_linux(device);

        volumes.push(VolumeInfo {
            uuid,
            mount_path,
            label,
            total_bytes,
            free_bytes,
            is_removable,
        });
    }

    Ok(volumes)
}

#[cfg(target_os = "linux")]
fn get_uuid_linux(mount_path: &std::path::Path) -> Result<Option<String>> {
    // First, find the device for this mount path
    let mounts = std::fs::read_to_string("/proc/mounts")
        .context("Failed to read /proc/mounts")?;

    let mount_str = mount_path.to_string_lossy();
    for line in mounts.lines() {
        let parts: Vec<&str> = line.split_whitespace().collect();
        if parts.len() >= 2 {
            let mp = unescape_mount_path(parts[1]);
            if mp == mount_str.as_ref() {
                return Ok(Some(
                    get_uuid_for_device_linux(parts[0]).unwrap_or_default(),
                )).map(|u| if u.as_deref() == Some("") { None } else { u });
            }
        }
    }
    Ok(None)
}

#[cfg(target_os = "linux")]
fn get_uuid_for_device_linux(device: &str) -> Option<String> {
    // Try /dev/disk/by-uuid/ symlinks
    let by_uuid = PathBuf::from("/dev/disk/by-uuid");
    if let Ok(entries) = std::fs::read_dir(&by_uuid) {
        for entry in entries.flatten() {
            if let Ok(target) = std::fs::read_link(entry.path()) {
                let resolved = if target.is_relative() {
                    by_uuid.join(&target)
                } else {
                    target
                };
                // Canonicalize both for comparison
                let resolved_canon = std::fs::canonicalize(&resolved).ok();
                let device_canon = std::fs::canonicalize(device).ok();
                if resolved_canon.is_some() && resolved_canon == device_canon {
                    return entry.file_name().to_str().map(|s| s.to_string());
                }
            }
        }
    }

    // Fallback: try blkid command
    let output = std::process::Command::new("blkid")
        .arg("-s")
        .arg("UUID")
        .arg("-o")
        .arg("value")
        .arg(device)
        .output()
        .ok()?;

    if output.status.success() {
        let uuid = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !uuid.is_empty() {
            return Some(uuid);
        }
    }

    None
}

#[cfg(target_os = "linux")]
fn get_label_for_device_linux(device: &str) -> Option<String> {
    let output = std::process::Command::new("blkid")
        .arg("-s")
        .arg("LABEL")
        .arg("-o")
        .arg("value")
        .arg(device)
        .output()
        .ok()?;

    if output.status.success() {
        let label = String::from_utf8_lossy(&output.stdout).trim().to_string();
        if !label.is_empty() {
            return Some(label);
        }
    }
    None
}

#[cfg(target_os = "linux")]
fn check_removable_linux(device: &str) -> bool {
    // Extract base device name (e.g., /dev/sdb1 → sdb)
    let dev_name = device
        .rsplit('/')
        .next()
        .unwrap_or("")
        .trim_end_matches(|c: char| c.is_ascii_digit());

    if dev_name.is_empty() {
        return false;
    }

    let removable_path = format!("/sys/block/{}/removable", dev_name);
    std::fs::read_to_string(&removable_path)
        .map(|s| s.trim() == "1")
        .unwrap_or(false)
}

/// Unescape octal sequences in /proc/mounts paths (e.g., \040 → space).
#[cfg(target_os = "linux")]
fn unescape_mount_path(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut chars = s.chars();
    while let Some(c) = chars.next() {
        if c == '\\' {
            // Try to read 3 octal digits
            let mut octal = String::new();
            for _ in 0..3 {
                if let Some(&next) = chars.clone().peekable().peek() {
                    if next.is_ascii_digit() {
                        octal.push(chars.next().unwrap_or('0'));
                    } else {
                        break;
                    }
                }
            }
            if octal.len() == 3 {
                if let Ok(byte) = u8::from_str_radix(&octal, 8) {
                    result.push(byte as char);
                    continue;
                }
            }
            result.push('\\');
            result.push_str(&octal);
        } else {
            result.push(c);
        }
    }
    result
}

// ─── macOS implementation ────────────────────────────────────────────────────

#[cfg(target_os = "macos")]
fn detect_volumes_macos() -> Result<Vec<VolumeInfo>> {
    let mut volumes = Vec::new();

    let volumes_dir = PathBuf::from("/Volumes");
    let entries = std::fs::read_dir(&volumes_dir)
        .context("Failed to read /Volumes")?;

    for entry in entries.flatten() {
        let mount_path = entry.path();
        if !mount_path.is_dir() {
            continue;
        }

        let uuid = match get_uuid_macos(&mount_path)? {
            Some(u) => u,
            None => continue,
        };

        let label = mount_path
            .file_name()
            .and_then(|n| n.to_str())
            .map(|s| s.to_string());

        let (total_bytes, free_bytes) = get_disk_space(&mount_path);
        // On macOS, volumes in /Volumes that aren't the system volume are typically removable
        let is_removable = mount_path != PathBuf::from("/Volumes/Macintosh HD");

        volumes.push(VolumeInfo {
            uuid,
            mount_path,
            label,
            total_bytes,
            free_bytes,
            is_removable,
        });
    }

    Ok(volumes)
}

#[cfg(target_os = "macos")]
fn get_uuid_macos(mount_path: &std::path::Path) -> Result<Option<String>> {
    let output = std::process::Command::new("diskutil")
        .arg("info")
        .arg(mount_path.to_string_lossy().as_ref())
        .output()
        .context("Failed to run diskutil")?;

    if !output.status.success() {
        return Ok(None);
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines() {
        let line = line.trim();
        if line.starts_with("Volume UUID:") || line.starts_with("Disk / Partition UUID:") {
            let uuid = line.split(':').nth(1).map(|s| s.trim().to_string());
            if let Some(ref u) = uuid {
                if !u.is_empty() {
                    return Ok(uuid);
                }
            }
        }
    }

    Ok(None)
}

// ─── Windows implementation ──────────────────────────────────────────────────

#[cfg(target_os = "windows")]
fn detect_volumes_windows() -> Result<Vec<VolumeInfo>> {
    let mut volumes = Vec::new();

    // Use WMIC to list logical disks
    let output = std::process::Command::new("wmic")
        .args(["logicaldisk", "get", "DeviceID,VolumeSerialNumber,VolumeName,Size,FreeSpace,DriveType", "/format:csv"])
        .output()
        .context("Failed to run wmic")?;

    if !output.status.success() {
        log::warn!("wmic command failed, trying PowerShell fallback");
        return detect_volumes_windows_powershell();
    }

    let stdout = String::from_utf8_lossy(&output.stdout);
    for line in stdout.lines().skip(1) {
        let fields: Vec<&str> = line.split(',').collect();
        if fields.len() < 7 {
            continue;
        }

        let device_id = fields[1].trim();
        let drive_type = fields[2].trim();
        let free_space = fields[3].trim();
        let _node = fields[0].trim();
        let size = fields[4].trim();
        let volume_name = fields[5].trim();
        let serial = fields[6].trim();

        if serial.is_empty() || device_id.is_empty() {
            continue;
        }

        let mount_path = PathBuf::from(format!("{}\\", device_id));
        let total_bytes: u64 = size.parse().unwrap_or(0);
        let free_bytes: u64 = free_space.parse().unwrap_or(0);
        // DriveType 2 = Removable, 3 = Fixed
        let is_removable = drive_type == "2";

        let label = if volume_name.is_empty() {
            None
        } else {
            Some(volume_name.to_string())
        };

        volumes.push(VolumeInfo {
            uuid: serial.to_string(),
            mount_path,
            label,
            total_bytes,
            free_bytes,
            is_removable,
        });
    }

    Ok(volumes)
}

#[cfg(target_os = "windows")]
fn detect_volumes_windows_powershell() -> Result<Vec<VolumeInfo>> {
    let output = std::process::Command::new("powershell")
        .args(["-NoProfile", "-Command",
            "Get-Volume | Where-Object { $_.DriveLetter } | Select-Object DriveLetter, UniqueId, FileSystemLabel, Size, SizeRemaining, DriveType | ConvertTo-Json"
        ])
        .output()
        .context("Failed to run PowerShell Get-Volume")?;

    if !output.status.success() {
        return Ok(Vec::new());
    }

    // Parse JSON output
    let stdout = String::from_utf8_lossy(&output.stdout);
    let parsed: serde_json::Value = serde_json::from_str(&stdout).unwrap_or_default();

    let mut volumes = Vec::new();
    let items = if parsed.is_array() {
        parsed.as_array().cloned().unwrap_or_default()
    } else {
        vec![parsed]
    };

    for item in items {
        let drive_letter = item["DriveLetter"].as_str().unwrap_or("");
        let unique_id = item["UniqueId"].as_str().unwrap_or("");
        let label = item["FileSystemLabel"].as_str().unwrap_or("");
        let size = item["Size"].as_u64().unwrap_or(0);
        let remaining = item["SizeRemaining"].as_u64().unwrap_or(0);
        let drive_type = item["DriveType"].as_str().unwrap_or("");

        if unique_id.is_empty() || drive_letter.is_empty() {
            continue;
        }

        volumes.push(VolumeInfo {
            uuid: unique_id.to_string(),
            mount_path: PathBuf::from(format!("{}:\\", drive_letter)),
            label: if label.is_empty() { None } else { Some(label.to_string()) },
            total_bytes: size,
            free_bytes: remaining,
            is_removable: drive_type == "Removable",
        });
    }

    Ok(volumes)
}

#[cfg(target_os = "windows")]
fn get_uuid_windows(mount_path: &std::path::Path) -> Result<Option<String>> {
    let drive = mount_path.to_string_lossy();
    let drive_letter = drive.chars().next().unwrap_or('C');

    let output = std::process::Command::new("wmic")
        .args(["logicaldisk", "where", &format!("DeviceID='{drive_letter}:'"),
            "get", "VolumeSerialNumber", "/format:value"])
        .output()
        .context("Failed to run wmic for UUID")?;

    if output.status.success() {
        let stdout = String::from_utf8_lossy(&output.stdout);
        for line in stdout.lines() {
            if let Some(serial) = line.strip_prefix("VolumeSerialNumber=") {
                let serial = serial.trim();
                if !serial.is_empty() {
                    return Ok(Some(serial.to_string()));
                }
            }
        }
    }

    Ok(None)
}

// ─── Cross-platform helpers ──────────────────────────────────────────────────

/// Get total and free bytes for a given mount path using statvfs on Unix
/// or GetDiskFreeSpaceExW on Windows.
fn get_disk_space(path: &std::path::Path) -> (u64, u64) {
    #[cfg(unix)]
    {
        use std::ffi::CString;
        let c_path = match CString::new(path.to_string_lossy().as_bytes()) {
            Ok(p) => p,
            Err(_) => return (0, 0),
        };

        unsafe {
            let mut stat: libc::statvfs = std::mem::zeroed();
            if libc::statvfs(c_path.as_ptr(), &mut stat) == 0 {
                let total = stat.f_blocks as u64 * stat.f_frsize as u64;
                let free = stat.f_bavail as u64 * stat.f_frsize as u64;
                return (total, free);
            }
        }
        (0, 0)
    }

    #[cfg(not(unix))]
    {
        let _ = path;
        (0, 0)
    }
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_detect_mounted_volumes_does_not_panic() {
        // This test validates that the detection code runs without panic.
        // Actual volume results depend on the system.
        let result = detect_mounted_volumes();
        assert!(result.is_ok(), "detect_mounted_volumes should not error: {:?}", result.err());
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn test_unescape_mount_path() {
        assert_eq!(unescape_mount_path("/mnt/My\\040Drive"), "/mnt/My Drive");
        assert_eq!(unescape_mount_path("/mnt/simple"), "/mnt/simple");
        assert_eq!(
            unescape_mount_path("/mnt/a\\040b\\040c"),
            "/mnt/a b c"
        );
    }

    #[cfg(target_os = "linux")]
    #[test]
    fn test_check_removable_linux_format() {
        // Test device name extraction logic (doesn't require actual device)
        let dev = "/dev/sdb1";
        let name = dev
            .rsplit('/')
            .next()
            .unwrap_or("")
            .trim_end_matches(|c: char| c.is_ascii_digit());
        assert_eq!(name, "sdb");
    }

    #[test]
    fn test_volume_info_fields() {
        let info = VolumeInfo {
            uuid: "test-uuid-1234".to_string(),
            mount_path: PathBuf::from("/mnt/test"),
            label: Some("TestDrive".to_string()),
            total_bytes: 1_000_000_000,
            free_bytes: 500_000_000,
            is_removable: true,
        };
        assert_eq!(info.uuid, "test-uuid-1234");
        assert!(info.is_removable);
        assert_eq!(info.label.as_deref(), Some("TestDrive"));
    }
}
