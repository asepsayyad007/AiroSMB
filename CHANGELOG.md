# Changelog

All notable changes to AiroShare will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.0.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

---

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
