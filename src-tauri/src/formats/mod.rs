use std::path::Path;
use crate::commands::metadata::Metadata;

pub mod flac;
pub mod mp3;
pub mod wav;

/// Use symphonia to probe audio stream properties (sample_rate, bitrate, duration).
/// Works for any format supported by the rodio/symphonia-all feature set.
pub fn probe_audio_props(path: &Path) -> (u32, u32, f64) {
    use symphonia::core::codecs::CODEC_TYPE_NULL;
    use symphonia::core::formats::FormatOptions;
    use symphonia::core::io::MediaSourceStream;
    use symphonia::core::meta::MetadataOptions;
    use symphonia::core::probe::Hint;

    let Ok(file) = std::fs::File::open(path) else { return (0, 0, 0.0) };
    let file_size = file.metadata().map(|m| m.len()).unwrap_or(0);
    let mss = MediaSourceStream::new(Box::new(file), Default::default());

    let mut hint = Hint::new();
    if let Some(ext) = path.extension().and_then(|e| e.to_str()) {
        hint.with_extension(ext);
    }

    let Ok(probed) = symphonia::default::get_probe()
        .format(&hint, mss, &FormatOptions::default(), &MetadataOptions::default())
    else { return (0, 0, 0.0) };

    let Some(track) = probed.format.tracks()
        .iter()
        .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
    else { return (0, 0, 0.0) };

    let sample_rate = track.codec_params.sample_rate.unwrap_or(0);
    let n_frames    = track.codec_params.n_frames.unwrap_or(0);
    let duration    = if sample_rate > 0 && n_frames > 0 {
        n_frames as f64 / sample_rate as f64
    } else { 0.0 };
    let bitrate = if duration > 0.0 {
        ((file_size * 8) as f64 / duration / 1000.0) as u32
    } else { 0 };

    (sample_rate, bitrate, duration)
}

/// Trait every audio format must implement.
/// Adding a new format only requires:
///   1. Create src/formats/<format>.rs implementing this trait
///   2. Register it in `registry()` below
pub trait AudioFormat: Send + Sync {
    fn can_handle(path: &Path) -> bool
    where
        Self: Sized;
    fn read_metadata(path: &Path) -> Result<Metadata, String>
    where
        Self: Sized;
    fn write_metadata(path: &Path, metadata: &Metadata) -> Result<(), String>
    where
        Self: Sized;
    fn get_cover_art(path: &Path) -> Result<Option<String>, String>
    where
        Self: Sized;
    fn supported_extensions() -> Vec<&'static str>
    where
        Self: Sized;
}

/// A dynamic dispatch wrapper so we can store heterogeneous format handlers.
pub struct FormatHandler {
    pub extensions: Vec<&'static str>,
    pub can_handle_fn: fn(&Path) -> bool,
    pub read_fn: fn(&Path) -> Result<Metadata, String>,
    pub write_fn: fn(&Path, &Metadata) -> Result<(), String>,
    pub cover_fn: fn(&Path) -> Result<Option<String>, String>,
}

/// Central registry of all supported formats.
/// To add a new format, import it here and push a new `FormatHandler`.
pub fn registry() -> Vec<FormatHandler> {
    vec![
        FormatHandler {
            extensions: flac::Flac::supported_extensions(),
            can_handle_fn: flac::Flac::can_handle,
            read_fn: flac::Flac::read_metadata,
            write_fn: flac::Flac::write_metadata,
            cover_fn: flac::Flac::get_cover_art,
        },
        FormatHandler {
            extensions: mp3::Mp3::supported_extensions(),
            can_handle_fn: mp3::Mp3::can_handle,
            read_fn: mp3::Mp3::read_metadata,
            write_fn: mp3::Mp3::write_metadata,
            cover_fn: mp3::Mp3::get_cover_art,
        },
        FormatHandler {
            extensions: wav::Wav::supported_extensions(),
            can_handle_fn: wav::Wav::can_handle,
            read_fn: wav::Wav::read_metadata,
            write_fn: wav::Wav::write_metadata,
            cover_fn: wav::Wav::get_cover_art,
        },
    ]
}

/// Resolve the correct handler for a given file path.
pub fn handler_for(path: &Path) -> Option<&'static FormatHandler> {
    // SAFETY: registry() returns owned data; we leak it once for the program lifetime.
    static REGISTRY: std::sync::OnceLock<Vec<FormatHandler>> = std::sync::OnceLock::new();
    let reg = REGISTRY.get_or_init(registry);
    reg.iter().find(|h| (h.can_handle_fn)(path))
}

/// Return all extensions across every registered format.
pub fn all_supported_extensions() -> Vec<&'static str> {
    static REGISTRY: std::sync::OnceLock<Vec<FormatHandler>> = std::sync::OnceLock::new();
    let reg = REGISTRY.get_or_init(registry);
    reg.iter().flat_map(|h| h.extensions.iter().copied()).collect()
}
