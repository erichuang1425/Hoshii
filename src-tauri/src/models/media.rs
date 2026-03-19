use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq, Eq)]
#[serde(rename_all = "snake_case")]
pub enum MediaType {
    Image,
    AnimatedImage,
    Video,
    AvifStatic,
    AvifAnimated,
}

impl MediaType {
    pub fn from_str_value(s: &str) -> Self {
        match s {
            "image" => Self::Image,
            "animated_image" => Self::AnimatedImage,
            "video" => Self::Video,
            "avif_static" => Self::AvifStatic,
            "avif_animated" => Self::AvifAnimated,
            _ => Self::Image,
        }
    }

    pub fn as_str(&self) -> &'static str {
        match self {
            Self::Image => "image",
            Self::AnimatedImage => "animated_image",
            Self::Video => "video",
            Self::AvifStatic => "avif_static",
            Self::AvifAnimated => "avif_animated",
        }
    }
}

/// A single media file within a gallery.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaEntry {
    pub id: i64,
    pub gallery_id: i64,
    pub filename: String,
    pub path: String,
    pub relative_path: String,
    pub sort_order: i64,
    pub group_name: String,
    pub media_type: MediaType,
    pub width: Option<i32>,
    pub height: Option<i32>,
    pub file_size: Option<i64>,
    pub duration_ms: Option<i64>,
    pub is_animated: bool,
    pub mtime: Option<i64>,
}

/// A prefix group extracted from natural sort grouping.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct MediaGroup {
    pub name: String,
    pub start_index: usize,
    pub count: usize,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "snake_case")]
pub enum ReadingMode {
    Single,
    VerticalScroll,
    DoublePage,
    ThumbnailGrid,
}

/// An unorganized file sitting directly in an artist folder.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct UnorganizedFile {
    pub id: i64,
    pub artist_id: i64,
    pub filename: String,
    pub path: String,
    pub media_type: Option<MediaType>,
    pub file_size: Option<i64>,
}

/// A tag for categorizing galleries.
#[derive(Debug, Clone, Serialize, Deserialize)]
#[serde(rename_all = "camelCase")]
pub struct Tag {
    pub id: i64,
    pub name: String,
    #[serde(skip_serializing_if = "Option::is_none")]
    pub gallery_count: Option<i64>,
}
