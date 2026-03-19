# Melodix

A modern, cross-platform music player and audio metadata manager built with **Tauri v2**, **React 19**, **TypeScript**, and **TailwindCSS v4**.

---

## Features

### Player
- Full audio playback (FLAC, MP3, AAC, OGG, OPUS, WAV, AIFF) via rodio + symphonia
- Instant seeking with binary-search (no delay)
- Mini player bar with seek bar, volume, like button, and add-to-playlist
- Full-screen Now Playing view with blurred cover art background
- Shuffle, repeat (off / all / one)
- MPRIS integration — system media keys and media applets on Linux

### Library
- Browse by **Songs**, **Albums**, or **Artists** from the sidebar
- Drill into an album or artist to see its tracks
- Search and filter across all views
- Format badge on every track (FLAC, MP3, …)
- Scan local music folders recursively

### Playlists
- Create, rename and delete playlists
- Add any song to a playlist via the `+` button on song rows, mini player, or Now Playing
- Playlist page with Play, Shuffle and per-track remove
- All playlists persisted locally

### Likes
- Like any song from the mini player, Now Playing view, or song rows
- Dedicated Likes page listing all favourites

### Metadata / Tag Editor
- Edit title, artist, album, genre, year, track/disc number, lyrics, composer, comment
- Bulk-edit multiple tracks at once with field-level control
- Embed / extract cover art (base64 JPEG/PNG)
- Auto-fetch metadata from **iTunes** (title, artist, album, genre, year, cover art)
- Auto-fetch synced lyrics from **lrclib.net**
- Rename files and organise into folders by configurable pattern (`{artist}/{album}/{track} - {title}`)
- Conflict resolution UI for duplicate filenames

---

## Supported Formats

| Format | Playback | Tag Read | Tag Write |
|--------|----------|----------|-----------|
| FLAC   | ✅       | ✅       | ✅        |
| MP3    | ✅       | —        | Roadmap   |
| AAC    | ✅       | —        | Roadmap   |
| OGG    | ✅       | —        | Roadmap   |
| OPUS   | ✅       | —        | Roadmap   |
| WAV    | ✅       | —        | Roadmap   |
| AIFF   | ✅       | —        | Roadmap   |

---

## Tech Stack

| Layer       | Technology                        |
|-------------|-----------------------------------|
| Desktop     | Tauri v2                          |
| Frontend    | React 19 + TypeScript             |
| Styling     | TailwindCSS v4                    |
| State       | Zustand                           |
| Routing     | React Router v7                   |
| Icons       | Lucide React                      |
| Audio       | rodio 0.20 + symphonia 0.5        |
| MPRIS       | souvlaki 0.7                      |
| Rust tags   | metaflac, walkdir                 |

---

## Prerequisites

- **Rust** (stable, via [rustup](https://rustup.rs))
- **Node.js** ≥ 20 / **npm** ≥ 10
- Linux system packages: `webkit2gtk-4.1`, `libayatana-appindicator`, `base-devel`, `gtk3`, `alsa-lib`, `dbus`

On Arch / CachyOS:
```bash
sudo pacman -S webkit2gtk-4.1 libayatana-appindicator base-devel gtk3 alsa-lib dbus
```

---

## Setup

```bash
git clone https://github.com/Dufainer/Melodix && cd Melodix
npm install
```

---

## Development

```bash
npm run tauri dev
```

Starts Vite on `http://localhost:1420` with hot-reload and the Tauri window.

---

## Build

```bash
npm run tauri build
```

AppImage output:
```
src-tauri/target/release/bundle/appimage/melodix_0.1.0_amd64.AppImage
```

---

## Project Structure

```
melodix/
├── src-tauri/src/
│   ├── lib.rs
│   └── commands/
│       ├── audio.rs        # Playback engine (rodio + symphonia, MPRIS)
│       ├── scanner.rs      # scan_folder
│       ├── metadata.rs     # read/write_metadata, get_cover_art
│       └── files.rs        # rename_track, organize_library
└── src/
    ├── App.tsx
    ├── store/index.ts      # Zustand global state (library, player, playlists, likes)
    ├── types/index.ts
    ├── components/
    │   ├── Player.tsx      # Mini player bar
    │   ├── NowPlaying.tsx  # Full-screen Now Playing
    │   ├── Sidebar.tsx     # Navigation + playlist list
    │   ├── AddToPlaylist.tsx
    │   ├── Library.tsx
    │   ├── Editor.tsx
    │   ├── BulkEditor.tsx
    │   └── CoverArt.tsx
    └── pages/
        ├── PlayerPage.tsx  # Songs / Albums / Artists
        ├── PlaylistPage.tsx
        ├── Likes.tsx
        ├── Home.tsx
        ├── Library.tsx
        └── Settings.tsx
```
