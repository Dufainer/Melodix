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

fn apply_pattern(pattern: &str, info: &TrackInfo) -> String {
    let track = if info.track_number > 0 {
        format!("{:02}", info.track_number)
    } else {
        String::new()
    };
    let disc = if info.disc_number > 0 {
        info.disc_number.to_string()
    } else {
        String::new()
    };
    let year = if info.year > 0 {
        info.year.to_string()
    } else {
        String::new()
    };
    let artist = if info.artist.trim().is_empty() { "Unknown Artist" } else { info.artist.as_str() };
    let album  = if info.album.trim().is_empty()  { "Unknown Album"  } else { info.album.as_str()  };
    let title  = if info.title.trim().is_empty()  { "Untitled"       } else { info.title.as_str()  };

    pattern
        .replace("{title}",  &sanitize(title))
        .replace("{artist}", &sanitize(artist))
        .replace("{album}",  &sanitize(album))
        .replace("{track}",  &track)
        .replace("{disc}",   &disc)
        .replace("{year}",   &year)
        .replace("{genre}",  &sanitize(&info.genre))
}

#[tauri::command]
pub fn rename_track(path: String, new_name: String) -> Result<String, String> {
    let p = Path::new(&path);
    let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("");
    let dir = p.parent().unwrap_or(Path::new("."));
    let name = sanitize(&new_name);
    if name.is_empty() {
        return Err("Name cannot be empty".to_string());
    }
    let new_path = dir.join(format!("{}.{}", name, ext));
    if new_path == p {
        return Ok(path);
    }
    if new_path.exists() {
        return Err(format!("A file named '{}' already exists", name));
    }
    std::fs::rename(p, &new_path).map_err(|e| e.to_string())?;
    Ok(new_path.to_string_lossy().to_string())
}

#[tauri::command]
pub fn organize_tracks(
    tracks: Vec<TrackInfo>,
    base_dir: String,
    folder_pattern: String,
    file_pattern: String,
) -> Result<Vec<OrganizeResult>, String> {
    let base = Path::new(&base_dir);
    let mut results = Vec::new();

    for track in &tracks {
        let p = Path::new(&track.path);
        let ext = p.extension().and_then(|e| e.to_str()).unwrap_or("").to_string();

        let target_dir = folder_pattern
            .split('/')
            .map(|part| apply_pattern(part, track))
            .filter(|s| !s.trim().is_empty())
            .fold(base.to_path_buf(), |acc, part| acc.join(part.trim()));

        let file_stem = apply_pattern(&file_pattern, track);

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
                if !c.exists() {
                    break c;
                }
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
