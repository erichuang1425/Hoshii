use crate::models::MediaType;

pub const IMAGE_EXTS: &[&str] = &["jpg", "jpeg", "png", "webp", "bmp", "tiff", "tif"];
pub const ANIMATED_IMAGE_EXTS: &[&str] = &["gif", "apng"];
pub const VIDEO_EXTS: &[&str] = &["mp4", "webm", "mkv", "avi", "mov", "wmv", "flv", "m4v"];
pub const AVIF_EXTS: &[&str] = &["avif"];

pub const BROWSER_NATIVE_VIDEO: &[&str] = &["mp4", "webm"];
pub const NEEDS_REMUX_VIDEO: &[&str] = &["mkv", "avi", "mov", "wmv", "flv"];

/// Return all recognized media file extensions.
pub fn all_media_extensions() -> Vec<&'static str> {
    let mut all = Vec::new();
    all.extend_from_slice(IMAGE_EXTS);
    all.extend_from_slice(ANIMATED_IMAGE_EXTS);
    all.extend_from_slice(VIDEO_EXTS);
    all.extend_from_slice(AVIF_EXTS);
    all
}

/// Check if a filename has a recognized media extension.
pub fn is_media_file(filename: &str) -> bool {
    let ext = filename.rsplit('.').next().unwrap_or("").to_lowercase();
    all_media_extensions().contains(&ext.as_str())
}

/// Classify a file extension into a MediaType.
///
/// Note: AVIF files are initially classified as `AvifStatic`. The caller must
/// inspect the AVIF container (ftyp box) to distinguish animated AVIF later.
pub fn classify_extension(ext: &str) -> Option<MediaType> {
    let ext = ext.to_lowercase();
    let ext = ext.as_str();
    if IMAGE_EXTS.contains(&ext) {
        return Some(MediaType::Image);
    }
    if ANIMATED_IMAGE_EXTS.contains(&ext) {
        return Some(MediaType::AnimatedImage);
    }
    if VIDEO_EXTS.contains(&ext) {
        return Some(MediaType::Video);
    }
    if AVIF_EXTS.contains(&ext) {
        return Some(MediaType::AvifStatic); // refined later by container inspection
    }
    None
}

/// Classify a full filename into a MediaType by extracting its extension.
pub fn classify_filename(filename: &str) -> Option<MediaType> {
    let ext = filename.rsplit('.').next().unwrap_or("");
    classify_extension(ext)
}

/// Check if a video file needs remuxing (non-browser-native format).
pub fn needs_remux(ext: &str) -> bool {
    let ext = ext.to_lowercase();
    NEEDS_REMUX_VIDEO.contains(&ext.as_str())
}

/// Check if a media type is animated (GIF, APNG, animated AVIF).
pub fn is_animated_type(media_type: &MediaType) -> bool {
    matches!(media_type, MediaType::AnimatedImage | MediaType::AvifAnimated)
}

/// Check if a media type is a video.
pub fn is_video_type(media_type: &MediaType) -> bool {
    matches!(media_type, MediaType::Video)
}

/// Check if a media type is a static image.
pub fn is_static_image_type(media_type: &MediaType) -> bool {
    matches!(media_type, MediaType::Image | MediaType::AvifStatic)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_is_media_file() {
        assert!(is_media_file("photo.jpg"));
        assert!(is_media_file("photo.JPEG"));
        assert!(is_media_file("video.mp4"));
        assert!(is_media_file("anim.gif"));
        assert!(is_media_file("image.avif"));
        assert!(is_media_file("test.PNG"));
        assert!(is_media_file("test.webp"));
        assert!(is_media_file("test.mkv"));
        assert!(!is_media_file("readme.txt"));
        assert!(!is_media_file("archive.zip"));
        assert!(!is_media_file("noextension"));
        assert!(!is_media_file("document.pdf"));
    }

    #[test]
    fn test_classify_extension() {
        assert_eq!(classify_extension("jpg"), Some(MediaType::Image));
        assert_eq!(classify_extension("JPEG"), Some(MediaType::Image));
        assert_eq!(classify_extension("png"), Some(MediaType::Image));
        assert_eq!(classify_extension("webp"), Some(MediaType::Image));
        assert_eq!(classify_extension("bmp"), Some(MediaType::Image));
        assert_eq!(classify_extension("tiff"), Some(MediaType::Image));
        assert_eq!(classify_extension("tif"), Some(MediaType::Image));

        assert_eq!(classify_extension("gif"), Some(MediaType::AnimatedImage));
        assert_eq!(classify_extension("apng"), Some(MediaType::AnimatedImage));

        assert_eq!(classify_extension("mp4"), Some(MediaType::Video));
        assert_eq!(classify_extension("webm"), Some(MediaType::Video));
        assert_eq!(classify_extension("mkv"), Some(MediaType::Video));
        assert_eq!(classify_extension("avi"), Some(MediaType::Video));
        assert_eq!(classify_extension("mov"), Some(MediaType::Video));
        assert_eq!(classify_extension("wmv"), Some(MediaType::Video));
        assert_eq!(classify_extension("flv"), Some(MediaType::Video));
        assert_eq!(classify_extension("m4v"), Some(MediaType::Video));

        assert_eq!(classify_extension("avif"), Some(MediaType::AvifStatic));

        assert_eq!(classify_extension("txt"), None);
        assert_eq!(classify_extension("zip"), None);
    }

    #[test]
    fn test_classify_filename() {
        assert_eq!(classify_filename("photo.jpg"), Some(MediaType::Image));
        assert_eq!(classify_filename("video.MP4"), Some(MediaType::Video));
        assert_eq!(classify_filename("anim.gif"), Some(MediaType::AnimatedImage));
        assert_eq!(classify_filename("noext"), None);
    }

    #[test]
    fn test_needs_remux() {
        assert!(needs_remux("mkv"));
        assert!(needs_remux("MKV"));
        assert!(needs_remux("avi"));
        assert!(needs_remux("mov"));
        assert!(needs_remux("wmv"));
        assert!(needs_remux("flv"));
        assert!(!needs_remux("mp4"));
        assert!(!needs_remux("webm"));
    }

    #[test]
    fn test_type_checks() {
        assert!(is_static_image_type(&MediaType::Image));
        assert!(is_static_image_type(&MediaType::AvifStatic));
        assert!(!is_static_image_type(&MediaType::Video));

        assert!(is_video_type(&MediaType::Video));
        assert!(!is_video_type(&MediaType::Image));

        assert!(is_animated_type(&MediaType::AnimatedImage));
        assert!(is_animated_type(&MediaType::AvifAnimated));
        assert!(!is_animated_type(&MediaType::Image));
    }

    #[test]
    fn test_all_media_extensions_count() {
        let all = all_media_extensions();
        // 7 image + 2 animated + 8 video + 1 avif = 18
        assert_eq!(all.len(), 18);
    }
}
