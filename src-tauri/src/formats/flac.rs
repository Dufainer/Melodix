use std::path::Path;
use metaflac::Tag;
use base64::{Engine as _, engine::general_purpose::STANDARD as B64};
use crate::commands::metadata::Metadata;
use super::AudioFormat;

pub struct Flac;

impl AudioFormat for Flac {
    fn can_handle(path: &Path) -> bool {
        path.extension()
            .and_then(|e| e.to_str())
            .map(|e| e.eq_ignore_ascii_case("flac"))
            .unwrap_or(false)
    }

    fn read_metadata(path: &Path) -> Result<Metadata, String> {
        let tag = Tag::read_from_path(path)
            .map_err(|e| format!("Failed to read FLAC tag: {e}"))?;

        let vorbis = tag.vorbis_comments();

        macro_rules! get {
            ($field:expr) => {
                vorbis
                    .and_then(|v| v.get($field))
                    .and_then(|vals| vals.first())
                    .cloned()
                    .unwrap_or_default()
            };
        }

        macro_rules! get_u32 {
            ($field:expr) => {
                vorbis
                    .and_then(|v| v.get($field))
                    .and_then(|vals| vals.first())
                    .and_then(|s| s.parse::<u32>().ok())
                    .unwrap_or(0)
            };
        }

        let streaminfo = tag.get_streaminfo();
        let sample_rate = streaminfo.map(|s| s.sample_rate).unwrap_or(0);
        let bit_depth = streaminfo.map(|s| s.bits_per_sample as u32);
        let total_samples = streaminfo.map(|s| s.total_samples).unwrap_or(0);
        let duration = if sample_rate > 0 {
            total_samples as f64 / sample_rate as f64
        } else {
            0.0
        };

        let file_size = std::fs::metadata(path)
            .map(|m| m.len())
            .unwrap_or(0);

        let bitrate = if duration > 0.0 {
            ((file_size * 8) as f64 / duration / 1000.0) as u32
        } else {
            0
        };

        let lyrics_val = vorbis
            .and_then(|v| v.get("LYRICS"))
            .and_then(|vals| vals.first())
            .cloned()
            .filter(|s| !s.is_empty());
        let comment_val = vorbis
            .and_then(|v| v.get("COMMENT"))
            .and_then(|vals| vals.first())
            .cloned()
            .filter(|s| !s.is_empty());
        let composer_val = vorbis
            .and_then(|v| v.get("COMPOSER"))
            .and_then(|vals| vals.first())
            .cloned()
            .filter(|s| !s.is_empty());

        let cover_art = tag
            .pictures()
            .find(|p| p.picture_type == metaflac::block::PictureType::CoverFront)
            .or_else(|| tag.pictures().next())
            .map(|p| B64.encode(&p.data));

        Ok(Metadata {
            path: path.to_string_lossy().into_owned(),
            format: "flac".into(),
            title: get!("TITLE"),
            artist: get!("ARTIST"),
            album: get!("ALBUM"),
            album_artist: get!("ALBUMARTIST"),
            genre: get!("GENRE"),
            year: get_u32!("DATE"),
            track_number: get_u32!("TRACKNUMBER"),
            disc_number: get_u32!("DISCNUMBER"),
            duration,
            cover_art,
            bit_depth,
            sample_rate,
            bitrate,
            file_size,
            lyrics: lyrics_val,
            comment: comment_val,
            composer: composer_val,
        })
    }

    fn write_metadata(path: &Path, metadata: &Metadata) -> Result<(), String> {
        let mut tag = Tag::read_from_path(path)
            .map_err(|e| format!("Failed to read FLAC tag for writing: {e}"))?;

        let vc = tag.vorbis_comments_mut();
        vc.set_title(vec![metadata.title.clone()]);
        vc.set_artist(vec![metadata.artist.clone()]);
        vc.set_album(vec![metadata.album.clone()]);
        vc.set("ALBUMARTIST", vec![metadata.album_artist.clone()]);
        vc.set("GENRE", vec![metadata.genre.clone()]);
        vc.set("DATE", vec![metadata.year.to_string()]);
        vc.set("TRACKNUMBER", vec![metadata.track_number.to_string()]);
        vc.set("DISCNUMBER", vec![metadata.disc_number.to_string()]);

        match &metadata.lyrics {
            Some(lyrics) if !lyrics.is_empty() => vc.set("LYRICS", vec![lyrics.clone()]),
            _ => vc.remove("LYRICS"),
        }
        match &metadata.comment {
            Some(comment) if !comment.is_empty() => vc.set("COMMENT", vec![comment.clone()]),
            _ => vc.remove("COMMENT"),
        }
        match &metadata.composer {
            Some(composer) if !composer.is_empty() => vc.set("COMPOSER", vec![composer.clone()]),
            _ => vc.remove("COMPOSER"),
        }

        // Embed cover art if provided as base64
        if let Some(ref cover_b64) = metadata.cover_art {
            let bytes = B64.decode(cover_b64)
                .map_err(|e| format!("Invalid base64 cover art: {e}"))?;
            // Detect MIME type from magic bytes
            let mime = if bytes.starts_with(b"\xff\xd8\xff") {
                "image/jpeg"
            } else if bytes.starts_with(b"\x89PNG") {
                "image/png"
            } else {
                "image/jpeg"
            };
            tag.remove_picture_type(metaflac::block::PictureType::CoverFront);
            tag.add_picture(mime, metaflac::block::PictureType::CoverFront, bytes);
        }

        tag.write_to_path(path)
            .map_err(|e| format!("Failed to write FLAC tag: {e}"))
    }

    fn get_cover_art(path: &Path) -> Result<Option<String>, String> {
        let tag = Tag::read_from_path(path)
            .map_err(|e| format!("Failed to read FLAC tag: {e}"))?;

        let picture = tag.pictures()
            .find(|p| p.picture_type == metaflac::block::PictureType::CoverFront)
            .or_else(|| tag.pictures().next());

        Ok(picture.map(|p| B64.encode(&p.data)))
    }

    fn supported_extensions() -> Vec<&'static str> {
        vec!["flac"]
    }
}
