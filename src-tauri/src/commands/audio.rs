use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
use serde::Serialize;
use souvlaki::{
    MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, MediaPosition, PlatformConfig,
};
use std::collections::VecDeque;
use std::io::{Cursor, Read, Seek, SeekFrom};
use std::sync::{Arc, Mutex};
use std::time::Duration;

// ── Seekable audio source via symphonia directly ───────────────────────────────
//
// rodio's ReadSeekSource always returns byte_len() = None, which makes
// symphonia's FLAC reader return Unseekable. We bypass this by wrapping
// Cursor<Vec<u8>> in our own MediaSource that returns the real byte length.

struct KnownLenCursor {
    cursor: Cursor<Vec<u8>>,
    len: u64,
}
impl Read for KnownLenCursor {
    fn read(&mut self, buf: &mut [u8]) -> std::io::Result<usize> { self.cursor.read(buf) }
}
impl Seek for KnownLenCursor {
    fn seek(&mut self, pos: SeekFrom) -> std::io::Result<u64> { self.cursor.seek(pos) }
}
impl symphonia::core::io::MediaSource for KnownLenCursor {
    fn is_seekable(&self) -> bool { true }
    fn byte_len(&self) -> Option<u64> { Some(self.len) }
}

/// rodio::Source backed by a symphonia decoder, seeked to `seek_to` at construction.
struct SeekSource {
    format: Box<dyn symphonia::core::formats::FormatReader>,
    decoder: Box<dyn symphonia::core::codecs::Decoder>,
    track_id: u32,
    sample_rate: u32,
    channels: u16,
    buf: VecDeque<i16>,
    done: bool,
}

impl SeekSource {
    fn new(bytes: Vec<u8>, seek_secs: f64) -> Result<Self, String> {
        use symphonia::core::{
            codecs::{DecoderOptions, CODEC_TYPE_NULL},
            formats::{FormatOptions, SeekMode, SeekTo},
            io::MediaSourceStream,
            meta::MetadataOptions,
            probe::Hint,
            units::Time,
        };

        let len = bytes.len() as u64;
        let src = KnownLenCursor { cursor: Cursor::new(bytes), len };
        let mss = MediaSourceStream::new(Box::new(src), Default::default());

        let probed = symphonia::default::get_probe()
            .format(&Hint::new(), mss, &FormatOptions::default(), &MetadataOptions::default())
            .map_err(|e| format!("probe: {e}"))?;

        let mut format = probed.format;

        let track = format.tracks().iter()
            .find(|t| t.codec_params.codec != CODEC_TYPE_NULL)
            .ok_or_else(|| "no audio track".to_string())?;

        let track_id    = track.id;
        let sample_rate = track.codec_params.sample_rate.unwrap_or(44100);
        let channels    = track.codec_params.channels.map(|c| c.count()).unwrap_or(2) as u16;

        let decoder = symphonia::default::get_codecs()
            .make(&track.codec_params, &DecoderOptions::default())
            .map_err(|e| format!("decoder: {e}"))?;

        if seek_secs > 0.0 {
            format.seek(SeekMode::Accurate, SeekTo::Time {
                time: Time::from(seek_secs),
                track_id: Some(track_id),
            }).map_err(|e| format!("seek: {e}"))?;
        }

        Ok(SeekSource { format, decoder, track_id, sample_rate, channels, buf: VecDeque::new(), done: false })
    }

    fn fill(&mut self) {
        use symphonia::core::audio::SampleBuffer;
        // Fill until we have at least 16 384 samples buffered (~93 ms at 44 100 Hz stereo)
        // to avoid ALSA underruns caused by decoding one tiny packet at a time.
        while self.buf.len() < 16_384 {
            let packet = match self.format.next_packet() {
                Ok(p) => p,
                Err(_) => { self.done = true; return; }
            };
            if packet.track_id() != self.track_id { continue; }
            match self.decoder.decode(&packet) {
                Ok(decoded) => {
                    let spec = *decoded.spec();
                    let mut sb = SampleBuffer::<i16>::new(decoded.capacity() as u64, spec);
                    sb.copy_interleaved_ref(decoded);
                    self.buf.extend(sb.samples().iter().copied());
                }
                Err(_) => continue,
            }
        }
    }
}

impl Iterator for SeekSource {
    type Item = i16;
    fn next(&mut self) -> Option<i16> {
        if self.buf.len() < 4_096 {
            if self.done && self.buf.is_empty() { return None; }
            if !self.done { self.fill(); }
        }
        self.buf.pop_front()
    }
}

impl Source for SeekSource {
    fn current_frame_len(&self) -> Option<usize> { None }
    fn channels(&self) -> u16 { self.channels }
    fn sample_rate(&self) -> u32 { self.sample_rate }
    fn total_duration(&self) -> Option<Duration> { None }
}

// ── MPRIS Commands ─────────────────────────────────────────────────────────────

pub enum MprisCmd {
    Metadata {
        title: String,
        artist: String,
        album: String,
        duration: Option<f64>,
    },
    Playing {
        pos: f64,
    },
    Paused {
        pos: f64,
    },
    Stopped,
}

// ── State ──────────────────────────────────────────────────────────────────────

pub struct AudioState {
    pub handle: OutputStreamHandle,
    pub sink: Arc<Mutex<Option<Sink>>>,
    pub duration_secs: Arc<Mutex<f64>>,
    /// Raw bytes of the current track — kept in memory so seek can use Cursor (seekable)
    pub current_bytes: Arc<Mutex<Option<Vec<u8>>>>,
    /// When seek rebuilds the sink, get_pos() resets to 0. This offset corrects it.
    pub seek_offset: Arc<Mutex<f64>>,
    pub mpris_tx: std::sync::mpsc::SyncSender<MprisCmd>,
}

/// Create AudioState. Leaks the OutputStream so it lives for the entire program.
pub fn init_audio(app_handle: tauri::AppHandle) -> AudioState {
    let (stream, handle) = OutputStream::try_default()
        .expect("Failed to open audio output device");

    // OutputStream is !Send, so we leak it to keep it alive for the program lifetime.
    Box::leak(Box::new(stream));

    let (tx, rx) = std::sync::mpsc::sync_channel::<MprisCmd>(32);

    // Spawn MPRIS thread
    std::thread::spawn(move || {
        let config = PlatformConfig {
            dbus_name: "melodix",
            display_name: "Melodix",
            hwnd: None,
        };

        let mut controls = match MediaControls::new(config) {
            Ok(c) => c,
            Err(e) => {
                eprintln!("[MPRIS] Failed to initialize: {e:?}");
                // drain channel and exit thread
                loop {
                    rx.recv().ok();
                }
            }
        };

        use tauri::Emitter;
        let app = app_handle.clone();
        if let Err(e) = controls.attach(move |event: MediaControlEvent| {
            let action = match event {
                MediaControlEvent::Play => "play",
                MediaControlEvent::Pause => "pause",
                MediaControlEvent::Toggle => "toggle",
                MediaControlEvent::Next => "next",
                MediaControlEvent::Previous => "prev",
                MediaControlEvent::Stop => "stop",
                _ => return,
            };
            app.emit("mpris-control", action).ok();
        }) {
            eprintln!("[MPRIS] Failed to attach handler: {e:?}");
        }

        // Initial state: stopped
        controls.set_playback(MediaPlayback::Stopped).ok();

        loop {
            while let Ok(cmd) = rx.try_recv() {
                match cmd {
                    MprisCmd::Metadata { title, artist, album, duration } => {
                        controls
                            .set_metadata(MediaMetadata {
                                title: Some(&title),
                                artist: Some(&artist),
                                album: Some(&album),
                                duration: duration.map(Duration::from_secs_f64),
                                ..Default::default()
                            })
                            .ok();
                    }
                    MprisCmd::Playing { pos } => {
                        controls
                            .set_playback(MediaPlayback::Playing {
                                progress: Some(MediaPosition(Duration::from_secs_f64(pos))),
                            })
                            .ok();
                    }
                    MprisCmd::Paused { pos } => {
                        controls
                            .set_playback(MediaPlayback::Paused {
                                progress: Some(MediaPosition(Duration::from_secs_f64(pos))),
                            })
                            .ok();
                    }
                    MprisCmd::Stopped => {
                        controls.set_playback(MediaPlayback::Stopped).ok();
                    }
                }
            }
            std::thread::sleep(Duration::from_millis(50));
        }
    });

    AudioState {
        handle,
        sink: Arc::new(Mutex::new(None)),
        duration_secs: Arc::new(Mutex::new(0.0)),
        current_bytes: Arc::new(Mutex::new(None)),
        seek_offset: Arc::new(Mutex::new(0.0)),
        mpris_tx: tx,
    }
}

// ── Commands ──────────────────────────────────────────────────────────────────

#[derive(Serialize)]
pub struct PlayerState {
    pub position: f64,
    pub duration: f64,
    pub finished: bool,
}

/// Load and start playing a file. Returns duration in seconds.
#[tauri::command]
pub fn player_play(
    state: tauri::State<AudioState>,
    path: String,
    title: Option<String>,
    artist: Option<String>,
    album: Option<String>,
) -> Result<f64, String> {
    // Load into memory so Cursor<Vec<u8>> gives symphonia a seekable stream
    let bytes = std::fs::read(&path).map_err(|e| format!("Cannot read file: {e}"))?;
    let source = Decoder::new(Cursor::new(bytes.clone()))
        .map_err(|e| format!("Cannot decode audio: {e}"))?;

    let duration = source
        .total_duration()
        .map(|d: Duration| d.as_secs_f64())
        .unwrap_or(0.0);

    let sink = Sink::try_new(&state.handle)
        .map_err(|e| format!("Cannot create audio sink: {e}"))?;
    sink.append(source);

    let mut guard = state.sink.lock().unwrap();
    *guard = Some(sink);
    *state.duration_secs.lock().unwrap() = duration;
    *state.current_bytes.lock().unwrap() = Some(bytes);
    *state.seek_offset.lock().unwrap() = 0.0;

    // Update MPRIS
    state.mpris_tx.try_send(MprisCmd::Metadata {
        title: title.unwrap_or_default(),
        artist: artist.unwrap_or_default(),
        album: album.unwrap_or_default(),
        duration: if duration > 0.0 { Some(duration) } else { None },
    }).ok();
    state.mpris_tx.try_send(MprisCmd::Playing { pos: 0.0 }).ok();

    Ok(duration)
}

/// Pause playback.
#[tauri::command]
pub fn player_pause(state: tauri::State<AudioState>) {
    if let Some(sink) = state.sink.lock().unwrap().as_ref() {
        sink.pause();
        let pos = sink.get_pos().as_secs_f64();
        state.mpris_tx.try_send(MprisCmd::Paused { pos }).ok();
    }
}

/// Resume playback.
#[tauri::command]
pub fn player_resume(state: tauri::State<AudioState>) {
    if let Some(sink) = state.sink.lock().unwrap().as_ref() {
        sink.play();
        let pos = sink.get_pos().as_secs_f64();
        state.mpris_tx.try_send(MprisCmd::Playing { pos }).ok();
    }
}

/// Stop and clear the current track.
#[tauri::command]
pub fn player_stop(state: tauri::State<AudioState>) {
    *state.sink.lock().unwrap() = None;
    *state.duration_secs.lock().unwrap() = 0.0;
    state.mpris_tx.try_send(MprisCmd::Stopped).ok();
}

/// Set volume (0.0 – 1.0).
#[tauri::command]
pub fn player_set_volume(state: tauri::State<AudioState>, volume: f32) {
    if let Some(sink) = state.sink.lock().unwrap().as_ref() {
        sink.set_volume(volume);
    }
}

/// Seek to position in seconds — instant via SeekSource (symphonia with byte_len).
#[tauri::command]
pub fn player_seek(state: tauri::State<AudioState>, position: f64) -> Result<(), String> {
    let bytes = state.current_bytes.lock().unwrap().clone()
        .ok_or_else(|| "No track loaded".to_string())?;

    let was_paused = state.sink.lock().unwrap()
        .as_ref()
        .map(|s| s.is_paused())
        .unwrap_or(false);

    // SeekSource uses KnownLenCursor so symphonia can binary-search (instant seek)
    let source = SeekSource::new(bytes, position)?;

    let new_sink = Sink::try_new(&state.handle)
        .map_err(|e| format!("Cannot create sink: {e}"))?;
    new_sink.append(source);
    if was_paused { new_sink.pause(); }

    *state.sink.lock().unwrap() = Some(new_sink);
    // New sink's get_pos() starts at 0; add seek position so the bar shows correctly
    *state.seek_offset.lock().unwrap() = position;
    Ok(())
}

/// Poll current playback state.
#[tauri::command]
pub fn player_get_state(state: tauri::State<AudioState>) -> PlayerState {
    let guard = state.sink.lock().unwrap();
    match guard.as_ref() {
        None => PlayerState { position: 0.0, duration: 0.0, finished: true },
        Some(sink) => {
            let offset = *state.seek_offset.lock().unwrap();
            PlayerState {
                position: sink.get_pos().as_secs_f64() + offset,
                duration: *state.duration_secs.lock().unwrap(),
                finished: sink.empty(),
            }
        }
    }
}
