# Melodix

> Native desktop music player and audio metadata manager — built with Tauri v2, React 19, and Rust.

**v0.2.0** · Linux (x86_64) · Tauri v2 · MIT

---

## Overview

Melodix is a local-first music player focused on audio quality, metadata control, and low resource usage. It runs as a native binary via Tauri — the frontend is rendered in a WebView, and all audio processing, file I/O, and tag reading/writing happen in a Rust backend with no Electron overhead.

---

## Architecture

```
melodix/
├── src-tauri/                  Rust backend (Tauri v2)
│   └── src/
│       ├── lib.rs              Command registration, app setup
│       ├── commands/
│       │   ├── audio.rs        Playback engine: rodio + symphonia, 10-band EQ,
│       │   │                   reverb/speed/pitch DSP, MPRIS integration
│       │   ├── scanner.rs      Recursive folder scan with format dispatch
│       │   ├── metadata.rs     Tag read/write, cover art, fetch from iTunes/lrclib
│       │   └── files.rs        File rename, folder organisation, conflict resolution
│       └── formats/
│           ├── mod.rs          Format registry + shared symphonia probe helper
│           ├── flac.rs         FLAC via metaflac
│           ├── mp3.rs          MP3/ID3v2 via id3
│           └── wav.rs          WAV/ID3v2 via id3
└── src/                        React 19 + TypeScript frontend
    ├── store/index.ts          Zustand global state (library, player, playlists, likes)
    ├── types/index.ts          Shared RawTrack / Track types
    ├── utils.ts                Shared formatting utilities
    ├── hooks/
    │   ├── useTheme.ts         Theme application + per-theme vocabulary
    │   └── useKeyboard.ts      Global keyboard shortcuts
    ├── themes/
    │   ├── config.ts           CSS variable definitions per theme (source of truth)
    │   └── labels.ts           Per-theme UI vocabulary (all text strings)
    ├── components/
    │   ├── Player.tsx          Mini player bar (persistent, bottom)
    │   ├── NowPlaying.tsx      Full-screen overlay with cover art and controls
    │   ├── Sidebar.tsx         Navigation + playlist list
    │   ├── EqPanel.tsx         10-band EQ with vertical drag sliders
    │   ├── Library.tsx         Track table
    │   ├── Editor.tsx          Single-track metadata editor
    │   ├── BulkEditor.tsx      Multi-track metadata editor
    │   ├── CoverArt.tsx        Lazy-loading cover art (IntersectionObserver)
    │   ├── LazyCover.tsx       Concurrency-limited cover fetch for grid/list
    │   └── AddToPlaylist.tsx   Popover for adding a track to any playlist
    └── pages/
        ├── Home.tsx            Dashboard: Your Mix, Recently Played, Daily Mix, Stats
        ├── PlayerPage.tsx      Library views: Songs / Albums / Artists (per-theme layouts)
        ├── GenrePage.tsx       Genre browser and detail
        ├── PlaylistPage.tsx    Playlist detail with drag-to-reorder
        ├── Likes.tsx           Liked tracks
        ├── StatsPage.tsx       Play count, top tracks/albums/artists, time breakdown
        └── Settings.tsx        App settings, theme picker, folder management
```

---

## Features

### Playback
- Audio engine: **rodio 0.20** with **symphonia** as the decoder backend
- Gapless-capable, instant seek via binary search (no decoding delay)
- **10-band parametric EQ** (32 Hz – 16 kHz, ±12 dB per band, biquad IIR)
- **DSP effects**: room reverb (Freeverb algorithm), playback speed (0.5×–2×), pitch shift
- Shuffle, repeat (off / all / one)
- **MPRIS2** integration — media keys, system tray applets, `playerctl` compatible

### Library
- Recursive folder scan — multiple root folders supported
- Views: Songs, Albums, Artists, Genres
- Per-view search and filter
- Lazy cover art with a global concurrency queue (avoids I/O saturation on large libraries)
- Format badge (FLAC, MP3, WAV, …) and quality metadata (sample rate, bitrate)

### Metadata
- Read and write tags without re-encoding audio data
- Fields: title, artist, album, genre, year, track/disc number, composer, comment, lyrics
- Embed / extract cover art (stored as base64 JPEG/PNG in tags)
- **Bulk editor** — edit multiple tracks simultaneously with field-level apply/skip
- **Auto-fetch** from iTunes Search API (title, artist, album, genre, year, cover art)
- **Auto-fetch lyrics** from [lrclib.net](https://lrclib.net) (timestamped LRC format)
- File rename and folder organisation by configurable pattern: `{artist}/{album}/{track} - {title}`
- Conflict resolution UI for duplicate filenames

### UI
- **12 themes** with per-theme CSS variables, layout variants, and UI vocabulary:
  `default`, `anime`, `balmain`, `goth`, `rambo`, `blame`, `cyberpunk`, `ocean`, `vaporwave`, `minimal`, `forest`, `ember`
- Each theme ships a custom song list layout (numbered grid, cassette style, terminal rows, etc.)
- **Performance mode** — disables all animations, transitions, blur effects, and ambient cover art renders via a single `[data-perf]` CSS attribute selector with `!important` overrides
- Global keyboard shortcuts (space, arrow keys, `m`, `l`)
- Per-theme palette editor (live CSS variable editing, exportable)

### Playlists & Likes
- Create, rename, delete playlists
- Add tracks from any context (song row, mini player, Now Playing)
- Like tracks; dedicated Likes view
- Export / import playlists
- Queue management with clear confirmation

---

## Supported Formats

| Format | Playback | Tag Read | Tag Write | Notes |
|--------|----------|----------|-----------|-------|
| FLAC   | ✅       | ✅       | ✅        | via metaflac |
| MP3    | ✅       | ✅       | ✅        | ID3v2 via id3 crate |
| WAV    | ✅       | ✅       | ✅        | ID3v2 in WAV container |
| AAC    | ✅       | —        | —         | playback only |
| OGG    | ✅       | —        | —         | playback only |
| OPUS   | ✅       | —        | —         | playback only |
| AIFF   | ✅       | —        | —         | playback only |

---

## Tech Stack

| Layer        | Technology                                  | Version  |
|--------------|---------------------------------------------|----------|
| App runtime  | Tauri                                       | v2       |
| Frontend     | React + TypeScript                          | 19 / 5.8 |
| Styling      | Tailwind CSS                                | v4       |
| State        | Zustand                                     | v5       |
| Routing      | React Router                                | v7       |
| Virtualisation | @tanstack/react-virtual                   | v3       |
| Icons        | Lucide React                                | —        |
| Audio engine | rodio (symphonia backend)                   | 0.20     |
| Audio decode | symphonia                                   | 0.5      |
| FLAC tags    | metaflac                                    | 0.2      |
| MP3/WAV tags | id3                                         | 1        |
| MPRIS        | souvlaki                                    | 0.7      |
| Serialisation | serde + serde_json                         | 1        |
| Build tool   | Vite                                        | v7       |

---

## Prerequisites

**Rust** (stable toolchain via [rustup](https://rustup.rs)) and **Node.js ≥ 20** are required.

### Arch / CachyOS / Manjaro

```bash
sudo pacman -S webkit2gtk-4.1 libayatana-appindicator base-devel gtk3 alsa-lib dbus
```

### Ubuntu / Debian

```bash
sudo apt install libwebkit2gtk-4.1-dev libayatana-appindicator3-dev \
  libgtk-3-dev libasound2-dev libdbus-1-dev build-essential
```

---

## Getting Started

```bash
git clone https://github.com/Dufainer/Melodix
cd Melodix
npm install
```

### Development

```bash
npm run tauri dev
```

Starts Vite dev server on `http://localhost:1420` with HMR and opens the Tauri window. Rust code recompiles on change.

### Production build

```bash
npm run tauri build
```

Output (Linux):
```
src-tauri/target/release/bundle/appimage/melodix_0.2.0_amd64.AppImage
src-tauri/target/release/bundle/deb/melodix_0.2.0_amd64.deb
```

### Lint / Format

```bash
npm run lint       # ESLint (TypeScript)
npm run format     # Prettier
```

---

## Security

- Tauri capability system restricts frontend access to a minimal set of Rust commands
- File operations are scoped: `organize_tracks` and `rename_track` enforce that all output paths remain within the original music folder (lexical `is_within()` check + `canonicalize()` on base dir)
- Directory traversal via `..` or `.` path segments is rejected before any I/O
- `WalkDir` runs with `follow_links(false)` — symlinks cannot escape the scanned folder
- No network access from the backend; external API calls (iTunes, lrclib) are made from the frontend fetch API under Tauri's CSP

---

## Platform Notes

| Platform | Status |
|----------|--------|
| Linux (x86_64) | Supported |
| Windows | Requires MSVC toolchain, Tauri WebView2 bootstrapper, and `souvlaki` MPRIS replaced with Windows media session API. Build scripts need adjustment. |
| macOS | Requires Xcode CLI tools and macOS-specific `souvlaki` backend. Code signing required for distribution. |

---

## License

[MIT](LICENSE)
