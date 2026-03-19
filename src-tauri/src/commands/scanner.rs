use serde::{Deserialize, Serialize};
use std::path::Path;
use walkdir::WalkDir;
use crate::formats;
use crate::commands::metadata::Metadata;

#[derive(Debug, Serialize, Deserialize)]
pub struct ScannedTrack {
    pub path: String,
    pub format: String,
    pub file_name: String,
    pub file_size: u64,
    /// Basic metadata loaded eagerly during scan (may be empty strings on error)
    #[serde(flatten)]
    pub metadata: Option<Metadata>,
}

#[tauri::command]
pub fn scan_folder(path: String, skip_cover: Option<bool>) -> Result<Vec<ScannedTrack>, String> {
    let root = Path::new(&path);
    if !root.is_dir() {
        return Err(format!("Not a directory: {path}"));
    }

    let supported = formats::all_supported_extensions();
    let no_cover = skip_cover.unwrap_or(false);
    let mut tracks: Vec<ScannedTrack> = Vec::new();

    for entry in WalkDir::new(root)
        .follow_links(true)
        .into_iter()
        .filter_map(|e| e.ok())
    {
        let file_path = entry.path();
        if !file_path.is_file() {
            continue;
        }

        let ext = file_path
            .extension()
            .and_then(|e| e.to_str())
            .unwrap_or("")
            .to_lowercase();

        if !supported.contains(&ext.as_str()) {
            continue;
        }

        let file_name = file_path
            .file_name()
            .and_then(|n| n.to_str())
            .unwrap_or("")
            .to_owned();

        let file_size = std::fs::metadata(file_path)
            .map(|m| m.len())
            .unwrap_or(0);

        // Attempt to read metadata; optionally strip cover art to speed up bulk scans
        let metadata = match formats::handler_for(file_path) {
            Some(handler) => {
                let mut meta = (handler.read_fn)(file_path).ok();
                if no_cover {
                    if let Some(ref mut m) = meta {
                        m.cover_art = None;
                    }
                }
                meta
            }
            None => None,
        };

        tracks.push(ScannedTrack {
            path: file_path.to_string_lossy().into_owned(),
            format: ext,
            file_name,
            file_size,
            metadata,
        });
    }

    Ok(tracks)
}
