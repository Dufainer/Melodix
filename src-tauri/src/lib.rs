pub mod commands;
pub mod formats;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::scanner::scan_folder,
            commands::metadata::read_metadata,
            commands::metadata::write_metadata,
            commands::metadata::get_cover_art,
            commands::metadata::get_supported_formats,
            commands::files::rename_track,
            commands::files::resolve_rename_conflict,
            commands::files::organize_tracks,
            commands::files::cleanup_empty_dirs,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
