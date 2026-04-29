use serde::{Deserialize, Serialize};

/// A user-added root folder on a volume. Contains artist subfolders.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct RootFolder {
    pub id: i64,
    pub volume_id: i64,
    pub path: String,
    pub relative_path: String,
    pub label: Option<String>,
    pub last_scan: Option<String>,
    pub scan_version: i64,
}

/// A direct subfolder of a root folder, representing a content creator.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Artist {
    pub id: i64,
    pub root_id: i64,
    pub name: String,
    pub path: String,
    pub gallery_count: i64,
}

/// A subfolder within an artist directory containing ordered media files.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Gallery {
    pub id: i64,
    pub artist_id: i64,
    pub name: String,
    pub path: String,
    pub page_count: i64,
    pub total_size: i64,
    pub cover_path: Option<String>,
    pub has_backup_zip: bool,
    pub zip_status: ZipStatus,
    pub last_read_page: i64,
    pub last_read_at: Option<String>,
    pub favorited: bool,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ZipStatus {
    Unknown,
    Matched,
    OrphanedZip,
    MissingZip,
    Mismatched,
}

impl ZipStatus {
    pub fn from_str_value(s: &str) -> Self {
        match s {
            "matched" => Self::Matched,
            "orphaned_zip" => Self::OrphanedZip,
            "missing_zip" => Self::MissingZip,
            "mismatched" => Self::Mismatched,
            _ => Self::Unknown,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Unknown => "unknown",
            Self::Matched => "matched",
            Self::OrphanedZip => "orphaned_zip",
            Self::MissingZip => "missing_zip",
            Self::Mismatched => "mismatched",
        }
    }
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum GallerySortOrder {
    NameAsc,
    NameDesc,
    DateAsc,
    DateDesc,
    SizeAsc,
    SizeDesc,
    PagesDesc,
    LastRead,
}
