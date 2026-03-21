use serde::{Deserialize, Serialize};

/// A smart group: galleries that share a common normalized base name
/// (indicating they are likely volumes or chapters of the same series).
#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SmartGroup {
    /// The normalized base name shared by all galleries in this group.
    pub name: String,
    /// Gallery IDs in this group (sorted by normalized name, then original name).
    pub gallery_ids: Vec<i64>,
    /// Original gallery names in the same order as gallery_ids.
    pub gallery_names: Vec<String>,
}

/// Normalize a gallery name for fuzzy grouping:
/// - Lowercase
/// - Trim whitespace
/// - Remove common volume/chapter suffixes: " vol N", " ch N", " ep N", " part N", " v N"
/// - Remove bracketed/parenthesized suffixes: [tag], (tag), {tag}
/// - Remove trailing digits (volume numbers)
/// - Collapse multiple spaces/hyphens/underscores into one
pub fn normalize_name(name: &str) -> String {
    let s = name.to_lowercase();
    let s = s.trim();

    // Remove bracketed content: [anything], (anything), {anything}
    let s = remove_brackets(s);
    let s = s.trim().to_string();

    // Remove common suffixes with numbers (e.g., " vol 1", " ch 2", " part 3", " v2", " ep 5")
    let patterns = [
        r" vol\.?\s*\d+",
        r" volume\.?\s*\d+",
        r" ch\.?\s*\d+",
        r" chapter\.?\s*\d+",
        r" ep\.?\s*\d+",
        r" episode\.?\s*\d+",
        r" part\.?\s*\d+",
        r" v\.?\s*\d+",
        r" #\d+",
    ];

    let mut result = s.clone();
    for pat in &patterns {
        result = remove_pattern(&result, pat);
    }

    // Remove trailing whitespace + digits
    let result = result.trim_end_matches(|c: char| c.is_ascii_digit() || c == '-' || c == '_' || c == ' ');
    let result = result.trim();

    // Collapse multiple separators
    collapse_separators(result)
}

fn remove_brackets(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut depth_round = 0usize;
    let mut depth_square = 0usize;
    let mut depth_curly = 0usize;

    for ch in s.chars() {
        match ch {
            '(' => { depth_round += 1; }
            ')' => { depth_round = depth_round.saturating_sub(1); }
            '[' => { depth_square += 1; }
            ']' => { depth_square = depth_square.saturating_sub(1); }
            '{' => { depth_curly += 1; }
            '}' => { depth_curly = depth_curly.saturating_sub(1); }
            _ if depth_round == 0 && depth_square == 0 && depth_curly == 0 => {
                result.push(ch);
            }
            _ => {}
        }
    }
    result
}

fn remove_pattern(s: &str, pattern: &str) -> String {
    // Simple iterative removal of the pattern (case-insensitive, leftmost match)
    // Since we don't have regex in std, implement a simple suffix removal
    let lower = s.to_lowercase();
    let pat_lower = pattern.trim_start_matches(r" ").to_lowercase();

    // Just do simple keyword removal for known patterns
    let keywords = [
        " vol. ", " vol.", " vol ", " volume ", " ch. ", " ch.", " ch ",
        " chapter ", " ep. ", " ep.", " ep ", " episode ",
        " part ", " v ", " #",
    ];
    let mut result = lower.clone();
    for kw in &keywords {
        if let Some(pos) = result.rfind(kw) {
            // Check if rest is all digits/dots/spaces
            let rest = &result[pos + kw.len()..];
            let rest_trimmed = rest.trim();
            if rest_trimmed.is_empty() || rest_trimmed.chars().all(|c| c.is_ascii_digit() || c == '.') {
                result = result[..pos].to_string();
            }
        }
    }
    // Also handle keyword at end of string without trailing space (e.g., "comic ch.5")
    let end_keywords = [" vol.", " ch.", " ep."];
    for kw in &end_keywords {
        if let Some(pos) = result.rfind(kw) {
            let rest = &result[pos + kw.len()..];
            let rest_trimmed = rest.trim();
            if rest_trimmed.is_empty() || rest_trimmed.chars().all(|c| c.is_ascii_digit() || c == '.') {
                result = result[..pos].to_string();
            }
        }
    }
    let _ = pat_lower; // suppress unused warning
    result
}

fn collapse_separators(s: &str) -> String {
    let mut result = String::with_capacity(s.len());
    let mut prev_sep = false;
    for ch in s.chars() {
        if ch == ' ' || ch == '-' || ch == '_' {
            if !prev_sep {
                result.push(' ');
                prev_sep = true;
            }
        } else {
            result.push(ch);
            prev_sep = false;
        }
    }
    result.trim().to_string()
}

/// Compute the Levenshtein distance between two strings (on bytes for ASCII,
/// character-level for Unicode).
pub fn levenshtein(a: &str, b: &str) -> usize {
    let a: Vec<char> = a.chars().collect();
    let b: Vec<char> = b.chars().collect();
    let m = a.len();
    let n = b.len();

    if m == 0 { return n; }
    if n == 0 { return m; }

    // Use two rows of DP
    let mut prev: Vec<usize> = (0..=n).collect();
    let mut curr = vec![0usize; n + 1];

    for i in 1..=m {
        curr[0] = i;
        for j in 1..=n {
            let cost = if a[i - 1] == b[j - 1] { 0 } else { 1 };
            curr[j] = (curr[j - 1] + 1)
                .min(prev[j] + 1)
                .min(prev[j - 1] + cost);
        }
        std::mem::swap(&mut prev, &mut curr);
    }
    prev[n]
}

/// Group galleries into smart groups based on normalized name similarity.
/// Two galleries are in the same group if their normalized names are identical
/// OR if the Levenshtein distance between their normalized names is ≤ threshold.
///
/// Returns only groups with ≥ 2 galleries (single galleries are excluded).
pub fn compute_smart_groups(
    galleries: &[(i64, String)],
    threshold: usize,
) -> Vec<SmartGroup> {
    if galleries.is_empty() {
        return vec![];
    }

    let normalized: Vec<String> = galleries.iter().map(|(_, name)| normalize_name(name)).collect();

    // Union-find to cluster galleries
    let n = galleries.len();
    let mut parent: Vec<usize> = (0..n).collect();

    fn find(parent: &mut Vec<usize>, x: usize) -> usize {
        if parent[x] != x {
            parent[x] = find(parent, parent[x]);
        }
        parent[x]
    }

    fn union(parent: &mut Vec<usize>, x: usize, y: usize) {
        let px = find(parent, x);
        let py = find(parent, y);
        if px != py {
            parent[px] = py;
        }
    }

    for i in 0..n {
        for j in (i + 1)..n {
            if normalized[i] == normalized[j] {
                union(&mut parent, i, j);
            } else if !normalized[i].is_empty()
                && !normalized[j].is_empty()
                && levenshtein(&normalized[i], &normalized[j]) <= threshold
            {
                union(&mut parent, i, j);
            }
        }
    }

    // Collect groups
    let mut group_map: std::collections::HashMap<usize, Vec<usize>> = std::collections::HashMap::new();
    for i in 0..n {
        let root = find(&mut parent, i);
        group_map.entry(root).or_default().push(i);
    }

    let mut result: Vec<SmartGroup> = group_map
        .into_values()
        .filter(|indices| indices.len() >= 2)
        .map(|mut indices| {
            indices.sort_by(|&a, &b| galleries[a].1.cmp(&galleries[b].1));
            let name = normalized[indices[0]].clone();
            SmartGroup {
                name: if name.is_empty() { galleries[indices[0]].1.clone() } else { name },
                gallery_ids: indices.iter().map(|&i| galleries[i].0).collect(),
                gallery_names: indices.iter().map(|&i| galleries[i].1.clone()).collect(),
            }
        })
        .collect();

    result.sort_by(|a, b| a.name.cmp(&b.name));
    result
}

#[cfg(test)]
mod tests {
    use super::*;

    #[test]
    fn test_normalize_name_removes_vol_suffix() {
        assert_eq!(normalize_name("My Series Vol 1"), "my series");
        assert_eq!(normalize_name("My Series vol. 12"), "my series");
        assert_eq!(normalize_name("My Series Volume 3"), "my series");
    }

    #[test]
    fn test_normalize_name_removes_ch_suffix() {
        assert_eq!(normalize_name("Comic Ch. 5"), "comic");
        assert_eq!(normalize_name("Story Chapter 10"), "story");
        assert_eq!(normalize_name("Show Ep 4"), "show");
    }

    #[test]
    fn test_normalize_name_removes_brackets() {
        assert_eq!(normalize_name("Title [tag1] [tag2]"), "title");
        assert_eq!(normalize_name("Name (2024)"), "name");
        assert_eq!(normalize_name("Series {extra}"), "series");
    }

    #[test]
    fn test_normalize_name_collapses_separators() {
        assert_eq!(normalize_name("Title  -  1"), "title");
        assert_eq!(normalize_name("name__2"), "name");
    }

    #[test]
    fn test_levenshtein_basic() {
        assert_eq!(levenshtein("kitten", "sitting"), 3);
        assert_eq!(levenshtein("", "abc"), 3);
        assert_eq!(levenshtein("abc", ""), 3);
        assert_eq!(levenshtein("same", "same"), 0);
        assert_eq!(levenshtein("abc", "abd"), 1);
    }

    #[test]
    fn test_compute_smart_groups_exact_match() {
        let galleries = vec![
            (1, "Series Vol 1".to_string()),
            (2, "Series Vol 2".to_string()),
            (3, "Unrelated Gallery".to_string()),
        ];
        let groups = compute_smart_groups(&galleries, 2);
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].gallery_ids.len(), 2);
        assert!(groups[0].gallery_ids.contains(&1));
        assert!(groups[0].gallery_ids.contains(&2));
    }

    #[test]
    fn test_compute_smart_groups_fuzzy_match() {
        let galleries = vec![
            (1, "My Comic Vol 1".to_string()),
            (2, "My Comic Vol 2".to_string()),
            (3, "Other Thing".to_string()),
        ];
        let groups = compute_smart_groups(&galleries, 2);
        assert_eq!(groups.len(), 1);
        assert_eq!(groups[0].gallery_ids.len(), 2);
    }

    #[test]
    fn test_compute_smart_groups_no_groups_when_all_unique() {
        let galleries = vec![
            (1, "Alpha".to_string()),
            (2, "Beta".to_string()),
            (3, "Gamma".to_string()),
        ];
        let groups = compute_smart_groups(&galleries, 2);
        assert_eq!(groups.len(), 0);
    }

    #[test]
    fn test_compute_smart_groups_empty() {
        let groups = compute_smart_groups(&[], 2);
        assert_eq!(groups.len(), 0);
    }
}
