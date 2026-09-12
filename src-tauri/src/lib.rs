// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
mod config;

use tauri::Manager;

/// Config file path (mirrors commands::app_config_path without needing it public).
fn config_file(app: &tauri::AppHandle) -> Option<std::path::PathBuf> {
    let dir = app.path().app_data_dir().ok()?;
    std::fs::create_dir_all(&dir).ok()?;
    Some(dir.join("rustyplayer-config.json"))
}

/// Restore persisted window bounds on startup (Electron `setBounds` parity).
fn restore_window_bounds(app: &tauri::AppHandle, window: &tauri::WebviewWindow) {
    let path = match config_file(app) {
        Some(p) => p,
        None => return,
    };
    let cfg = config::load_config(&path);
    let obj = match cfg.get("bounds").and_then(|b| b.as_object()) {
        Some(o) => o,
        None => return,
    };
    let num = |k: &str| obj.get(k).and_then(|v| v.as_f64());
    if let (Some(x), Some(y), Some(w), Some(h)) = (num("x"), num("y"), num("width"), num("height"))
    {
        if config::is_valid_bounds(x, y, w, h) {
            use tauri::{LogicalPosition, LogicalSize};
            let _ = window.set_position(LogicalPosition::new(x, y));
            let _ = window.set_size(LogicalSize::new(w, h));
        }
    }
}

/// Flush window bounds synchronously on close (Electron `before-quit` parity:
/// async IPC may never flush, so the write here is blocking by design).
/// Takes `&Window` because `on_window_event` hands us the base window type.
fn persist_window_bounds(window: &tauri::Window) {
    let (Ok(pos), Ok(size), Ok(scale)) = (
        window.outer_position(),
        window.outer_size(),
        window.scale_factor(),
    ) else {
        return;
    };
    let pos = pos.to_logical::<f64>(scale);
    let size = size.to_logical::<f64>(scale);
    let app = window.app_handle();
    if let Some(path) = config_file(app) {
        config::persist_bounds(&path, pos.x, pos.y, size.width, size.height);
    }
}

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            if let Some(window) = app.get_webview_window("main") {
                restore_window_bounds(app.handle(), &window);
            }
            Ok(())
        })
        .on_window_event(|window, event| {
            if matches!(event, tauri::WindowEvent::CloseRequested { .. }) {
                persist_window_bounds(window);
            }
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .plugin(
            tauri_plugin_log::Builder::new()
                .level(log::LevelFilter::Info)
                // File target so asset-protocol errors survive without a console:
                // %APPDATA%\com.rustyplayer.app\logs\rustyplayer.log
                .target(tauri_plugin_log::Target::new(
                    tauri_plugin_log::TargetKind::LogDir {
                        file_name: Some("rustyplayer".into()),
                    },
                ))
                .build(),
        )
        // Updater active with pinned pubkey (tauri.conf.json); tag builds sign,
        // branch builds stay green unsigned (docs/TAURI_SIGNING.md §2).
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::scan_folder,
            commands::get_video_tags,
            commands::save_video_tags,
            commands::get_config,
            commands::save_config,
            commands::get_recent_folders,
            commands::add_recent_folder,
            commands::clear_recent_folders,
            commands::open_folder,
            commands::open_in_explorer,
            commands::generate_thumbnail,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
