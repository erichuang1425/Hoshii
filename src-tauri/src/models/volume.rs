use serde::{Deserialize, Serialize};

/// A mounted filesystem volume (typically an external drive).
/// Identified by UUID which is stable across reconnects.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Volume {
    pub id: i64,
    pub uuid: String,
    pub label: Option<String>,
    pub mount_path: Option<String>,
    pub is_online: bool,
    pub is_removable: bool,
    pub total_bytes: Option<i64>,
    pub last_seen: Option<String>,
}

/// Runtime volume info detected from the OS (before DB persistence).
#[derive(Debug, Clone)]
pub struct VolumeInfo {
    pub uuid: String,
    pub mount_path: std::path::PathBuf,
    pub label: Option<String>,
    pub total_bytes: u64,
    pub free_bytes: u64,
    pub is_removable: bool,
}
