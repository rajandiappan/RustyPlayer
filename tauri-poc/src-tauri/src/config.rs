//! Config load/save + validation ports of `src/main/main.js` (`loadConfig`,
//! `saveConfig`, `isValidString/Tags/Bounds`, `sanitizeConfig`).
//! All filesystem effects take an explicit path so unit tests run without Tauri.

use serde_json::{Map, Value};
use std::path::Path;

pub const MAX_TAGS: usize = 20;
pub const MAX_TAG_LEN: usize = 64;
/// Sidecar cap mirroring `main.js` 10KB guard.
pub const MAX_SIDECAR_LEN: usize = 10 * 1024;
pub const MAX_PATH_LEN: usize = 2000;
pub const MAX_RECENT_FOLDERS: usize = 10;
pub const SUPPORTED_EXTS: [&str; 3] = ["mp4", "webm", "mov"];
/// Executables `open_in_explorer` must never launch (parity with the
/// `showItemInFolder`-only Electron path).
pub const DENIED_REVEAL_EXTS: [&str; 6] = ["exe", "bat", "cmd", "com", "ps1", "msi"];

/// Port of `isValidString` (`main.js:46`).
pub fn is_valid_string(s: &str, max_len: usize) -> bool {
    !s.is_empty() && s.len() <= max_len && !s.contains('\0')
}

/// Port of `isValidTags` (`main.js:49`).
pub fn is_valid_tags(tags: &[String]) -> bool {
    tags.len() <= MAX_TAGS && tags.iter().all(|t| !t.is_empty() && t.len() <= MAX_TAG_LEN)
}

/// Port of `isValidBounds` (`main.js:54`): finite + on-screen ranges.
pub fn is_valid_bounds(x: f64, y: f64, width: f64, height: f64) -> bool {
    x.is_finite()
        && y.is_finite()
        && width.is_finite()
        && height.is_finite()
        && (400.0..=5000.0).contains(&width)
        && (300.0..=4000.0).contains(&height)
}

fn valid_bounds_value(v: &Value) -> bool {
    let obj = match v.as_object() {
        Some(o) => o,
        None => return false,
    };
    let num = |k: &str| obj.get(k).and_then(Value::as_f64);
    match (num("x"), num("y"), num("width"), num("height")) {
        (Some(x), Some(y), Some(w), Some(h)) => is_valid_bounds(x, y, w, h),
        _ => false,
    }
}

fn valid_number_in(v: &Value, min: f64, max: f64) -> bool {
    v.as_f64()
        .is_some_and(|n| n.is_finite() && n >= min && n <= max)
}

fn valid_abs_path(v: &Value) -> bool {
    v.as_str()
        .is_some_and(|s| is_valid_string(s, MAX_PATH_LEN) && Path::new(s).is_absolute())
}

/// Port of `sanitizeConfig` (`main.js:60`): allow-list only. Unknown keys are
/// dropped, which also neutralizes `__proto__`/`constructor`/`prototype`
/// pollution (serde has no prototype chain, but the explicit reject below
/// documents the parity requirement).
pub fn sanitize_config(data: &Value) -> Map<String, Value> {
    let mut out = Map::new();
    let obj = match data.as_object() {
        Some(o) => o,
        None => return out,
    };
    for (k, v) in obj {
        if k == "__proto__" || k == "constructor" || k == "prototype" {
            continue;
        }
        let keep = match k.as_str() {
            "bounds" => valid_bounds_value(v),
            "sidebarWidth" => valid_number_in(v, 0.0, 100.0),
            "volume" => valid_number_in(v, 0.0, 1.0),
            "lastFolder" => valid_abs_path(v),
            "lastVideoIndex" => v.as_u64().is_some(),
            "recentFolders" => v.as_array().is_some_and(|arr| {
                arr.len() <= MAX_RECENT_FOLDERS
                    && arr.iter().all(|p| {
                        p.as_str().is_some_and(|s| {
                            is_valid_string(s, MAX_PATH_LEN) && Path::new(s).is_absolute()
                        })
                    })
            }),
            _ => false,
        };
        if keep {
            out.insert(k.clone(), v.clone());
        }
    }
    out
}

/// Port of `loadConfig` (`main.js:23`): missing → `{}`, corrupt → rename `.bak` + `{}`.
pub fn load_config(path: &Path) -> Map<String, Value> {
    let raw = match std::fs::read_to_string(path) {
        Ok(r) => r,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Map::new(),
        Err(_) => return Map::new(),
    };
    match serde_json::from_str::<Value>(&raw) {
        Ok(Value::Object(o)) => o,
        Ok(_) => Map::new(),
        Err(_) => {
            let bak = path.with_extension("json.bak");
            let _ = std::fs::rename(path, bak);
            Map::new()
        }
    }
}

/// Blocking core of `saveConfig` (`main.js:89 doSave`): sanitize → merge →
/// atomic tmp+rename. Callers must serialize via the shared mutex (see
/// `commands.rs SAVE_MUTEX`, mirroring `saveQueue`).
pub fn do_save(cfg_path: &Path, data: &Value) -> bool {
    let clean = sanitize_config(data);
    let mut current = load_config(cfg_path);
    current.extend(clean);
    let tmp = cfg_path.with_extension("json.tmp");
    let body = serde_json::to_string_pretty(&current).unwrap_or_else(|_| "{}".into());
    if std::fs::write(&tmp, body).is_err() {
        return false;
    }
    std::fs::rename(&tmp, cfg_path).is_ok()
}

/// Validate sidecar `{"tags": [...]}` content (`main.js:240`).
pub fn parse_sidecar_tags(raw: &str) -> Option<Vec<String>> {
    if raw.len() > MAX_SIDECAR_LEN {
        return None;
    }
    let data: Value = serde_json::from_str(raw).ok()?;
    let tags = data.get("tags")?.as_array()?;
    if tags.len() > MAX_TAGS {
        return None;
    }
    let mut out = Vec::with_capacity(tags.len());
    for t in tags {
        let s = t.as_str()?;
        if s.is_empty() || s.len() > MAX_TAG_LEN {
            return None;
        }
        out.push(s.to_owned());
    }
    Some(out)
}

/// Supported video extension check (`main.js:227,263`).
pub fn supported_ext(path: &Path) -> bool {
    path.extension()
        .and_then(|e| e.to_str())
        .is_some_and(|e| SUPPORTED_EXTS.contains(&e.to_ascii_lowercase().as_str()))
}

#[cfg(test)]
mod tests {
    use super::*;
    use serde_json::json;
    use std::sync::atomic::{AtomicU64, Ordering};

    static CTR: AtomicU64 = AtomicU64::new(0);

    fn tmp_path(name: &str) -> std::path::PathBuf {
        let n = CTR.fetch_add(1, Ordering::SeqCst);
        std::env::temp_dir().join(format!(
            "rustyplayer-test-{}-{}-{}.json",
            std::process::id(),
            n,
            name
        ))
    }

    // T1.1 — validation ports
    #[test]
    fn rejects_bad_strings_and_tags() {
        assert!(!is_valid_string("", 10));
        assert!(!is_valid_string("a\0b", 10));
        assert!(!is_valid_string("toolong", 3));
        assert!(is_valid_string("ok", 10));
        assert!(!is_valid_tags(&["x".repeat(65)]));
        assert!(!is_valid_tags(&vec!["x".to_string(); 21]));
        assert!(!is_valid_tags(&[String::new()]));
        assert!(is_valid_tags(&["rock".to_string()]));
    }

    #[test]
    fn rejects_bad_bounds() {
        assert!(!is_valid_bounds(0.0, 0.0, 10.0, 10.0));
        assert!(!is_valid_bounds(0.0, 0.0, f64::NAN, 800.0));
        assert!(is_valid_bounds(10.0, 20.0, 1200.0, 800.0));
    }

    #[test]
    fn sanitize_drops_unknown_and_proto_keys() {
        let clean = sanitize_config(&json!({
            "__proto__": {"polluted": true},
            "constructor": 1,
            "evil": true,
            "bounds": {"x": 0, "y": 0, "width": 10, "height": 10},
            "volume": 2.0,
            "lastFolder": "relative/path",
            "lastVideoIndex": 3,
            "recentFolders": ["C:\\Vids", "relative"],
        }));
        assert!(clean.get("__proto__").is_none());
        assert!(clean.get("evil").is_none());
        assert!(clean.get("bounds").is_none());
        assert!(clean.get("volume").is_none());
        assert!(clean.get("lastFolder").is_none());
        assert!(clean.get("recentFolders").is_none());
        assert_eq!(clean.get("lastVideoIndex"), Some(&json!(3)));
    }

    // T1.5 — config atomicity
    #[test]
    fn load_missing_is_empty_and_corrupt_backs_up() {
        let p = tmp_path("missing");
        let _ = std::fs::remove_file(&p);
        assert!(load_config(&p).is_empty());

        let p2 = tmp_path("corrupt");
        std::fs::write(&p2, "not json{{{").unwrap();
        assert!(load_config(&p2).is_empty());
        assert!(p2.with_extension("json.bak").exists());
        let _ = std::fs::remove_file(p2.with_extension("json.bak"));
    }

    #[test]
    fn save_round_trips_and_merges() {
        let p = tmp_path("save");
        let _ = std::fs::remove_file(&p);
        assert!(do_save(&p, &json!({"volume": 0.5})));
        assert!(do_save(&p, &json!({"lastVideoIndex": 2})));
        let loaded = load_config(&p);
        assert_eq!(loaded.get("volume"), Some(&json!(0.5)));
        assert_eq!(loaded.get("lastVideoIndex"), Some(&json!(2)));
        let _ = std::fs::remove_file(&p);
    }

    // T1.3 — sidecar parsing
    #[test]
    fn sidecar_rules() {
        assert_eq!(
            parse_sidecar_tags(r#"{"tags":["a","b"]}"#),
            Some(vec!["a".to_string(), "b".to_string()])
        );
        assert_eq!(parse_sidecar_tags("not json"), None);
        assert_eq!(parse_sidecar_tags(r#"{"tags":"nope"}"#), None);
        assert_eq!(parse_sidecar_tags(&"x".repeat(MAX_SIDECAR_LEN + 1)), None);
    }

    #[test]
    fn ext_and_reveal_lists() {
        assert!(supported_ext(Path::new("C:\\V\\a.MP4")));
        assert!(!supported_ext(Path::new("C:\\V\\a.txt")));
        assert!(DENIED_REVEAL_EXTS.contains(&"exe"));
    }
}
