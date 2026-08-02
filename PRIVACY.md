# Privacy Policy & Compliance
Developed & maintained by [Asep Sayyad](https://github.com/asepsayyad007).

AiroShare is built from the ground up with a privacy-first, local-only architecture. This document outlines how data is handled and AiroShare's compliance with global privacy standards.

---

## 1. Zero Cloud Data Collection
AiroShare is a 100% local self-hosted utility. 
* **No Telemetry**: We do not collect, aggregate, or upload usage statistics, server metrics, or client logs.
* **No Remote Servers**: AiroShare does not connect to any external analytical cloud databases, sync servers, or third-party web endpoints.
* **Your Files, Your Control**: Any files or media folders shared via the HTTP, FTP, or DLNA engines remain strictly on your local computer and your private Wi-Fi network.

---

## 2. Local Networking & Security Sandbox
* **Inbound Access**: AiroShare binds to your local network interfaces (e.g., `192.168.x.x`). It is only accessible to devices within your local area network (LAN).
* **FTP & DLNA Broadcasts**: FTP streams and SSDP multicast broadcasts are contained within your router's subnetwork. They are not visible to the public internet unless you manually configure port forwarding on your router.
* **Path Traversal Protection**: AiroShare includes strict directory path validation checks to prevent client devices from traversing outside of the designated shared root folder.

---

## 3. Global Privacy Compliance (GDPR, CCPA, COPPA)
Because AiroShare does not collect, store, transmit, or monetize any personal data, user credentials, or IP addresses, it is **Compliant by Design** under:
* **General Data Protection Regulation (GDPR)**
* **California Consumer Privacy Act (CCPA)**
* **Children's Online Privacy Protection Act (COPPA)**

All data processing (media streaming, file indexing, and transfers) happens strictly on-device.

---

## 4. Credits & Open Source Acknowledgements
AiroShare is made possible by the incredible work of the open-source community. We proudly utilize and build upon the following libraries:

| Project | License | Purpose |
| :--- | :--- | :--- |
| **Electron** | MIT | Native Desktop App Wrapper |
| **React** | MIT | Frontend User Interface |
| **Vite** | MIT | Ultra-fast Module Bundler |
| **Express** | MIT | High Performance HTTP & Streaming Engine |
| **lucide-react** | ISC | Modern Icon Sets |
| **ftp-srv** | MIT | Native High Performance FTP Engine |
| **simple-upnp-dlna** | MIT | UPnP / SSDP Multicast Broadcaster |
| **mime-types** | MIT | Dynamic Media Format Detection |
| **qr-image** | MIT | Fast QR Code Generation |
