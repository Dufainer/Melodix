pub mod commands;
pub mod formats;

use tauri::Manager;

#[cfg_attr(mobile, tauri::mobile_entry_point)]
pub fn run() {
    tauri::Builder::default()
        .setup(|app| {
            let audio_state = commands::audio::init_audio(app.handle().clone());
            app.manage(audio_state);
            Ok(())
        })
        .plugin(tauri_plugin_opener::init())
        .plugin(tauri_plugin_dialog::init())
        .plugin(tauri_plugin_fs::init())
        .invoke_handler(tauri::generate_handler![
            commands::cache::save_library_cache,
            commands::cache::load_library_cache,
            commands::scanner::scan_folder,
            commands::metadata::read_metadata,
            commands::metadata::write_metadata,
            commands::metadata::get_cover_art,
            commands::metadata::get_supported_formats,
            commands::files::rename_track,
            commands::files::resolve_rename_conflict,
            commands::files::organize_tracks,
            commands::files::cleanup_empty_dirs,
            commands::audio::player_play,
            commands::audio::player_pause,
            commands::audio::player_resume,
            commands::audio::player_stop,
            commands::audio::player_set_volume,
            commands::audio::player_seek,
            commands::audio::player_get_state,
        ])
        .run(tauri::generate_context!())
        .expect("error while running tauri application");
}
