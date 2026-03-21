use serde::{Deserialize, Serialize};

/// A gallery entry with a parsed date for chronological ordering.
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct ChronologicalGroup {
    /// ISO 8601 date string (YYYY-MM-DD, YYYY-MM, or YYYY).
    pub date: String,
    pub gallery_id: i64,
    pub gallery_name: String,
}

/// Parse a date from a gallery folder name.
/// Tries multiple common patterns, returns the first match.
///
/// Supported patterns:
/// - YYYY-MM-DD (e.g., "2024-01-15 Photo Set")
/// - YYYY/MM/DD
/// - YYYY.MM.DD
/// - YYYYMMDD (e.g., "20240115_collection")
/// - YYYY-MM (e.g., "2024-01")
/// - YYYY_MM
/// - YYYY.MM
/// - "Jan 2024", "January 2024", "2024 Jan", "2024 January"
/// - YYYY (year only, e.g., "My Series 2024")
pub fn parse_date_from_name(name: &str) -> Option<String> {
    // Try YYYY-MM-DD variants first (most specific)
    if let Some(d) = try_ymd_separated(name, '-') { return Some(d); }
    if let Some(d) = try_ymd_separated(name, '/') { return Some(d); }
    if let Some(d) = try_ymd_separated(name, '.') { return Some(d); }

    // YYYYMMDD (8 digit run)
    if let Some(d) = try_yyyymmdd_compact(name) { return Some(d); }

    // YYYY-MM / YYYY_MM / YYYY.MM variants
    if let Some(d) = try_ym_separated(name, '-') { return Some(d); }
    if let Some(d) = try_ym_separated(name, '_') { return Some(d); }
    if let Some(d) = try_ym_separated(name, '.') { return Some(d); }

    // Month name patterns
    if let Some(d) = try_month_name(name) { return Some(d); }

    // Year only (4-digit year between 1900 and 2100)
    if let Some(d) = try_year_only(name) { return Some(d); }

    None
}

fn try_ymd_separated(name: &str, sep: char) -> Option<String> {
    // Look for YYYY{sep}MM{sep}DD
    let chars: Vec<char> = name.chars().collect();
    let n = chars.len();
    if n < 10 { return None; }

    for i in 0..=(n - 10) {
        if is_digit_seq(&chars[i..i+4])
            && chars[i+4] == sep
            && is_digit_seq(&chars[i+5..i+7])
            && chars[i+7] == sep
            && is_digit_seq(&chars[i+8..i+10])
        {
            let y: u32 = chars_to_u32(&chars[i..i+4]);
            let m: u32 = chars_to_u32(&chars[i+5..i+7]);
            let d: u32 = chars_to_u32(&chars[i+8..i+10]);
            if is_valid_ymd(y, m, d) {
                return Some(format!("{:04}-{:02}-{:02}", y, m, d));
            }
        }
    }
    None
}

fn try_yyyymmdd_compact(name: &str) -> Option<String> {
    let chars: Vec<char> = name.chars().collect();
    let n = chars.len();
    if n < 8 { return None; }

    for i in 0..=(n - 8) {
        // Check boundary: character before must not be digit
        if i > 0 && chars[i-1].is_ascii_digit() { continue; }
        // Character after must not be digit
        if i + 8 < n && chars[i+8].is_ascii_digit() { continue; }

        if is_digit_seq(&chars[i..i+8]) {
            let y: u32 = chars_to_u32(&chars[i..i+4]);
            let m: u32 = chars_to_u32(&chars[i+4..i+6]);
            let d: u32 = chars_to_u32(&chars[i+6..i+8]);
            if is_valid_ymd(y, m, d) {
                return Some(format!("{:04}-{:02}-{:02}", y, m, d));
            }
        }
    }
    None
}

fn try_ym_separated(name: &str, sep: char) -> Option<String> {
    let chars: Vec<char> = name.chars().collect();
    let n = chars.len();
    if n < 7 { return None; }

    for i in 0..=(n - 7) {
        if is_digit_seq(&chars[i..i+4])
            && chars[i+4] == sep
            && is_digit_seq(&chars[i+5..i+7])
        {
            // Ensure not followed by another sep+digit (would be YMD)
            if i + 7 < n && chars[i+7] == sep {
                continue;
            }
            let y: u32 = chars_to_u32(&chars[i..i+4]);
            let m: u32 = chars_to_u32(&chars[i+5..i+7]);
            if y >= 1900 && y <= 2100 && m >= 1 && m <= 12 {
                return Some(format!("{:04}-{:02}", y, m));
            }
        }
    }
    None
}

fn try_month_name(name: &str) -> Option<String> {
    let lower = name.to_lowercase();
    let months = [
        ("january", 1), ("february", 2), ("march", 3), ("april", 4),
        ("may", 5), ("june", 6), ("july", 7), ("august", 8),
        ("september", 9), ("october", 10), ("november", 11), ("december", 12),
        ("jan", 1), ("feb", 2), ("mar", 3), ("apr", 4),
        ("jun", 6), ("jul", 7), ("aug", 8), ("sep", 9),
        ("oct", 10), ("nov", 11), ("dec", 12),
    ];

    for (month_str, month_num) in &months {
        if let Some(pos) = lower.find(month_str) {
            // Try to find a 4-digit year near the month name
            if let Some(year) = find_nearby_year(&lower, pos, month_str.len()) {
                return Some(format!("{:04}-{:02}", year, month_num));
            }
        }
    }
    None
}

fn find_nearby_year(s: &str, month_pos: usize, month_len: usize) -> Option<u32> {
    // Look for a 4-digit year before or after the month name
    let before = &s[..month_pos];
    let after = &s[month_pos + month_len..];

    // Check after first
    let after_trimmed = after.trim_start_matches(|c: char| !c.is_ascii_digit());
    if after_trimmed.len() >= 4 {
        let year_str: String = after_trimmed.chars().take(4).collect();
        if year_str.chars().all(|c| c.is_ascii_digit()) {
            let y: u32 = year_str.parse().ok()?;
            if y >= 1900 && y <= 2100 {
                return Some(y);
            }
        }
    }

    // Check before
    let before_trimmed = before.trim_end_matches(|c: char| !c.is_ascii_digit());
    if before_trimmed.len() >= 4 {
        let start = before_trimmed.len() - 4;
        let year_str = &before_trimmed[start..];
        if year_str.chars().all(|c| c.is_ascii_digit()) {
            let y: u32 = year_str.parse().ok()?;
            if y >= 1900 && y <= 2100 {
                return Some(y);
            }
        }
    }

    None
}

fn try_year_only(name: &str) -> Option<String> {
    let chars: Vec<char> = name.chars().collect();
    let n = chars.len();
    if n < 4 { return None; }

    for i in 0..=(n - 4) {
        if i > 0 && chars[i-1].is_ascii_digit() { continue; }
        if i + 4 < n && chars[i+4].is_ascii_digit() { continue; }
        if is_digit_seq(&chars[i..i+4]) {
            let y: u32 = chars_to_u32(&chars[i..i+4]);
            if y >= 1900 && y <= 2100 {
                return Some(format!("{:04}", y));
            }
        }
    }
    None
}

fn is_digit_seq(chars: &[char]) -> bool {
    chars.iter().all(|c| c.is_ascii_digit())
}

fn chars_to_u32(chars: &[char]) -> u32 {
    chars.iter().fold(0u32, |acc, &c| acc * 10 + (c as u32 - '0' as u32))
}

fn is_valid_ymd(y: u32, m: u32, d: u32) -> bool {
    y >= 1900 && y <= 2100
        && m >= 1 && m <= 12
        && d >= 1 && d <= 31
}

/// Sort galleries chronologically and return ChronologicalGroup entries.
/// Galleries without a parseable date are excluded.
pub fn build_chronological_groups(galleries: &[(i64, String)]) -> Vec<ChronologicalGroup> {
    let mut result: Vec<ChronologicalGroup> = galleries
        .iter()
        .filter_map(|(id, name)| {
            parse_date_from_name(name).map(|date| ChronologicalGroup {
                date,
                gallery_id: *id,
                gallery_name: name.clone(),
            })
        })
        .collect();

    result.sort_by(|a, b| a.date.cmp(&b.date).then(a.gallery_name.cmp(&b.gallery_name)));
    result
}

/// Parse a date from an image filename (for timeline navigation).
/// Handles patterns like:
/// - IMG_20240115_001.jpg → 2024-01-15
/// - 2024-01-15_photo.jpg → 2024-01-15
/// - 20240115123059.jpg (YYYYMMDDHHMMSS) → 2024-01-15
pub fn parse_date_from_filename(filename: &str) -> Option<String> {
    // Strip extension
    let stem = std::path::Path::new(filename)
        .file_stem()
        .and_then(|s| s.to_str())
        .unwrap_or(filename);

    // Try YMD patterns first
    if let Some(d) = try_ymd_separated(stem, '-') { return Some(d); }
    if let Some(d) = try_ymd_separated(stem, '_') { return Some(d); }
    if let Some(d) = try_ymd_separated(stem, '.') { return Some(d); }

    // YYYYMMDD compact (also covers YYYYMMDDHHMMSS)
    if let Some(d) = try_yyyymmdd_compact(stem) { return Some(d); }

    // Fall back to name-level date parsing
    parse_date_from_name(stem)
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_parse_ymd_hyphen() {
        assert_eq!(parse_date_from_name("2024-01-15 Photo Set"), Some("2024-01-15".to_string()));
        assert_eq!(parse_date_from_name("Collection 2023-06-30"), Some("2023-06-30".to_string()));
    }

    #[test]
    fn test_parse_yyyymmdd_compact() {
        assert_eq!(parse_date_from_name("IMG_20240115_001"), Some("2024-01-15".to_string()));
        assert_eq!(parse_date_from_name("20231225_xmas"), Some("2023-12-25".to_string()));
    }

    #[test]
    fn test_parse_year_month() {
        assert_eq!(parse_date_from_name("Photos 2024-03"), Some("2024-03".to_string()));
        assert_eq!(parse_date_from_name("2023_12_collection"), Some("2023-12".to_string()));
    }

    #[test]
    fn test_parse_month_name() {
        assert_eq!(parse_date_from_name("January 2024"), Some("2024-01".to_string()));
        assert_eq!(parse_date_from_name("2023 December set"), Some("2023-12".to_string()));
        assert_eq!(parse_date_from_name("Jan 2024 photos"), Some("2024-01".to_string()));
    }

    #[test]
    fn test_parse_year_only() {
        assert_eq!(parse_date_from_name("My Series 2024"), Some("2024".to_string()));
        assert_eq!(parse_date_from_name("2023 Collection"), Some("2023".to_string()));
    }

    #[test]
    fn test_parse_no_date() {
        assert_eq!(parse_date_from_name("Random Gallery Name"), None);
        assert_eq!(parse_date_from_name("Chapter One"), None);
    }

    #[test]
    fn test_parse_filename_date() {
        assert_eq!(parse_date_from_filename("IMG_20240115_001.jpg"), Some("2024-01-15".to_string()));
        assert_eq!(parse_date_from_filename("2024-03-22_photo.jpg"), Some("2024-03-22".to_string()));
        assert_eq!(parse_date_from_filename("random_file.jpg"), None);
    }

    #[test]
    fn test_build_chronological_groups() {
        let galleries = vec![
            (1, "Photos 2024-03".to_string()),
            (2, "Photos 2023-12".to_string()),
            (3, "Random Gallery".to_string()),
            (4, "Photos 2024-01-15".to_string()),
        ];
        let groups = build_chronological_groups(&galleries);
        assert_eq!(groups.len(), 3);
        assert_eq!(groups[0].gallery_id, 2); // 2023-12 first
        assert_eq!(groups[1].gallery_id, 4); // 2024-01-15 second
        assert_eq!(groups[2].gallery_id, 1); // 2024-03 third
    }
}
