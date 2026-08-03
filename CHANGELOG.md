# Changelog

All notable changes to AiroShare will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.5] - 2026-08-03

### Fixed
- **Dashboard Blank Screen Crash**: Fixed a critical component rendering error in the directory browser list view. Opening a directory containing image files was failing to construct the global `Image` component. This has been resolved by using the aliased `ImageIcon` component from `lucide-react`.
- **Vite Build Synchronization**: Updated Vite compilation scripts and regenerated production-ready assets under `dist/` to ensure the fix is correctly bundled and served in dev/prod builds.

## [1.3.2] - 2026-08-02

### Added
- **Dynamic Port Allocation**: Changed default HTTP port from `3000` to `9900` and FTP port from `2121` to a dynamically verified free port on startup to prevent collisions.
- **Port Syncing for Dev Server**: Dynamically writes the selected runtime port to `config/port.json` so the Vite proxy configuration matches the active port automatically.
- **Headless PNG Icon Rasterizer**: Added a helper script to capture `public/AiroShare.png` directly from `AiroShare.svg` using a headless Electron instance, preserving alpha transparency and the custom "AiroShare" text.
- **Rich UPnP DLNA Metadata**: Added a zero-dependency, pure Node.js binary media prober (`mediaProber.js`) that reads MP4, MKV, MP3, FLAC and WAV file headers at scan time to extract `duration`, `bitrate`, `sampleFrequency`, and `nrAudioChannels`.
- **Full DLNA Format Coverage**: Extended `mimeProtocolInfoMap` from 9 to 30+ formats covering `.wmv`, `.webm`, `.ts`, `.m2ts`, `.mpg`, `.flv`, `.3gp`, `.vob`, `.ogv`, `.wav`, `.aac`, `.m4a`, `.ogg`, `.opus`, `.wma`, `.alac`, `.mka`, `.webp`, `.gif`, `.bmp`, `.tiff`.
- **DIDL-Lite Enrichment**: DLNA `<res>` elements now emit `duration`, `resolution`, `bitrate`, `nrAudioChannels`, and `sampleFrequency` when available; containers emit `<upnp:storageUsed>-1</upnp:storageUsed>`.
- **`GetProtocolInfo` Fix**: Resolved a double-prefix bug in `ConnectionManagerService` where protocol info strings were emitted as `http-get:*:http-get:*:...`.

### Changed
- **Minimalist Status Footer**: Redesigned the sidebar status card into a transparent, sleek divider card with a custom green pulsing dot animation.
- **DLNA Byte-Range Seeking**: Changed `DLNA.ORG_OP=01` (time-seek only) to **`DLNA.ORG_OP=11`** (byte-range + time-seek) across all media types and in the HTTP stream response header, enabling smooth scrubbing in VLC, Kodi, and Smart TVs.
- **2MB Stream Buffer**: Increased `highWaterMark` from 1MB to 2MB for higher throughput on gigabit LAN.
- **TCP Keep-Alive**: Extended stream socket keep-alive from 15s to 60s to prevent mid-stream disconnections on long 4K video streams.

### Fixed
- **DLNA Branding Text**: Resolved missing "AiroShare" text on the DLNA client icon (VLC/Smart TVs) by embedding the new transparent, text-complete 256×256 PNG.
- **SVG XML Syntax Errors**: Fixed invalid JSX-style comments in `AiroShare.svg` vector assets to conform to valid XML/SVG specifications.

## [1.3.1] - 2026-08-02

### Fixed
- **Silent Startup Port Polling**: Implemented a TCP port probing helper (`waitForPort`) to wait until the Express server is fully bound before loading the URL, eliminating native `ERR_CONNECTION_REFUSED` console warnings.
- **Windows Notification Title branding**: Configured `app.setAppUserModelId` to register the application on Windows, correcting desktop notification title banners from default `electron.app.electron` to `AiroShare`.

## [1.3.0] - 2026-08-02

### Added
- **Electron Boot Auto-Retry**: Added connection failure handling and did-fail-load listeners to retry local Express server boot, resolving blank/empty dashboard screen issues.
- **Vite Dev Server Detection**: Added net socket scanning to automatically load `http://localhost:5173` instead of `3000` when the Vite development server is running, enabling hot reloading during development.
- **Dynamic Path Separators**: Added dynamic path separator detection (`/` or `\`) in React breadcrumbs for fully functional folder browsing on Linux and macOS clients.

### Changed
- **Project-wide Rebranding**: Changed project branding and references from `AiroSMB` to `AiroShare`.
- **Dynamic User Folders**: Replaced all instances of hardcoded Windows paths (specifically references to `C:\Users\aseps`) with dynamic cross-platform paths using Node's `os.homedir()` and `path.join()`.
- **Cross-platform Compatibility**: Updated default config roots, FTP directory fallbacks, and DLNA media scanner roots to dynamically resolve.

### Removed
- **Classic Menu Bar**: Removed default Electron top window menu bar (File/Edit/View/Window/Help) to deliver a cleaner application window frame.
