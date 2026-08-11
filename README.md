# 🔥 Pyrophorus

<p align="center">
  <img src="client/public/logo.png" width="160" height="160" alt="Pyrophorus Logo" style="border-radius: 28px; box-shadow: 0 10px 30px rgba(0,0,0,0.5);" />
</p>

<h3 align="center">Next-Generation End-to-End Encrypted Desktop Communication & Voice Lounge</h3>

<p align="center">
  <img src="https://img.shields.io/badge/Rust-Axum%20%26%20Tauri%20v2-000000?style=for-the-badge&logo=rust" alt="Rust" />
  <img src="https://img.shields.io/badge/TypeScript-React%20%26%20Tailwind-3178C6?style=for-the-badge&logo=typescript" alt="TypeScript" />
  <img src="https://img.shields.io/badge/E2EE-Vodozemac%20Matrix%20Olm-00f0ff?style=for-the-badge" alt="Security" />
  <img src="https://img.shields.io/badge/Platform-Windows%20x64-0078D6?style=for-the-badge&logo=windows" alt="Windows" />
</p>

---

## ⚡ OverView

**Pyrophorus** is a high-performance, privacy-focused desktop communications platform engineered for power users and modern communities. Built with **Rust**, **Axum**, **Tauri v2**, and **React**, Pyrophorus combines military-grade encryption with a stunning 16:9 Discord-style stage lounge experience.

---

## ✨ Key Features

- 🔒 **End-to-End Encryption (E2EE)**: Powered by Matrix `vodozemac` Olm cryptographic ratchet engine for uncompromised privacy.
- 🎙️ **16:9 Aspect Ratio Voice Lounge**: Widescreen tile ratio preservation matching Discord desktop standards.
- 📜 **5+ Participant Auto-Scroll Grid**: Smart vertical auto-scrolling stage grid for large rooms (5+ users).
- 🎵 **Integrated YouTube Music DJ Bot**: Synchronized music playback queue, seek controls, requester permission locking, and per-user volume controls.
- 📺 **Ultra HD 4K Screen Sharing**: Up to 4K 60FPS Windows Graphics Capture stream with crisp text detail hints.
- 🎨 **Rich Glassmorphism UI**: High-end dark theme UI, real-time voice activity indicators, glowing green speaking rings, and context volume menus.
- ⚡ **Lightweight Footprint**: Extremely low RAM & CPU consumption powered by Rust Tauri Native IPC.

---

## 📦 Downloads & Installers

Official Windows distribution packages are located in the release bundles:

| Package | Format | File Path |
| :--- | :--- | :--- |
| **Pyrophorus Setup** | `.exe` (NSIS Installer) | `client/src-tauri/target/release/bundle/nsis/Pyrophorus_0.1.0_x64-setup.exe` |
| **Pyrophorus MSI** | `.msi` (MSI Package) | `client/src-tauri/target/release/bundle/msi/Pyrophorus_0.1.0_x64_en-US.msi` |
| **Portable Exe** | `.exe` (Standalone App) | `client/src-tauri/target/release/pyrophorus.exe` |

---

## 🛠️ Architecture & Tech Stack

```mermaid
graph TD
    UserClient[Pyrophorus Desktop App - Tauri v2 + React] -->|Encrypted WebRTC P2P| RemotePeer[Remote Peer Client]
    UserClient -->|Rust IPC Native Bridge| Vodozemac[Vodozemac E2EE Engine]
    UserClient -->|WebSocket Signaling| AxumServer[Axum Axum Signaling Server - Rust]
    UserClient -->|Embedded Player| MusicBot[YouTube DJ Engine]
```

### Stack Components:
- **Client**: Tauri v2, React 18, TypeScript, TailwindCSS, Lucide Icons, WebRTC Native API
- **Cryptography**: `vodozemac` (Matrix Olm Rust Crate), SHA-256 Fingerprinting
- **Backend Server**: Axum, Tokio Async Runtime, WebSockets

---

## 🚀 Building & Running Locally

### Prerequisites
- [Node.js](https://nodejs.org/) v18+
- [Rust Toolchain](https://www.rust-lang.org/)

### 1. Start Backend & Client
Run the unified start script from root:
```cmd
BAŞLAT.bat
```

### 2. Manual Dev Launch
```bash
# Terminal 1: Start Backend Server
cd server
cargo run

# Terminal 2: Start Tauri Desktop Client
cd client
npm run dev
```

### 3. Production Release Build
```bash
cd client
npm run tauri build
```

---

<p align="center">
  Developed with ❤️ for secure, ultra-fast, and beautiful desktop communications.
</p>
