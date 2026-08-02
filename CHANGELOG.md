# Changelog

All notable changes to AiroShare will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

## [1.3.2] - 2026-08-02

### Added
- **Dynamic Port Allocation**: Changed default HTTP port from `3000` to `9900` and FTP port from `2121` to a dynamically verified free port on startup to prevent collisions.
- **Port Syncing for Dev Server**: Dynamically writes the selected runtime port to `config/port.json` so the Vite proxy configuration matches the active port automatically.
- **Headless PNG Icon Rasterizer**: Added a helper script to capture `public/AiroShare.png` directly from `AiroShare.svg` using a headless Electron instance, preserving alpha transparency and the custom "AiroShare" text.

### Changed
- **Minimalist Status Footer**: Redesigned the sidebar status card into a transparent, sleek divider card with a custom green pulsing dot animation.

### Fixed
- **DLNA Branding Text**: Resolved missing "AiroShare" text on the DLNA client icon (VLC/Smart TVs) by embedding the new transparent, text-complete 256x256 PNG.
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
