# 📡 AiroSMB — Home Media & File Sharing Server

> **For Home Use Only** — Instantly share and stream movies, music, and photos from your PC or laptop to any Smart TV, VLC Media Player, smartphone, or console over your local network.

---

## 🌟 Features

- 📺 **Instant PC-to-TV Streaming (DLNA / UPnP AV)**: Automatically advertises your media library to Smart TVs (Samsung Tizen, LG webOS, Sony, Android TV, FireStick), VLC, Kodi, Xbox, and PlayStation.
- 🌐 **Modern Web File Manager & Streaming Dashboard**: Browse folders, upload/download files, and stream videos in web browsers with fast seeking (HTTP 206 Partial Content).
- 📁 **Native TCP SMB Protocol Server**: Built-in SMB file sharing server (`smb://<IP>:4450/AiroSMB`) for Windows/Mac network access.
- ⚡ **Built-in FTP Engine**: High-performance FTP server (`ftp://<IP>:2121`) with anonymous login support.
- 🎬 **Plex & Kodi Feed API**: Generates structured media feeds (`/api/plex/feed`) and M3U playlists (`/playlist.m3u`) for instant VLC playback.
- 📱 **QR Code Mobile Pairing**: Pair smartphones and tablets instantly by scanning the generated network QR code.
- ⚡ **Standalone Simple DLNA Server**: Dedicated CLI tool (`npm run dlna`) to instantly share any folder over DLNA.

---

## 📱 Client & Device Compatibility

| Device / App | Protocol / Method | Supported Formats |
| :--- | :--- | :--- |
| **Samsung Smart TV (Tizen)** | UPnP / DLNA Discovery | MP4, MKV, JPG |
| **LG Smart TV (webOS)** | UPnP / DLNA Discovery | MP4, MKV, JPG |
| **Android TV / FireStick** | SSDP Multicast + DLNA | MP4, MKV, TS, MP3 |
| **VLC Media Player** | UPnP / M3U Playlist / HTTP / SMB / FTP | MP4, MKV, AVI, MOV, MP3, FLAC, JPG |
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
git clone https://github.com/asepsayyad007/AiroSMB.git
cd AiroSMB

# Install dependencies
npm install
```

### Running the Server

#### 1. Run the Full Home Server (Web App + SMB + FTP + DLNA)
```bash
npm run server
```
- **Web Interface**: `http://localhost:3000`
- **DLNA Description XML**: `http://<YOUR_IP>:3000/dlna/description.xml`
- **SMB Share**: `smb://<YOUR_IP>:4450/AiroSMB`
- **FTP Server**: `ftp://<YOUR_IP>:2121`

#### 2. Run the Simple Standalone DLNA Server
```bash
npm run dlna
# Or specify a custom media folder and port:
node simple_dlna.js "C:\Users\YourName\Videos" 3000
```

#### 3. Run Frontend Development Server
```bash
npm run dev
```

---

## 🛠️ System Architecture & API Endpoints

```
AiroSMB/
├── config/                  # DLNA & Server configuration
├── src/                     # React Frontend & DLNA Module Engine
│   └── dlna/
│       ├── ssdp/            # Multicast SSDP Broadcaster (UDP 1900)
│       ├── device/          # UPnP Device Description & Icons
│       ├── soap/            # SOAP XML Request & Response Parser
│       └── contentDirectory/# MediaStore & ContentDirectory Service
├── server.js                # Express Server, File Explorer & Services Manager
├── smbServer.js             # Native TCP SMB Server Engine
├── ftpServer.js             # FTP Server Engine
└── simple_dlna.js           # Standalone Simple DLNA Server CLI
```

### Key API Endpoints

- `GET /api/network/info`: Server IP addresses, QR code, and storage statistics.
- `GET /api/files/browse?path=...`: Browse local directories and files.
- `GET /api/files/stream?path=...`: HTTP 206 seeking stream for video/audio.
- `POST /api/files/upload`: File upload endpoint.
- `GET /dlna/description.xml`: UPnP Device XML for Smart TVs.
- `GET /dlna/presentation`: Interactive DLNA status dashboard and client connection logs.
- `GET /api/plex/feed`: Structured JSON media feed for Plex/Kodi.
- `GET /playlist.m3u`: Auto-generated M3U playlist for VLC.

---

## 🔒 License & Disclaimer

This project is released for **home use only**. It is designed for streaming personal media files across a private local home network.
