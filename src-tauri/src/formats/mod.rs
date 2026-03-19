use std::path::Path;
use crate::commands::metadata::Metadata;

pub mod flac;

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
