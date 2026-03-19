use serde::{Deserialize, Serialize};
use std::path::Path;
use crate::formats;

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct Metadata {
    pub path: String,
    pub format: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub album_artist: String,
    pub genre: String,
    pub year: u32,
    pub track_number: u32,
    pub disc_number: u32,
    pub duration: f64,
    pub cover_art: Option<String>,
    pub bit_depth: Option<u32>,
    pub sample_rate: u32,
    pub bitrate: u32,
    pub file_size: u64,
    pub lyrics: Option<String>,
    pub comment: Option<String>,
    pub composer: Option<String>,
}

#[tauri::command]
pub fn read_metadata(path: String) -> Result<Metadata, String> {
    let p = Path::new(&path);
    let handler = formats::handler_for(p)
        .ok_or_else(|| format!("Unsupported file format: {}", path))?;
    (handler.read_fn)(p)
}

#[tauri::command]
pub fn write_metadata(path: String, metadata: Metadata) -> Result<(), String> {
    let p = Path::new(&path);
    let handler = formats::handler_for(p)
        .ok_or_else(|| format!("Unsupported file format: {}", path))?;
    (handler.write_fn)(p, &metadata)
}

#[tauri::command]
pub fn get_cover_art(path: String) -> Result<Option<String>, String> {
    let p = Path::new(&path);
    let handler = formats::handler_for(p)
        .ok_or_else(|| format!("Unsupported file format: {}", path))?;
    (handler.cover_fn)(p)
}

#[tauri::command]
pub fn get_supported_formats() -> Vec<&'static str> {
    formats::all_supported_extensions()
}
