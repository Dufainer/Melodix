use rodio::{Decoder, OutputStream, OutputStreamHandle, Sink, Source};
use serde::Serialize;
use souvlaki::{
    MediaControlEvent, MediaControls, MediaMetadata, MediaPlayback, MediaPosition, PlatformConfig,
};
use std::collections::VecDeque;
use std::io::{Cursor, Read, Seek, SeekFrom};
use std::sync::{Arc, Mutex};
use std::time::Duration;

// 10-band parametric equalizer

pub const NUM_BANDS: usize = 10;
const CENTER_FREQS: [f64; NUM_BANDS] = [32.0, 64.0, 125.0, 250.0, 500.0, 1000.0, 2000.0, 4000.0, 8000.0, 16000.0];
const EQ_Q: f64 = 1.41;

struct BiquadCoeffs { b0: f64, b1: f64, b2: f64, a1: f64, a2: f64 }

impl BiquadCoeffs {
    fn identity() -> Self { Self { b0: 1.0, b1: 0.0, b2: 0.0, a1: 0.0, a2: 0.0 } }

    fn peaking(freq: f64, sample_rate: f64, gain_db: f64) -> Self {
        if gain_db.abs() < 0.01 { return Self::identity(); }
        let a     = 10f64.powf(gain_db / 40.0);
        let w0    = 2.0 * std::f64::consts::PI * freq / sample_rate;
        let alpha = w0.sin() / (2.0 * EQ_Q);
        let cos_w = w0.cos();
        let b0 = 1.0 + alpha * a;
        let b1 = -2.0 * cos_w;
        let b2 = 1.0 - alpha * a;
        let a0 = 1.0 + alpha / a;
        let a1 = -2.0 * cos_w;
        let a2 = 1.0 - alpha / a;
        Self { b0: b0/a0, b1: b1/a0, b2: b2/a0, a1: a1/a0, a2: a2/a0 }
    }
}

struct BiquadState { b0: f64, b1: f64, b2: f64, a1: f64, a2: f64, x1: f64, x2: f64, y1: f64, y2: f64 }

impl BiquadState {
    fn new(c: BiquadCoeffs) -> Self {
        Self { b0: c.b0, b1: c.b1, b2: c.b2, a1: c.a1, a2: c.a2, x1: 0.0, x2: 0.0, y1: 0.0, y2: 0.0 }
    }
    fn update(&mut self, c: BiquadCoeffs) {
        self.b0 = c.b0; self.b1 = c.b1; self.b2 = c.b2;
        self.a1 = c.a1; self.a2 = c.a2;
        // Keep history buffers to avoid discontinuity
    }
    fn process(&mut self, x: f64) -> f64 {
        let y = self.b0*x + self.b1*self.x1 + self.b2*self.x2 - self.a1*self.y1 - self.a2*self.y2;
        self.x2 = self.x1; self.x1 = x;
        self.y2 = self.y1; self.y1 = y;
        y
    }
}

/// Wraps any `Source<Item = i16>` and applies a live-updatable 10-band peaking EQ.
struct EqSource<S: Source<Item = i16>> {
    inner:          S,
    eq_bands:       Arc<Mutex<[f32; NUM_BANDS]>>,
    eq_enabled:     Arc<Mutex<bool>>,
    filters:        Vec<Vec<BiquadState>>, // [channel][band]
    channels:       u16,
    sample_rate:    u32,
    current_ch:     u16,
    last_gains:     [f32; NUM_BANDS],
    check_every:    u32,
    sample_count:   u32,
}

impl<S: Source<Item = i16>> EqSource<S> {
    fn new(inner: S, eq_bands: Arc<Mutex<[f32; NUM_BANDS]>>, eq_enabled: Arc<Mutex<bool>>) -> Self {
        let channels    = inner.channels().max(1);
        let sample_rate = inner.sample_rate().max(1);
        let gains       = *eq_bands.lock().unwrap();
        let enabled     = *eq_enabled.lock().unwrap();
        let effective: [f32; NUM_BANDS] = if enabled { gains } else { [0.0; NUM_BANDS] };

        let filters = (0..channels as usize).map(|_| {
            (0..NUM_BANDS).map(|b| {
                BiquadState::new(BiquadCoeffs::peaking(CENTER_FREQS[b], sample_rate as f64, effective[b] as f64))
            }).collect::<Vec<_>>()
        }).collect::<Vec<_>>();

        EqSource {
            inner, eq_bands, eq_enabled, filters, channels, sample_rate,
            current_ch: 0,
            last_gains: effective,
            check_every: sample_rate * channels as u32 / 10, // check ~10× per second
            sample_count: 0,
        }
    }

    fn maybe_update(&mut self) {
        let enabled  = *self.eq_enabled.lock().unwrap();
        let gains    = *self.eq_bands.lock().unwrap();
        let effective: [f32; NUM_BANDS] = if enabled { gains } else { [0.0; NUM_BANDS] };
        if effective == self.last_gains { return; }
        self.last_gains = effective;
        for ch in &mut self.filters {
            for (b, f) in ch.iter_mut().enumerate() {
                f.update(BiquadCoeffs::peaking(CENTER_FREQS[b], self.sample_rate as f64, effective[b] as f64));
            }
        }
    }
}

impl<S: Source<Item = i16>> Iterator for EqSource<S> {
    type Item = i16;
    fn next(&mut self) -> Option<i16> {
        if self.sample_count % self.check_every == 0 { self.maybe_update(); }
        self.sample_count = self.sample_count.wrapping_add(1);

        let sample = self.inner.next()?;
        let ch = self.current_ch as usize;
        self.current_ch = (self.current_ch + 1) % self.channels;

        let mut v = sample as f64 / 32768.0;
        for f in &mut self.filters[ch] { v = f.process(v); }
        Some((v * 32768.0).clamp(-32767.0, 32767.0) as i16)
    }
}

impl<S: Source<Item = i16>> Source for EqSource<S> {
    fn current_frame_len(&self) -> Option<usize> { self.inner.current_frame_len() }
    fn channels(&self)                           -> u16 { self.channels }
    fn sample_rate(&self)                        -> u32 { self.sample_rate }
    fn total_duration(&self)                     -> Option<Duration> { self.inner.total_duration() }
}

// Audio effects: Reverb (Freeverb) + Speed/Pitch

#[derive(Clone)]
pub struct EffectParams {
    pub speed:        f32,  // 0.5 – 2.0  (1.0 = normal; also shifts pitch)
    pub reverb_room:  f32,  // 0.0 – 1.0  room size
    pub reverb_damp:  f32,  // 0.0 – 1.0  high-freq damping
    pub reverb_wet:   f32,  // 0.0 – 1.0  wet/dry mix
    pub effect_8d:    bool, // rotating stereo pan (8D audio)
    pub speed_8d:     f32,  // 0.05 – 0.5 Hz — LFO sweep rate
}

impl Default for EffectParams {
    fn default() -> Self {
        Self { speed: 1.0, reverb_room: 0.0, reverb_damp: 0.5, reverb_wet: 0.0, effect_8d: false, speed_8d: 0.2 }
    }
}

// Lowpass-feedback comb filter (Freeverb)
struct CombFilter { buf: Vec<f32>, pos: usize, feedback: f32, damp: f32, store: f32 }

impl CombFilter {
    fn new(size: usize) -> Self { Self { buf: vec![0.0; size.max(1)], pos: 0, feedback: 0.5, damp: 0.5, store: 0.0 } }
    fn process(&mut self, x: f32) -> f32 {
        let out = self.buf[self.pos];
        self.store = out * (1.0 - self.damp) + self.store * self.damp;
        self.buf[self.pos] = x + self.store * self.feedback;
        self.pos = (self.pos + 1) % self.buf.len();
        out
    }
}

// All-pass filter (Freeverb)
struct AllpassFilter { buf: Vec<f32>, pos: usize }

impl AllpassFilter {
    fn new(size: usize) -> Self { Self { buf: vec![0.0; size.max(1)], pos: 0 } }
    fn process(&mut self, x: f32) -> f32 {
        let bufout = self.buf[self.pos];
        self.buf[self.pos] = x + bufout * 0.5;
        self.pos = (self.pos + 1) % self.buf.len();
        -x + bufout
    }
}

/// One-channel Freeverb reverb processor.
struct ChannelReverb { combs: Vec<CombFilter>, allpasses: Vec<AllpassFilter> }

impl ChannelReverb {
    fn new(sample_rate: u32, spread: usize) -> Self {
        let s = sample_rate as f64 / 44100.0;
        let c = |d: usize| CombFilter::new(((d + spread) as f64 * s) as usize);
        let a = |d: usize| AllpassFilter::new(((d + spread) as f64 * s) as usize);
        Self {
            combs:    vec![c(1116), c(1188), c(1277), c(1356), c(1422), c(1491), c(1557), c(1617)],
            allpasses: vec![a(556), a(441), a(341), a(225)],
        }
    }

    fn set_params(&mut self, room: f32, damp: f32) {
        let fb = 0.28 + room * 0.7;
        let dm = damp * 0.4;
        for c in &mut self.combs { c.feedback = fb; c.damp = dm; }
    }

    fn process(&mut self, x: f32) -> f32 {
        let mut out: f32 = self.combs.iter_mut().map(|c| c.process(x)).sum();
        out *= 0.015;  // fixedgain — normalise 8 parallel combs
        for ap in &mut self.allpasses { out = ap.process(out); }
        out
    }
}

/// Wraps any `Source<Item = i16>` applying live-updatable reverb + speed/pitch change.
/// Speed works by reporting a scaled `sample_rate()` so rodio's mixer resamples accordingly.
struct EffectsSource<S: Source<Item = i16>> {
    inner:        S,
    params:       Arc<Mutex<EffectParams>>,
    reverb:       Vec<ChannelReverb>,  // one per channel
    channels:     u16,
    inner_rate:   u32,  // original sample rate (before speed)
    current_ch:   u16,
    last:         EffectParams,
    check_every:  u32,
    sample_count: u32,
    frame_count:  u64, // stereo frames elapsed (for 8D LFO)
}

impl<S: Source<Item = i16>> EffectsSource<S> {
    fn new(inner: S, params: Arc<Mutex<EffectParams>>) -> Self {
        let channels  = inner.channels().max(1);
        let rate      = inner.sample_rate().max(1);
        let p         = params.lock().unwrap().clone();
        let reverb: Vec<ChannelReverb> = (0..channels as usize).map(|ch| {
            let mut r = ChannelReverb::new(rate, ch * 23);
            r.set_params(p.reverb_room, p.reverb_damp);
            r
        }).collect();
        EffectsSource {
            inner, params, reverb, channels, inner_rate: rate,
            current_ch: 0,
            last: p,
            check_every: rate * channels as u32 / 10,
            sample_count: 0,
            frame_count: 0,
        }
    }

    fn maybe_update(&mut self) {
        let p = self.params.lock().unwrap().clone();
        let room_changed = (p.reverb_room - self.last.reverb_room).abs() > 0.001
            || (p.reverb_damp - self.last.reverb_damp).abs() > 0.001;
        if room_changed {
            for r in &mut self.reverb { r.set_params(p.reverb_room, p.reverb_damp); }
        }
        self.last = p;
    }
}

impl<S: Source<Item = i16>> Iterator for EffectsSource<S> {
    type Item = i16;
    fn next(&mut self) -> Option<i16> {
        if self.sample_count % self.check_every == 0 { self.maybe_update(); }
        self.sample_count = self.sample_count.wrapping_add(1);

        let sample = self.inner.next()?;
        let ch = self.current_ch as usize;
        self.current_ch = (self.current_ch + 1) % self.channels;
        // Advance frame counter once per complete stereo frame (when we wrap back to ch 0)
        if self.current_ch == 0 { self.frame_count = self.frame_count.wrapping_add(1); }

        let dry = sample as f32 / 32768.0;

        // Reverb
        let wet = self.last.reverb_wet;
        let mut out = if wet > 0.0 {
            let rev = self.reverb[ch].process(dry);
            dry * (1.0 - wet) + rev * wet
        } else { dry };

        // 8D auto-panner: LFO sweeps equal-power pan left↔right
        if self.last.effect_8d && self.channels >= 2 {
            use std::f64::consts::PI;
            let t     = self.frame_count as f64 / self.inner_rate as f64;
            let lfo   = (2.0 * PI * self.last.speed_8d as f64 * t).sin(); // -1..+1
            let angle = (lfo + 1.0) * PI / 4.0;                           // 0..π/2
            out *= if ch == 0 { angle.cos() as f32 } else { angle.sin() as f32 };
        }

        Some((out * 32768.0).clamp(-32767.0, 32767.0) as i16)
    }
}

impl<S: Source<Item = i16>> Source for EffectsSource<S> {
    fn current_frame_len(&self) -> Option<usize> { self.inner.current_frame_len() }
    fn channels(&self)          -> u16 { self.channels }
    /// Report speed-adjusted rate so rodio resamples → changes playback speed + pitch.
    fn sample_rate(&self)       -> u32 { (self.inner_rate as f32 * self.last.speed).max(1.0) as u32 }
    fn total_duration(&self)    -> Option<Duration> { self.inner.total_duration() }
}

// Seekable audio source via symphonia
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

// MPRIS commands

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

// State

pub struct AudioState {
    pub handle: OutputStreamHandle,
    pub sink: Arc<Mutex<Option<Sink>>>,
    pub duration_secs: Arc<Mutex<f64>>,
    /// Raw bytes of the current track — kept in memory so seek can use Cursor (seekable)
    pub current_bytes: Arc<Mutex<Option<Vec<u8>>>>,
    /// When seek rebuilds the sink, get_pos() resets to 0. This offset corrects it.
    pub seek_offset: Arc<Mutex<f64>>,
    pub mpris_tx: std::sync::mpsc::SyncSender<MprisCmd>,
    pub eq_bands:      Arc<Mutex<[f32; NUM_BANDS]>>,
    pub eq_enabled:    Arc<Mutex<bool>>,
    pub effect_params: Arc<Mutex<EffectParams>>,
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
        eq_bands:      Arc::new(Mutex::new([0.0f32; NUM_BANDS])),
        eq_enabled:    Arc::new(Mutex::new(false)),
        effect_params: Arc::new(Mutex::new(EffectParams::default())),
    }
}

// Commands

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
    let raw = Decoder::new(Cursor::new(bytes.clone()))
        .map_err(|e| format!("Cannot decode audio: {e}"))?;

    let duration = raw
        .total_duration()
        .map(|d: Duration| d.as_secs_f64())
        .unwrap_or(0.0);

    let eq     = EqSource::new(raw, Arc::clone(&state.eq_bands), Arc::clone(&state.eq_enabled));
    let source = EffectsSource::new(eq, Arc::clone(&state.effect_params));

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
    let raw    = SeekSource::new(bytes, position)?;
    let eq     = EqSource::new(raw, Arc::clone(&state.eq_bands), Arc::clone(&state.eq_enabled));
    let source = EffectsSource::new(eq, Arc::clone(&state.effect_params));

    let new_sink = Sink::try_new(&state.handle)
        .map_err(|e| format!("Cannot create sink: {e}"))?;
    new_sink.append(source);
    if was_paused { new_sink.pause(); }

    *state.sink.lock().unwrap() = Some(new_sink);
    // New sink's get_pos() starts at 0; add seek position so the bar shows correctly
    *state.seek_offset.lock().unwrap() = position;
    Ok(())
}

/// Update audio effects (speed/pitch, reverb, 8D).
#[tauri::command]
pub fn player_set_effects(
    state: tauri::State<AudioState>,
    speed: f32, reverb_room: f32, reverb_damp: f32, reverb_wet: f32,
    effect_8d: bool, speed_8d: f32,
) {
    *state.effect_params.lock().unwrap() = EffectParams {
        speed:       speed.clamp(0.5, 2.0),
        reverb_room: reverb_room.clamp(0.0, 1.0),
        reverb_damp: reverb_damp.clamp(0.0, 1.0),
        reverb_wet:  reverb_wet.clamp(0.0, 1.0),
        effect_8d,
        speed_8d:    speed_8d.clamp(0.05, 0.5),
    };
}

/// Update EQ bands (gains in dB, -12..+12) and enable/disable.
#[tauri::command]
pub fn player_set_eq(state: tauri::State<AudioState>, bands: [f32; 10], enabled: bool) {
    *state.eq_bands.lock().unwrap()   = bands;
    *state.eq_enabled.lock().unwrap() = enabled;
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
