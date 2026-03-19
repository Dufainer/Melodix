use serde::{Deserialize, Serialize};
use std::path::Path;

#[derive(Debug, Serialize)]
pub struct OrganizeResult {
    pub original_path: String,
    pub new_path: Option<String>,
    pub error: Option<String>,
}

#[derive(Debug, Deserialize)]
pub struct TrackInfo {
    pub path: String,
    pub title: String,
    pub artist: String,
    pub album: String,
    pub track_number: u32,
    pub disc_number: u32,
    pub year: u32,
    pub genre: String,
}

fn sanitize(s: &str) -> String {
    let s = s.trim();
    if s.is_empty() {
        return String::new();
    }
    s.chars()
        .map(|c| match c {
            '/' | '\\' | ':' | '*' | '?' | '"' | '<' | '>' | '|' => '_',
            c => c,
        })
        .collect()
}

/// Capitalize only the very first character, leave the rest untouched.
/// "cults" → "Cults", "TV Girl" → "TV Girl", "the XX" → "The XX"
fn capitalize_first(s: &str) -> String {
    let mut chars = s.chars();
    match chars.next() {
        None    => String::new(),
        Some(c) => c.to_uppercase().collect::<String>() + chars.as_str(),
    }
}

/// Extract the primary artist from a potentially multi-artist string.
/// Handles: "TV Girl, Jordan" → "TV Girl", "Nujabes; Cise Starr" → "Nujabes",
///          "Frank Sinatra/ Bennett" → "Frank Sinatra", "Jordana_ TV Girl" → "Jordana"
fn primary_artist(artist: &str) -> String {
    let lower = artist.to_lowercase();
    let separators = [
        "; ", ";",
        ", ", ",",
        " feat. ", " feat ", " ft. ", " ft ",
        " & ",
        " x ",
        " with ",
        " / ", "/ ", " /", "/",
        " _ ", "_ ", " _",
    ];
    let cut = separators
        .iter()
        .filter_map(|sep| lower.find(sep))
        .min()
        .unwrap_or(artist.len());
    capitalize_first(artist[..cut].trim())
}

fn apply_pattern(pattern: &str, info: &TrackInfo) -> String {
    let track = if info.track_number > 0 { format!("{:02}", info.track_number) } else { String::new() };
    let disc  = if info.disc_number  > 0 { info.disc_number.to_string()        } else { String::new() };
    let year  = if info.year         > 0 { info.year.to_string()               } else { String::new() };
    let artist = if info.artist.trim().is_empty() { "Unknown Artist".to_string() } else { capitalize_first(info.artist.trim()) };
    let album  = if info.album.trim().is_empty()  { "Unknown Album".to_string()  } else { capitalize_first(info.album.trim())  };
    let title  = if info.title.trim().is_empty()  { "Untitled".to_string()       } else { capitalize_first(info.title.trim())  };

    pattern
        .replace("{title}",  &sanitize(&title))
        .replace("{artist}", &sanitize(&artist))
        .replace("{album}",  &sanitize(&album))
        .replace("{track}",  &track)
        .replace("{disc}",   &disc)
        .replace("{year}",   &year)
        .replace("{genre}",  &sanitize(&info.genre))
}

/// Same as apply_pattern but uses only the primary artist for {artist}.
fn apply_folder_pattern(pattern: &str, info: &TrackInfo) -> String {
    let track  = if info.track_number > 0 { format!("{:02}", info.track_number) } else { String::new() };
    let disc   = if info.disc_number  > 0 { info.disc_number.to_string()        } else { String::new() };
    let year   = if info.year         > 0 { info.year.to_string()               } else { String::new() };
    let artist = if info.artist.trim().is_empty() { "Unknown Artist".to_string() } else { primary_artist(&info.artist) };
    let album  = if info.album.trim().is_empty()  { "Unknown Album".to_string()  } else { capitalize_first(info.album.trim()) };
    let title  = if info.title.trim().is_empty()  { "Untitled".to_string()       } else { capitalize_first(info.title.trim())  };

    pattern
        .replace("{title}",  &sanitize(&title))
        .replace("{artist}", &sanitize(&artist))
        .replace("{album}",  &sanitize(&album))
        .replace("{track}",  &track)
        .replace("{disc}",   &disc)
        .replace("{year}",   &year)
        .replace("{genre}",  &sanitize(&info.genre))
}

// ── Rename file in place ───────────────────────────────────────────────────────

#[derive(Debug, Serialize)]
pub struct RenameResult {
    pub original_path: String,
    pub new_path: String,       // intended target path
    pub status: String,         // "renamed" | "conflict" | "unchanged" | "error"
    pub original_size: u64,
    pub existing_size: u64,     // size of the conflicting file (0 if no conflict)
    pub error: Option<String>,
}

fn file_size(p: &Path) -> u64 {
    std::fs::metadata(p).map(|m| m.len()).unwrap_or(0)
}

#[tauri::command]
pub fn rename_track(path: String, new_name: String) -> Result<RenameResult, String> {
    let p    = Path::new(&path);
    let ext  = p.extension().and_then(|e| e.to_str()).unwrap_or("");
    let dir  = p.parent().unwrap_or(Path::new("."));
    let name = sanitize(&new_name);
    if name.is_empty() {
        return Err("Name cannot be empty".to_string());
    }
    let new_path = dir.join(format!("{}.{}", name, ext));
    let new_path_str = new_path.to_string_lossy().to_string();

    if new_path == p {
        return Ok(RenameResult { original_path: path.clone(), new_path: new_path_str, status: "unchanged".into(), original_size: 0, existing_size: 0, error: None });
    }
    if new_path.exists() {
        return Ok(RenameResult {
            original_path: path.clone(),
            new_path: new_path_str,
            status: "conflict".into(),
            original_size: file_size(p),
            existing_size: file_size(&new_path),
            error: None,
        });
    }
    match std::fs::rename(p, &new_path) {
        Ok(_) => Ok(RenameResult { original_path: path, new_path: new_path_str, status: "renamed".into(), original_size: 0, existing_size: 0, error: None }),
        Err(e) => Ok(RenameResult { original_path: path, new_path: new_path_str, status: "error".into(), original_size: 0, existing_size: 0, error: Some(e.to_string()) }),
    }
}

/// Resolve a rename conflict after user decides.
/// action: "overwrite" → replace existing with original | "skip" → do nothing
#[tauri::command]
pub fn resolve_rename_conflict(original_path: String, target_path: String, action: String) -> Result<String, String> {
    match action.as_str() {
        "overwrite" => {
            std::fs::rename(&original_path, &target_path).map_err(|e| e.to_string())?;
            Ok(target_path)
        }
        "skip" => Ok(original_path),
        _ => Err(format!("Unknown action: {}", action)),
    }
}

// ── Organize into folder structure ─────────────────────────────────────────────
// rename_files = false → keep original filename, only move to new folder
// rename_files = true  → also apply file_pattern to rename the file

#[tauri::command]
pub fn organize_tracks(
    tracks: Vec<TrackInfo>,
    base_dir: String,
    folder_pattern: String,
    file_pattern: String,
    rename_files: bool,
) -> Result<Vec<OrganizeResult>, String> {
    let base = Path::new(&base_dir);
    if !base.exists() {
        return Err(format!("Destination folder does not exist: {}", base_dir));
    }
    let mut results = Vec::new();

    for track in &tracks {
        let p   = Path::new(&track.path);
        let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_string();

        let target_dir = folder_pattern
            .split('/')
            .map(|part| apply_folder_pattern(part, track))
            .filter(|s| !s.trim().is_empty())
            .fold(base.to_path_buf(), |acc, part| acc.join(part.trim()));

        let file_stem = if rename_files {
            apply_pattern(&file_pattern, track)
        } else {
            p.file_stem()
                .and_then(|s| s.to_str())
                .unwrap_or("unknown")
                .to_string()
        };

        if let Err(e) = std::fs::create_dir_all(&target_dir) {
            results.push(OrganizeResult {
                original_path: track.path.clone(),
                new_path: None,
                error: Some(format!("mkdir failed: {}", e)),
            });
            continue;
        }

        let target = target_dir.join(format!("{}.{}", file_stem, ext));
        let final_target = if target.exists() && target != p {
            let mut i = 2u32;
            loop {
                let c = target_dir.join(format!("{} ({}).{}", file_stem, i, ext));
                if !c.exists() { break c; }
                i += 1;
            }
        } else {
            target
        };

        if final_target == p {
            results.push(OrganizeResult {
                original_path: track.path.clone(),
                new_path: Some(track.path.clone()),
                error: None,
            });
            continue;
        }

        match std::fs::rename(p, &final_target) {
            Ok(_) => results.push(OrganizeResult {
                original_path: track.path.clone(),
                new_path: Some(final_target.to_string_lossy().to_string()),
                error: None,
            }),
            Err(e) => results.push(OrganizeResult {
                original_path: track.path.clone(),
                new_path: None,
                error: Some(e.to_string()),
            }),
        }
    }

    Ok(results)
}

// ── Clean up empty directories ─────────────────────────────────────────────────

fn remove_if_empty(path: &Path) -> bool {
    if !path.is_dir() { return false; }
    // Recurse into subdirs first
    if let Ok(entries) = std::fs::read_dir(path) {
        for entry in entries.flatten() {
            if entry.path().is_dir() {
                remove_if_empty(&entry.path());
            }
        }
    }
    // Remove self if now empty
    match std::fs::read_dir(path) {
        Ok(mut it) => if it.next().is_none() { std::fs::remove_dir(path).is_ok() } else { false },
        Err(_) => false,
    }
}

#[tauri::command]
pub fn cleanup_empty_dirs(dirs: Vec<String>) -> Result<u32, String> {
    let mut removed = 0u32;
    // Process longest paths first (deepest dirs)
    let mut paths: Vec<_> = dirs.iter().map(|s| s.as_str()).collect();
    paths.sort_by(|a, b| b.len().cmp(&a.len()));
    paths.dedup();
    for dir in paths {
        if remove_if_empty(Path::new(dir)) {
            removed += 1;
        }
    }
    Ok(removed)
}
