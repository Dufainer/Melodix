# Melodix

A modern, cross-platform audio metadata manager built with **Tauri v2**, **React 19**, **TypeScript**, and **TailwindCSS v4**.

Scan local folders, view your music library, edit metadata (title, artist, album, genre, year, cover art, lyrics), and auto-fetch metadata from **iTunes** and **lrclib.net**.

---

## Features

- Browse and scan local music folders (recursive)
- View tracks in a clean library list with embedded cover art
- Edit all standard metadata fields inline
- Bulk-edit multiple tracks at once with field-level control
- Embed/extract cover art (base64 JPEG/PNG)
- Auto-fetch metadata from iTunes (title, artist, album, genre, year, cover)
- Auto-fetch synced lyrics from lrclib.net
- Format badge on every track (FLAC, MP3, …)
- Dark glassmorphism UI — accent `#1a6fff`

---

## Supported Formats

| Format | Read | Write | Status |
|--------|------|-------|--------|
| FLAC   | ✅   | ✅    | Implemented |
| MP3    | —    | —     | Roadmap |
| AAC    | —    | —     | Roadmap |
| OGG    | —    | —     | Roadmap |
| OPUS   | —    | —     | Roadmap |
| WAV    | —    | —     | Roadmap |
| AIFF   | —    | —     | Roadmap |

### Adding a new format

1. Create `src-tauri/src/formats/<format>.rs` and implement the `AudioFormat` trait.
2. Register it in `src-tauri/src/formats/mod.rs` inside the `registry()` function.
3. That's it — scanner, commands, and UI format badge pick it up automatically.

---

## Tech Stack

| Layer      | Technology |
|------------|------------|
| Desktop    | Tauri v2 |
| Frontend   | React 19 + TypeScript |
| Styling    | TailwindCSS v4 |
| State      | Zustand |
| Routing    | React Router v7 |
| Icons      | Lucide React |
| Rust audio | metaflac, walkdir |

---

## Prerequisites

- **Rust** (stable, via [rustup](https://rustup.rs))
- **Node.js** ≥ 20
- **npm** ≥ 10
- Linux system packages: `webkit2gtk-4.1`, `libayatana-appindicator`, `base-devel`, `gtk3`

On Arch/CachyOS:
```bash
sudo pacman -S webkit2gtk-4.1 libayatana-appindicator base-devel gtk3
```

---

## Setup

```bash
# Clone
git clone <repo> melodix && cd melodix

# Install frontend deps
npm install

# (Rust deps are fetched automatically by cargo on first build)
```

---

## Development

```bash
npm run tauri dev
```

Starts Vite dev server on `http://localhost:1420` and the Tauri window with hot-reload.

---

## Build

### Standard build
```bash
npm run tauri build
```

### AppImage (Linux)
The `tauri.conf.json` targets `appimage` by default. After `tauri build` the `.AppImage` is found in:

```
src-tauri/target/release/bundle/appimage/melodix_0.1.0_amd64.AppImage
```

Make it executable and run:
```bash
chmod +x melodix_0.1.0_amd64.AppImage
./melodix_0.1.0_amd64.AppImage
```

---

## Linting & Formatting

```bash
npm run lint      # ESLint
npm run format    # Prettier
```

---

## Project Structure

```
melodix/
├── src-tauri/src/
│   ├── lib.rs                  # Tauri setup, command registration
│   ├── commands/
│   │   ├── scanner.rs          # scan_folder command
│   │   └── metadata.rs         # read/write_metadata, get_cover_art, get_supported_formats
│   └── formats/
│       ├── mod.rs              # AudioFormat trait + format registry
│       └── flac.rs             # FLAC implementation
└── src/
    ├── App.tsx
    ├── styles.css              # TailwindCSS v4 + design tokens
    ├── types/index.ts          # Shared TypeScript types
    ├── store/index.ts          # Zustand global state
    ├── services/
    │   ├── autoFetch.ts        # Orchestrates iTunes + lrclib fetch pipeline
    │   ├── itunes.ts           # iTunes Search API
    │   └── lyrics.ts           # lrclib.net lyrics API
    ├── components/
    │   ├── Sidebar.tsx
    │   ├── Library.tsx         # Track list with checkboxes for bulk selection
    │   ├── BulkEditor.tsx      # Bulk metadata editor panel
    │   ├── Editor.tsx          # Single-track metadata editor panel
    │   ├── FetchProgress.tsx   # Auto-fetch progress display
    │   ├── Toolbar.tsx         # Scan folder + search
    │   └── CoverArt.tsx
    └── pages/
        ├── Home.tsx
        ├── Library.tsx
        └── Settings.tsx
```
