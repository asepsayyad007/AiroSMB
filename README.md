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
- **Web Dashboard**: `http://localhost:3000`
- **DLNA Description**: `http://<YOUR_IP>:3000/dlna/description.xml`
- **FTP Server**: `ftp://<YOUR_IP>:2121`

#### 2. Standalone Simple DLNA Server
```bash
npm run dlna
# Or specify a custom folder and port:
node simple_dlna.js "C:\Users\YourName\Videos" 3000
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

## 🔒 License

This project is released under the MIT License. Designed for high-speed local home media streaming and file sharing.
