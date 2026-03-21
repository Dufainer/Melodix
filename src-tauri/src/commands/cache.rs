use tauri::Manager;
use crate::commands::scanner::ScannedTrack;

#[tauri::command]
pub fn save_library_cache(app: tauri::AppHandle, tracks: Vec<ScannedTrack>) -> Result<(), String> {
    let dir = app.path().app_data_dir().map_err(|e| e.to_string())?;
    std::fs::create_dir_all(&dir).map_err(|e| e.to_string())?;
    let path = dir.join("library_cache.json");
    let json = serde_json::to_string(&tracks).map_err(|e| e.to_string())?;
    std::fs::write(&path, json).map_err(|e| e.to_string())
}

#[tauri::command]
pub fn load_library_cache(app: tauri::AppHandle) -> Result<Option<Vec<ScannedTrack>>, String> {
    let path = app.path().app_data_dir()
        .map_err(|e| e.to_string())?
        .join("library_cache.json");
    if !path.exists() {
        return Ok(None);
    }
    let json = std::fs::read_to_string(&path).map_err(|e| e.to_string())?;
    let tracks: Vec<ScannedTrack> = serde_json::from_str(&json).map_err(|e| e.to_string())?;
    Ok(Some(tracks))
}
