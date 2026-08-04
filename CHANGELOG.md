# Changelog

All notable changes to AiroShare will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.4.0] - 2026-08-04

### Added
- **Independent DLNA Media Libraries**: DLNA Media Server can now decouple from the Master Shared Directory. Users can now assign dedicated, separate folders for Videos, Photos, and Music for Smart TVs without mixing files.
- **Automated Video Resolution Tagging**: Introduced a pure Node.js binary header probing engine (`mediaProber.js`) to extract native resolution (width/height) from `.mp4`, `.mkv`, and `.m4v` video files. The dashboard and DLNA clients now dynamically auto-tag media as `[4K]`, `[FHD]`, `[HD]`, or `[SD]` even if the filename lacks quality indicators.
- **Live Directory Watching**: Switched media scanning from manual refresh polling to instant, live file-system watching using `chokidar`. Any file added, removed, or modified via Explorer instantly pushes changes to the active DLNA engine and dashboard without manual rescanning.

### Fixed
- **Backend JSON Payload parsing**: Fixed a reference error during DLNA configuration updates caused by improper payload destructuring.

## [1.3.9] - 2026-08-04

### Added
- **Mobile Companion Web App**: Dedicated mobile-optimized dashboard accessible remotely for managing engines, tracking active clients, and browsing shared files.
- **Persistent QR & PIN Authentication**: Added robust security layer to restrict dashboard access over LAN. PC dashboard now enforces PIN authentication (or QR code auto-auth for mobile).
- **Persistent Mobile Sessions**: Mobile users' PINs are now securely cached in `localStorage` for automatic reconnections on refresh.
- **PWA Apple Icons**: Configured Apple Touch Icons to allow the Mobile Companion Web App to behave as a native app when saved to the iOS homescreen.
- **TV Series Auto-Sorting**: Improved media scanning logic to retain nested directory structures for TV series instead of flattening them into a massive unreadable list.

### Changed
- **Access Mode Settings Refactor**: Overhauled the Security settings in the PC dashboard to feature dedicated "Open Access" and "PIN Protected" radio buttons. PC Admins can now instantly revoke all active mobile sessions by simply switching to Open Access.
- **PC Dashboard Redesign**: Complete overhaul of the PC dashboard UI with a sleek, dark-mode glassmorphic aesthetic and modern micro-animations.
- **Removed Deprecated PC Upload**: Cleaned up the PC Dashboard file manager by removing the unnecessary upload feature since the host machine already has local access.
- **Local Thumbnail Engine Fixes**: Fixed distorted video thumbnails in the mobile client by integrating the local thumbnail extraction engine with a fast, cached API endpoint.
- **Security Middleware Restoration**: Re-implemented strict IP and route security policies to ensure active web client connections are actively authenticated and blocked IPs are dropped.

## [1.3.6] - 2026-08-03

### Fixed
- **Packaged App Blank Screen**: Resolved a fatal module resolution crash in the packaged Electron app. Previously, the backend server script (`server.js`) was unpacked into the `app.asar.unpacked` folder while `node_modules` remained inside `app.asar`, preventing ES module imports (like `express`) from resolving. This was fixed by keeping the backend source files packed inside `app.asar` to preserve the module lookup path.
- **Read-Only ASAR Writes**: Configured the backend server to write user settings (`root.json`) to the writable User Application Data folder (`app.getPath('userData')`) in production instead of attempting to write to the read-only ASAR bundle, while gracefully falling back to local files in development.
- **Production Port Sync Bypass**: Prevented writing of `port.json` when packaged, eliminating unhandled write errors inside the read-only ASAR folder.

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
