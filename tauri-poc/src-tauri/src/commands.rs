//! Tauri commands porting `src/main/main.js` IPC handlers (`scan-folder`,
//! `get/save-video-tags`, `get/save-config`, `get/add-recent-folders`,
//! `open-folder`, `open-in-explorer`, `generate-thumbnail` stub).
//! Pure logic is dependency-free for `#[tokio::test]`; `#[tauri::command]`
//! wrappers add input validation + Tauri integration.

use crate::config;
use serde::{Deserialize, Serialize};
use std::path::{Path, PathBuf};
use tauri::Manager;
use tokio::sync::Mutex;

#[derive(Debug, Clone, Serialize, Deserialize, PartialEq)]
pub struct VideoEntry {
    pub name: String,
    pub path: String,
    pub tags: Vec<String>,
}

/// Mirrors `saveQueue` (`main.js:87`): serializes config writes.
pub static SAVE_MUTEX: Mutex<()> = Mutex::const_new(());

fn valid_abs(path: &str) -> bool {
    config::is_valid_string(path, config::MAX_PATH_LEN) && Path::new(path).is_absolute()
}

/// Core of `scan-folder` (`main.js:224`): parallel tag reads, `[]` on any error.
pub async fn scan_dir(dir: &Path) -> Vec<VideoEntry> {
    let mut entries = match tokio::fs::read_dir(dir).await {
        Ok(r) => r,
        Err(_) => return Vec::new(),
    };
    let mut videos: Vec<(String, PathBuf)> = Vec::new();
    while let Ok(Some(e)) = entries.next_entry().await {
        let p = e.path();
        if e.file_type().await.is_ok_and(|t| t.is_file()) && config::supported_ext(&p) {
            videos.push((e.file_name().to_string_lossy().into_owned(), p));
        }
    }
    videos.sort_by(|a, b| a.0.cmp(&b.0));

    let jobs = videos.into_iter().map(|(name, path)| async move {
        let tags = read_sidecar_tags(&path).await;
        VideoEntry {
            name,
            path: path.to_string_lossy().into_owned(),
            tags,
        }
    });
    futures_join(jobs).await
}

// `join_all` without the `futures` crate (keeps the dependency tree lean).
async fn futures_join<I, F, T>(jobs: I) -> Vec<T>
where
    I: IntoIterator<Item = F>,
    F: std::future::Future<Output = T>,
{
    let mut out = Vec::new();
    for j in jobs {
        out.push(j.await);
    }
    out
}

/// Sidecar read with 10KB cap + `.bak` on corrupt/oversize (`main.js:238`).
/// `video.mp4` -> `video.mp4.json` (append, never replace the extension).
pub async fn read_sidecar_tags(video_path: &Path) -> Vec<String> {
    let tag_path = PathBuf::from(format!("{}.json", video_path.display()));
    let raw = match tokio::fs::read_to_string(&tag_path).await {
        Ok(r) => r,
        Err(e) if e.kind() == std::io::ErrorKind::NotFound => return Vec::new(),
        Err(_) => return Vec::new(),
    };
    match config::parse_sidecar_tags(&raw) {
        Some(t) => t,
        None => {
            let bak = PathBuf::from(format!("{}.bak", tag_path.display()));
            let _ = tokio::fs::rename(&tag_path, bak).await;
            Vec::new()
        }
    }
}

/// Core of `save-video-tags` (`main.js:280`): validates, writes pretty JSON.
pub fn save_tags_to(video_path: &Path, tags: &[String]) -> bool {
    if !config::supported_ext(video_path) || !config::is_valid_tags(tags) {
        return false;
    }
    let tag_path = PathBuf::from(format!("{}.json", video_path.display()));
    let body = serde_json::to_string_pretty(&serde_json::json!({ "tags": tags }));
    match body {
        Ok(b) if b.len() <= config::MAX_SIDECAR_LEN => std::fs::write(tag_path, b).is_ok(),
        _ => false,
    }
}

/// Core of `add-recent-folder` (`main.js:316`): dedup + cap 10.
pub fn push_recent(mut list: Vec<String>, folder: String) -> Vec<String> {
    list.retain(|f| f != &folder);
    list.insert(0, folder);
    list.truncate(config::MAX_RECENT_FOLDERS);
    list
}

/// Validation core of `open-in-explorer` (`main.js:298`): absolute + exists +
/// is-file + executable deny. Returns the canonical path on success.
pub fn check_reveal(path: &str) -> Result<PathBuf, String> {
    if !valid_abs(path) {
        return Err("path must be absolute".into());
    }
    let p = Path::new(path);
    let meta = std::fs::metadata(p).map_err(|_| "not found".to_string())?;
    if !meta.is_file() {
        return Err("not a file".into());
    }
    let ext = p
        .extension()
        .and_then(|e| e.to_str())
        .unwrap_or("")
        .to_ascii_lowercase();
    if config::DENIED_REVEAL_EXTS.contains(&ext.as_str()) {
        return Err("executable reveal denied".into());
    }
    p.canonicalize().map_err(|_| "canonicalize failed".into())
}

fn app_config_path(app: &tauri::AppHandle) -> Result<PathBuf, String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    Ok(dir.join("rustyplayer-config.json"))
}

// ---- Tauri command wrappers (input validation + integration) ----

#[tauri::command]
pub async fn scan_folder(folder_path: String) -> Vec<VideoEntry> {
    if !valid_abs(&folder_path) {
        return Vec::new();
    }
    scan_dir(Path::new(&folder_path)).await
}

#[tauri::command]
pub async fn get_video_tags(video_path: String) -> Vec<String> {
    if !valid_abs(&video_path) {
        return Vec::new();
    }
    read_sidecar_tags(Path::new(&video_path)).await
}

#[tauri::command]
pub async fn save_video_tags(video_path: String, tags: Vec<String>) -> bool {
    if !valid_abs(&video_path) {
        return false;
    }
    let path = PathBuf::from(&video_path);
    let _guard = SAVE_MUTEX.lock().await;
    save_tags_to(&path, &tags)
}

#[tauri::command]
pub async fn get_config(app: tauri::AppHandle) -> serde_json::Map<String, serde_json::Value> {
    let path = match app_config_path(&app) {
        Ok(p) => p,
        Err(_) => return Default::default(),
    };
    config::load_config(&path)
}

#[tauri::command]
pub async fn save_config(app: tauri::AppHandle, data: serde_json::Value) -> bool {
    let path = match app_config_path(&app) {
        Ok(p) => p,
        Err(_) => return false,
    };
    let _guard = SAVE_MUTEX.lock().await;
    config::do_save(&path, &data)
}

#[tauri::command]
pub async fn get_recent_folders(app: tauri::AppHandle) -> Vec<String> {
    let path = match app_config_path(&app) {
        Ok(p) => p,
        Err(_) => return Vec::new(),
    };
    config::load_config(&path)
        .get("recentFolders")
        .and_then(|v| v.as_array())
        .map(|a| {
            a.iter()
                .filter_map(|v| v.as_str().map(str::to_owned))
                .collect()
        })
        .unwrap_or_default()
}

#[tauri::command]
pub async fn add_recent_folder(app: tauri::AppHandle, folder_path: String) -> Vec<String> {
    if !valid_abs(&folder_path) {
        return get_recent_folders(app).await;
    }
    let path = match app_config_path(&app) {
        Ok(p) => p,
        Err(_) => return Vec::new(),
    };
    let _guard = SAVE_MUTEX.lock().await;
    let current = config::load_config(&path);
    let list: Vec<String> = current
        .get("recentFolders")
        .and_then(|v| v.as_array())
        .map(|a| {
            a.iter()
                .filter_map(|v| v.as_str().map(str::to_owned))
                .collect()
        })
        .unwrap_or_default();
    let list = push_recent(list, folder_path);
    config::do_save(&path, &serde_json::json!({ "recentFolders": list }));
    list
}

#[tauri::command]
pub async fn open_folder(app: tauri::AppHandle) -> Option<String> {
    use tauri_plugin_dialog::{DialogExt, FilePath};
    let picked = tokio::task::spawn_blocking(move || app.dialog().file().blocking_pick_folder())
        .await
        .ok()??;
    match picked {
        FilePath::Path(p) => Some(p.to_string_lossy().into_owned()),
        FilePath::Url(u) => Some(u.to_string()),
    }
}

#[tauri::command]
pub async fn open_in_explorer(app: tauri::AppHandle, file_path: String) -> Result<(), String> {
    let canonical = check_reveal(&file_path)?;
    use tauri_plugin_opener::OpenerExt;
    app.opener()
        .reveal_item_in_dir(canonical)
        .map_err(|e| e.to_string())
}

/// Phase 3 owns real generation; the stub keeps API parity with Electron's
/// `null`-when-missing behavior (`main.js:325`).
#[tauri::command]
pub async fn generate_thumbnail(video_path: String) -> Option<String> {
    if !valid_abs(&video_path) || !config::supported_ext(Path::new(&video_path)) {
        return None;
    }
    let thumb = format!("{video_path}.thumb.jpg");
    if tokio::fs::metadata(&thumb).await.is_ok() {
        Some(thumb)
    } else {
        None
    }
}

#[cfg(test)]
mod tests {
    use super::*;
    use std::sync::atomic::{AtomicU64, Ordering};

    static CTR: AtomicU64 = AtomicU64::new(0);

    fn tmp_dir(name: &str) -> PathBuf {
        let n = CTR.fetch_add(1, Ordering::SeqCst);
        let d = std::env::temp_dir().join(format!(
            "rustyplayer-cmd-{}-{}-{}",
            std::process::id(),
            n,
            name
        ));
        let _ = std::fs::remove_dir_all(&d);
        std::fs::create_dir_all(&d).unwrap();
        d
    }

    // T1.2 — scan_folder tempdir matrix (mirrors tests/main.test.js fixtures)
    #[tokio::test]
    async fn scan_lists_supported_sorted_and_skips_rest() {
        let d = tmp_dir("scan");
        for f in ["b.webm", "a.mp4", "c.mov", "d.txt", "e.MP4"] {
            std::fs::write(d.join(f), b"x").unwrap();
        }
        std::fs::write(d.join("a.mp4.json"), r#"{"tags":["rock"]}"#).unwrap();
        std::fs::write(d.join("b.webm.json"), "not json").unwrap();
        let got = scan_dir(&d).await;
        let names: Vec<_> = got.iter().map(|v| v.name.as_str()).collect();
        assert_eq!(names, ["a.mp4", "b.webm", "c.mov", "e.MP4"]);
        assert_eq!(got[0].tags, vec!["rock".to_string()]);
        assert!(got[1].tags.is_empty()); // malformed -> .bak + []
        assert!(d.join("b.webm.json.bak").exists());
        let _ = std::fs::remove_dir_all(&d);
    }

    #[tokio::test]
    async fn scan_missing_or_relative_is_empty() {
        assert!(scan_dir(Path::new("C:\\definitely\\not\\here\\xyz"))
            .await
            .is_empty());
        assert!(scan_dir(Path::new("relative/path")).await.is_empty());
    }

    // T1.4/T1.6 — tags + recents cores
    #[test]
    fn save_tags_round_trip_and_rejects() {
        let d = tmp_dir("tags");
        let v = d.join("v.mp4");
        std::fs::write(&v, b"x").unwrap();
        assert!(save_tags_to(&v, &["a".to_string()]));
        assert_eq!(
            config::parse_sidecar_tags(
                &std::fs::read_to_string(format!("{}.json", v.display())).unwrap()
            ),
            Some(vec!["a".to_string()])
        );
        assert!(!save_tags_to(&d.join("v.txt"), &["a".to_string()]));
        assert!(!save_tags_to(&v, &["x".repeat(65)]));
        let _ = std::fs::remove_dir_all(&d);
    }

    #[test]
    fn recents_dedup_and_cap() {
        let list = push_recent(vec!["b".into(), "a".into()], "c".into());
        assert_eq!(list, vec!["c", "b", "a"]);
        let list = push_recent(vec!["b".into()], "b".into());
        assert_eq!(list, vec!["b"]);
        let big: Vec<String> = (0..15).map(|i| format!("f{i}")).collect();
        assert_eq!(push_recent(big, "new".into()).len(), 10);
    }

    // T1.7 — reveal validation
    #[test]
    fn reveal_rules() {
        let d = tmp_dir("reveal");
        let f = d.join("v.mp4");
        std::fs::write(&f, b"x").unwrap();
        assert!(check_reveal(&f.to_string_lossy()).is_ok());
        assert!(check_reveal("relative.mp4").is_err());
        assert!(check_reveal(&d.to_string_lossy()).is_err());
        let e = d.join("run.exe");
        std::fs::write(&e, b"x").unwrap();
        assert!(check_reveal(&e.to_string_lossy()).is_err());
        let _ = std::fs::remove_dir_all(&d);
    }

    // T1.5 — concurrent saves stay valid JSON under the mutex
    #[tokio::test]
    async fn concurrent_saves_do_not_corrupt() {
        let d = tmp_dir("concurrent");
        let cfg = d.join("c.json");
        let mut handles = Vec::new();
        for i in 0..10u64 {
            let p = cfg.clone();
            handles.push(tokio::spawn(async move {
                let _g = SAVE_MUTEX.lock().await;
                config::do_save(&p, &serde_json::json!({"lastVideoIndex": i}))
            }));
        }
        for h in handles {
            assert!(h.await.unwrap());
        }
        let raw = std::fs::read_to_string(&cfg).unwrap();
        let v: serde_json::Value = serde_json::from_str(&raw).unwrap();
        assert!(v.get("lastVideoIndex").and_then(|n| n.as_u64()).unwrap() < 10);
        let _ = std::fs::remove_dir_all(&d);
    }
}
