use std::cmp::Ordering;

/// A parsed filename split into prefix group, numeric value, and remaining suffix.
#[derive(Debug, Clone)]
pub struct NaturalSortKey {
    /// The prefix before the last numeric sequence (lowercased for grouping).
    /// E.g., "lucy" from "Lucy10.jpg", "" from "10.jpg", "page_" from "page_001.jpg"
    pub group: String,
    /// The last numeric value found before the extension, or 0 if none.
    pub number: u64,
    /// The full lowercased filename for stable tiebreaking.
    pub lower_filename: String,
}

/// Extract the group name and number from a filename (without directory path).
///
/// Group extraction rules (from NATURAL_SORT_TEXT.md):
/// - `1.jpg` → group "", number 1
/// - `lucy1.jpg` → group "lucy", number 1
/// - `lucy_02.jpg` → group "lucy_", number 2
/// - `page_001.jpg` → group "page_", number 1
/// - `IMG_20240301_001.jpg` → group "IMG_20240301_", number 1
/// - `image (3).jpg` → group "image ", number 3
/// - `cover.jpg` → group "cover", number 0
/// - `日本語5.png` → group "日本語", number 5
/// - `Lucy10.jpg` → group "lucy" (lowercased), number 10
/// - `char-a-3.png` → group "char-a-", number 3
/// - `pic2_final.jpg` → group "pic", number 2
pub fn extract_sort_key(filename: &str) -> NaturalSortKey {
    // Strip extension
    let stem = match filename.rfind('.') {
        Some(pos) if pos > 0 => &filename[..pos],
        _ => filename,
    };

    // Handle parenthetical pattern: "name (N)" or "name(N)"
    // Check if stem ends with (digits)
    let (effective_stem, paren_num) = extract_parenthetical_number(stem);

    if let Some(num) = paren_num {
        let group = effective_stem.trim_end();
        return NaturalSortKey {
            group: group.to_lowercase(),
            number: num,
            lower_filename: filename.to_lowercase(),
        };
    }

    // Find the FIRST digit sequence in the stem.
    // This correctly handles both:
    //   "pic2_final" → group "pic", number 2
    //   "IMG_20240301_001" → group "img_", number 20240301 (sorts correctly via tiebreaker)
    let chars: Vec<char> = stem.chars().collect();

    let mut first_num_start = None;
    let mut first_num_end = None;

    for (idx, ch) in chars.iter().enumerate() {
        if ch.is_ascii_digit() {
            if first_num_start.is_none() {
                first_num_start = Some(idx);
            }
            first_num_end = Some(idx + 1);
        } else if first_num_start.is_some() {
            // End of first digit sequence
            break;
        }
    }

    match (first_num_start, first_num_end) {
        (Some(start), Some(end)) => {
            let prefix: String = chars[..start].iter().collect();
            let num_str: String = chars[start..end].iter().collect();
            let number = num_str.parse::<u64>().unwrap_or(0);

            NaturalSortKey {
                group: prefix.to_lowercase(),
                number,
                lower_filename: filename.to_lowercase(),
            }
        }
        _ => {
            // No digits found at all — alphabetical only
            NaturalSortKey {
                group: stem.to_lowercase(),
                number: 0,
                lower_filename: filename.to_lowercase(),
            }
        }
    }
}

/// Check for parenthetical number pattern like "image (3)" or "image(10)".
/// Returns (stem_without_parens, Some(number)) if matched, or (original, None) if not.
fn extract_parenthetical_number(stem: &str) -> (&str, Option<u64>) {
    let trimmed = stem.trim_end();
    if !trimmed.ends_with(')') {
        return (stem, None);
    }
    if let Some(open) = trimmed.rfind('(') {
        let inside = &trimmed[open + 1..trimmed.len() - 1];
        if let Ok(num) = inside.trim().parse::<u64>() {
            let before = &trimmed[..open];
            return (before, Some(num));
        }
    }
    (stem, None)
}

/// Sort a list of filenames using natural sort order.
///
/// Rules:
/// - Case-insensitive prefix comparison
/// - Numeric comparison for embedded numbers
/// - Stable sort (preserves original order for equal elements)
pub fn natural_sort(filenames: &mut [String]) {
    filenames.sort_by(|a, b| compare_natural(a, b));
}

/// Compare two filenames in natural sort order.
pub fn compare_natural(a: &str, b: &str) -> Ordering {
    let key_a = extract_sort_key(a);
    let key_b = extract_sort_key(b);

    // First: compare by group (case-insensitive)
    match key_a.group.cmp(&key_b.group) {
        Ordering::Equal => {}
        ord => return ord,
    }

    // Second: compare by number
    match key_a.number.cmp(&key_b.number) {
        Ordering::Equal => {}
        ord => return ord,
    }

    // Third: tiebreak by full lowercase filename
    key_a.lower_filename.cmp(&key_b.lower_filename)
}

/// Extract media groups from a sorted list of filenames.
///
/// Returns groups with their name, start index, and count.
/// Groups are ordered by their first appearance in the sorted list.
pub fn extract_groups(sorted_filenames: &[String]) -> Vec<(String, usize, usize)> {
    if sorted_filenames.is_empty() {
        return Vec::new();
    }

    let mut groups: Vec<(String, usize, usize)> = Vec::new();

    for (i, filename) in sorted_filenames.iter().enumerate() {
        let key = extract_sort_key(filename);
        if let Some(last) = groups.last_mut() {
            if last.0 == key.group {
                last.2 += 1;
                continue;
            }
        }
        groups.push((key.group, i, 1));
    }

    groups
}

#[cfg(test)]
mod tests {
    use super::*;

    // ═══════════ Sort Order Tests ═══════════

    #[test]
    fn test_basic_numeric() {
        let mut input = vec![
            "10.jpg".into(), "1.jpg".into(), "2.jpg".into(),
            "20.jpg".into(), "3.jpg".into(),
        ];
        natural_sort(&mut input);
        assert_eq!(input, vec!["1.jpg", "2.jpg", "3.jpg", "10.jpg", "20.jpg"]);
    }

    #[test]
    fn test_zero_padded() {
        let mut input = vec![
            "page_010.jpg".into(), "page_001.jpg".into(),
            "page_100.jpg".into(), "page_002.jpg".into(),
        ];
        natural_sort(&mut input);
        assert_eq!(input, vec![
            "page_001.jpg", "page_002.jpg", "page_010.jpg", "page_100.jpg"
        ]);
    }

    #[test]
    fn test_prefixed_with_number() {
        let mut input = vec![
            "lucy2.jpg".into(), "eva1.jpg".into(), "lucy1.jpg".into(),
            "eva2.jpg".into(), "lucy10.jpg".into(),
        ];
        natural_sort(&mut input);
        assert_eq!(input, vec![
            "eva1.jpg", "eva2.jpg", "lucy1.jpg", "lucy2.jpg", "lucy10.jpg"
        ]);
    }

    #[test]
    fn test_mixed_media_types() {
        let mut input = vec![
            "3.gif".into(), "1.jpg".into(), "2.mp4".into(), "4.avif".into(),
        ];
        natural_sort(&mut input);
        assert_eq!(input, vec!["1.jpg", "2.mp4", "3.gif", "4.avif"]);
    }

    #[test]
    fn test_camera_naming() {
        let mut input = vec![
            "IMG_20240301_003.jpg".into(),
            "IMG_20240301_001.jpg".into(),
            "IMG_20240301_002.jpg".into(),
        ];
        natural_sort(&mut input);
        assert_eq!(input, vec![
            "IMG_20240301_001.jpg", "IMG_20240301_002.jpg", "IMG_20240301_003.jpg"
        ]);
    }

    #[test]
    fn test_mixed_case() {
        let mut input = vec![
            "Lucy2.jpg".into(), "lucy1.jpg".into(), "LUCY3.png".into(),
        ];
        natural_sort(&mut input);
        assert_eq!(input, vec!["lucy1.jpg", "Lucy2.jpg", "LUCY3.png"]);
    }

    #[test]
    fn test_download_duplicates_parenthetical() {
        let mut input = vec![
            "image (2).jpg".into(), "image (1).jpg".into(),
            "image (10).jpg".into(), "image.jpg".into(),
        ];
        natural_sort(&mut input);
        assert_eq!(input, vec![
            "image.jpg", "image (1).jpg", "image (2).jpg", "image (10).jpg"
        ]);
    }

    #[test]
    fn test_unicode_prefixes() {
        let mut input = vec![
            "日本語2.jpg".into(), "日本語1.jpg".into(), "日本語10.jpg".into(),
        ];
        natural_sort(&mut input);
        assert_eq!(input, vec!["日本語1.jpg", "日本語2.jpg", "日本語10.jpg"]);
    }

    #[test]
    fn test_no_numbers_alphabetical() {
        let mut input = vec![
            "cover.jpg".into(), "back.jpg".into(), "art.png".into(),
        ];
        natural_sort(&mut input);
        assert_eq!(input, vec!["art.png", "back.jpg", "cover.jpg"]);
    }

    #[test]
    fn test_suffix_after_number() {
        let mut input = vec![
            "pic3_final.jpg".into(), "pic1_draft.jpg".into(), "pic2_v2.jpg".into(),
        ];
        natural_sort(&mut input);
        assert_eq!(input, vec![
            "pic1_draft.jpg", "pic2_v2.jpg", "pic3_final.jpg"
        ]);
    }

    #[test]
    fn test_mixed_grouped_ungrouped() {
        let mut input = vec![
            "1.jpg".into(), "2.jpg".into(), "lucy1.jpg".into(),
            "lucy2.jpg".into(), "3.jpg".into(),
        ];
        natural_sort(&mut input);
        assert_eq!(input, vec![
            "1.jpg", "2.jpg", "3.jpg", "lucy1.jpg", "lucy2.jpg"
        ]);
    }

    #[test]
    fn test_hyphenated_prefix() {
        let mut input = vec![
            "char-b-1.png".into(), "char-a-2.png".into(),
            "char-a-1.png".into(), "char-b-2.png".into(),
        ];
        natural_sort(&mut input);
        assert_eq!(input, vec![
            "char-a-1.png", "char-a-2.png", "char-b-1.png", "char-b-2.png"
        ]);
    }

    #[test]
    fn test_single_file() {
        let mut input = vec!["cover.jpg".into()];
        natural_sort(&mut input);
        assert_eq!(input, vec!["cover.jpg"]);
    }

    #[test]
    fn test_empty() {
        let mut input: Vec<String> = vec![];
        natural_sort(&mut input);
        assert!(input.is_empty());
    }

    // ═══════════ Group Extraction Tests ═══════════

    #[test]
    fn test_group_extraction() {
        let cases = vec![
            ("1.jpg", "", 1),
            ("10.jpg", "", 10),
            ("lucy1.jpg", "lucy", 1),
            ("lucy_02.jpg", "lucy_", 2),
            ("page_001.jpg", "page_", 1),
            ("IMG_20240301_001.jpg", "img_", 20240301),
            ("image (3).jpg", "image", 3),
            ("cover.jpg", "cover", 0),
            ("日本語5.png", "日本語", 5),
            ("Lucy10.jpg", "lucy", 10),
            ("char-a-3.png", "char-a-", 3),
            ("pic2_final.jpg", "pic", 2),
        ];

        for (filename, expected_group, expected_number) in cases {
            let key = extract_sort_key(filename);
            assert_eq!(
                key.group, expected_group,
                "Group mismatch for '{}': expected '{}', got '{}'",
                filename, expected_group, key.group
            );
            assert_eq!(
                key.number, expected_number,
                "Number mismatch for '{}': expected {}, got {}",
                filename, expected_number, key.number
            );
        }
    }

    // ═══════════ Group Extraction from Sorted List ═══════════

    #[test]
    fn test_extract_groups_mixed() {
        let mut files = vec![
            "1.jpg".into(), "2.jpg".into(), "lucy1.jpg".into(),
            "lucy2.jpg".into(), "3.jpg".into(),
        ];
        natural_sort(&mut files);
        let groups = extract_groups(&files);
        assert_eq!(groups.len(), 2);
        assert_eq!(groups[0].0, ""); // ungrouped: 1, 2, 3
        assert_eq!(groups[0].2, 3);
        assert_eq!(groups[1].0, "lucy");
        assert_eq!(groups[1].2, 2);
    }

    #[test]
    fn test_extract_groups_unicode() {
        let mut files = vec![
            "日本語2.jpg".into(), "日本語1.jpg".into(), "日本語10.jpg".into(),
        ];
        natural_sort(&mut files);
        let groups = extract_groups(&files);
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].0, "日本語");
        assert_eq!(groups[0].2, 3);
    }

    #[test]
    fn test_extract_groups_empty() {
        let files: Vec<String> = vec![];
        let groups = extract_groups(&files);
        assert!(groups.is_empty());
    }
}
