# AiroShare — High Performance PC Media Server & Local File Engine

> **High-Performance Home Media Engine** — Instantly stream videos, music, and photos from your PC to Smart TVs, VLC Media Player, smartphones, and consoles over local Wi-Fi.

---

## 🌟 Key Features

- **Instant PC-to-TV DLNA Streaming**: Broadcasts your media library via UPnP / DLNA AV to Smart TVs (Samsung Tizen, LG webOS, Sony, Android TV, FireStick), VLC, Kodi, Xbox, and PlayStation.
- **Unified Corporate Web Dashboard**: All-in-one dark interface for file browsing, high-speed streaming, live service toggles, and instant file uploads.
- **High-Speed FTP Streaming Server**: Integrated FTP server (`ftp://<IP>:2121`) with anonymous login support for zero-password VLC streaming.
- **Real-Time Active Client Tracking**: Live monitor of connected devices and active playback streams across DLNA, HTTP, and FTP.
- **Auto M3U Playlist & Plex Feed**: Generates instant M3U playlists (`/playlist.m3u`) and JSON feeds (`/api/plex/feed`) for VLC and Kodi.
- **QR Code Mobile Pairing**: Pair mobile phones and tablets instantly by scanning the network QR code.
- **Standalone DLNA CLI Server**: Lightweight standalone server script (`npm run dlna`) to share any directory over DLNA.

---

## 📱 Supported Devices & Protocols

| Device / Client | Protocol / Method | Formats Supported |
| :--- | :--- | :--- |
| **Samsung Smart TV (Tizen)** | UPnP / DLNA Discovery | MP4, MKV, JPG |
| **LG Smart TV (webOS)** | UPnP / DLNA Discovery | MP4, MKV, JPG |
| **Android TV / FireStick** | SSDP Multicast + DLNA | MP4, MKV, TS, MP3 |
| **VLC Media Player** | UPnP / M3U Playlist / HTTP / FTP | MP4, MKV, AVI, MOV, MP3, FLAC, JPG |
| **Kodi** | UPnP / DLNA / Plex Feed | MP4, MKV, AVI, FLAC |
| **Windows Media Player** | UPnP SSDP Discovery | MP4, WMV, MP3, JPG |
| **Xbox & PlayStation** | Media Player DLNA Client | MP4, MP3, JPG |

---

## 🚀 Quick Start Guide

### Prerequisites
- [Node.js](https://nodejs.org/) (v18 or higher recommended)

### Installation

```bash
# Clone the repository
git clone https://github.com/asepsayyad007/AiroShare.git
cd AiroShare

# Install dependencies
npm install
```

### Running the Server

#### 1. Full Server (Web App + FTP + DLNA)
```bash
npm run server
```
- **Web Dashboard**: `http://localhost:3000` (or your local IP: `http://192.168.1.120:3000`)
- **DLNA Description**: `http://<YOUR_IP>:3000/dlna/description.xml`
- **FTP Server**: `ftp://<YOUR_IP>:2121`

#### 2. Standalone Simple DLNA Server
```bash
npm run dlna
# Or specify a custom folder and port:
node simple_dlna.js "/path/to/media" 3000
```

#### 3. Run Automated Tests
```bash
npm test
```

---

## 🛠️ System Architecture

```
AiroShare/
├── config/                  # Server & DLNA configuration
├── src/                     # React Frontend & DLNA Engine
│   ├── components/          # Dashboard, ActiveClients & Settings UI
│   ├── dlna/
│   │   ├── ssdp/            # Multicast SSDP Broadcaster (UDP 1900)
│   │   ├── device/          # UPnP Device XML & Icon Handlers
│   │   ├── soap/            # SOAP Request & Response Parser
│   │   └── contentDirectory/# MediaStore & ContentDirectory Service
│   └── utils/               # Real-time Client Tracker & Stream Handler
├── server.js                # Express Server, File Engine & API Router
├── ftpServer.js             # High-Speed FTP Server Engine
└── simple_dlna.js           # Lightweight Standalone DLNA CLI Server
```

---

## 🔍 Deep Dive Technical Architecture

AiroShare is built to be a robust, high-performance, and lightweight local area network (LAN) sharing system. Here is a breakdown of the core engines powering AiroShare:

### 1. Dynamic Network Interface Bindings
* **Dual-Stack Socket Binding**: AiroShare binds to Node's dual-stack IPv4/IPv6 listener (`:::3000`), allowing clients to connect using `http://localhost:3000`, computer network name (`http://aseppc:3000`), or direct LAN IP addresses.
* **Auto Adapter Scanning**: The network engine uses `os.networkInterfaces()` to detect active physical adapters (Wi-Fi, Ethernet) while ignoring virtual interfaces (WSL, VirtualBox, loopbacks). The client immediately sees connected connection badges (e.g. `Wi-Fi (192.168.1.120)`) in real-time.
* **Fully Dynamic Configuration**: The system hostname and IP addresses adapt dynamically on server start. If the software is installed on another machine (e.g., Ubuntu Linux, macOS, or another Windows PC), it resolves everything correctly without manual setup.

### 2. Multi-Protocol Streaming Engines
* **Express HTTP Stream Engine**: High-performance HTTP server supporting chunked file streaming with `Accept-Ranges: bytes`. This allows Smart TVs and media players to scrub/seek instantly through large 4K UHD video files.
* **SSDP Multicast Broadcaster**: Custom SSDP implementation running on UDP `239.255.255.250:1900`. It broadcasts location packets pointing to `/dlna/description.xml` to notify VLC and Smart TVs of the AiroShare media server's presence.
* **Anonymous FTP Server**: High-speed FTP engine (`ftp-srv`) mapped directly to the shared directory root. It allows zero-configuration anonymous login (`anonymous:anonymous`) for simple file access in third-party clients.
* **VLC UPnP Icon Renderer**: Generates valid 24-bit RGBA binary PNG buffers for `/icon-64.png`, `/icon-128.png`, and `/icon-256.png` so that the AiroShare Sunset icon appears next to the device name inside VLC playlist interfaces.

### 3. Security Boundary Containment
* **Path Containment Policy**: To prevent directory traversal security risks, the file browsing API endpoint (`/api/files/browse`) validates paths against the shared `rootDirectory` using relative path calculations. Any attempt to traverse above the shared root folder is blocked and safely restricted back to the shared root.

### 4. Cross-Platform Linux & macOS Compatibility
* **Standard Core APIs**: Since AiroShare is fully stripped of platform-locked dependencies (like SMB native modules), it is completely cross-platform. It runs perfectly on Windows, macOS, and Linux out-of-the-box.
* **Dynamic Paths**: All paths are built using Node's `path` library. The default sharing directory resolves gracefully on Linux to `/home/<username>/Downloads`.

---

## 🔒 License

This project is released under the MIT License. Designed for high-speed local home media streaming and file sharing.
