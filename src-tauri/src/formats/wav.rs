use std::path::Path;
use id3::{Tag, TagLike, Version, Frame, frame};
use base64::{Engine as _, engine::general_purpose::STANDARD as B64};
use crate::commands::metadata::Metadata;
use super::{AudioFormat, probe_audio_props};

pub struct Wav;

impl AudioFormat for Wav {
    fn can_handle(path: &Path) -> bool {
        matches!(
            path.extension().and_then(|e| e.to_str()).map(|e| e.to_ascii_lowercase()).as_deref(),
            Some("wav") | Some("wave")
        )
    }

    fn read_metadata(path: &Path) -> Result<Metadata, String> {
        // id3::Tag::read_from_path detects WAV containers automatically
        let tag = Tag::read_from_path(path).unwrap_or_default();
        let (sample_rate, bitrate, duration) = probe_audio_props(path);
        let file_size = std::fs::metadata(path).map(|m| m.len()).unwrap_or(0);

        let cover_art = tag.pictures()
            .find(|p| p.picture_type == frame::PictureType::CoverFront)
            .or_else(|| tag.pictures().next())
            .map(|p| B64.encode(&p.data));

        let rg_track = tag.extended_texts()
            .find(|t| t.description.eq_ignore_ascii_case("REPLAYGAIN_TRACK_GAIN"))
            .and_then(|t| t.value.split_whitespace().next()?.parse::<f32>().ok());
        let rg_album = tag.extended_texts()
            .find(|t| t.description.eq_ignore_ascii_case("REPLAYGAIN_ALBUM_GAIN"))
            .and_then(|t| t.value.split_whitespace().next()?.parse::<f32>().ok());

        let composer = tag.get("TCOM")
            .and_then(|f| f.content().text())
            .map(|s| s.to_owned())
            .filter(|s| !s.is_empty());

        let lyrics  = tag.lyrics().next().map(|l| l.text.clone()).filter(|s| !s.is_empty());
        let comment = tag.comments().next().map(|c| c.text.clone()).filter(|s| !s.is_empty());

        Ok(Metadata {
            path: path.to_string_lossy().into_owned(),
            format: "wav".into(),
            title:        tag.title().unwrap_or_default().to_owned(),
            artist:       tag.artist().unwrap_or_default().to_owned(),
            album:        tag.album().unwrap_or_default().to_owned(),
            album_artist: tag.album_artist().unwrap_or_default().to_owned(),
            genre:        tag.genre().unwrap_or_default().to_owned(),
            year:         tag.year().map(|y| y as u32).unwrap_or(0),
            track_number: tag.track().unwrap_or(0),
            disc_number:  tag.disc().unwrap_or(0),
            duration,
            cover_art,
            bit_depth: None,
            sample_rate,
            bitrate,
            file_size,
            lyrics,
            comment,
            composer,
            replay_gain_track: rg_track,
            replay_gain_album: rg_album,
        })
    }

    fn write_metadata(path: &Path, metadata: &Metadata) -> Result<(), String> {
        let mut tag = Tag::read_from_path(path).unwrap_or_default();

        tag.set_title(metadata.title.clone());
        tag.set_artist(metadata.artist.clone());
        tag.set_album(metadata.album.clone());
        tag.set_album_artist(metadata.album_artist.clone());
        tag.set_genre(metadata.genre.clone());
        if metadata.year > 0 { tag.set_year(metadata.year as i32); } else { tag.remove_year(); }
        if metadata.track_number > 0 { tag.set_track(metadata.track_number); } else { tag.remove_track(); }
        if metadata.disc_number  > 0 { tag.set_disc(metadata.disc_number);   } else { tag.remove_disc();  }

        tag.remove_all_lyrics();
        if let Some(ref lyr) = metadata.lyrics {
            if !lyr.is_empty() {
                tag.add_frame(frame::Lyrics {
                    lang: "eng".into(), description: String::new(), text: lyr.clone(),
                });
            }
        }

        tag.remove_comment(None, None);
        if let Some(ref cmt) = metadata.comment {
            if !cmt.is_empty() {
                tag.add_frame(frame::Comment {
                    lang: "eng".into(), description: String::new(), text: cmt.clone(),
                });
            }
        }

        tag.remove("TCOM");
        if let Some(ref comp) = metadata.composer {
            if !comp.is_empty() {
                tag.add_frame(Frame::with_content("TCOM", frame::Content::Text(comp.clone())));
            }
        }

        tag.remove_picture_by_type(frame::PictureType::CoverFront);
        if let Some(ref cover_b64) = metadata.cover_art {
            let bytes = B64.decode(cover_b64).map_err(|e| format!("Bad base64 cover: {e}"))?;
            let mime = if bytes.starts_with(b"\xff\xd8\xff") { "image/jpeg" } else { "image/png" };
            tag.add_frame(frame::Picture {
                mime_type: mime.into(),
                picture_type: frame::PictureType::CoverFront,
                description: String::new(),
                data: bytes,
            });
        }

        // write_to_path detects WAV extension and writes to the "id3 " RIFF chunk
        tag.write_to_path(path, Version::Id3v24)
            .map_err(|e| format!("Failed to write WAV tag: {e}"))
    }

    fn get_cover_art(path: &Path) -> Result<Option<String>, String> {
        let tag = Tag::read_from_path(path).unwrap_or_default();
        let pic = tag.pictures()
            .find(|p| p.picture_type == frame::PictureType::CoverFront)
            .or_else(|| tag.pictures().next());
        Ok(pic.map(|p| B64.encode(&p.data)))
    }

    fn supported_extensions() -> Vec<&'static str> {
        vec!["wav", "wave"]
    }
}
