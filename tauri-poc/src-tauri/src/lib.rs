// Learn more about Tauri commands at https://tauri.app/develop/calling-rust/
mod commands;
mod config;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
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
        // Phase 4: updater wired but INACTIVE until real keys exist
        // (docs/TAURI_SIGNING.md §2). Unsigned branch builds stay green.
        .plugin(tauri_plugin_updater::Builder::new().build())
        .invoke_handler(tauri::generate_handler![
            commands::scan_folder,
            commands::get_video_tags,
            commands::save_video_tags,
            commands::get_config,
            commands::save_config,
            commands::get_recent_folders,
            commands::add_recent_folder,
            commands::open_folder,
            commands::open_in_explorer,
            commands::generate_thumbnail,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
