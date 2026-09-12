# RustyPlayer

[![Latest release](https://img.shields.io/github/v/release/rajandiappan/RustyPlayer?display_name=tag)](https://github.com/rajandiappan/RustyPlayer/releases/latest)
[![CI](https://github.com/rajandiappan/RustyPlayer/actions/workflows/tauri.yml/badge.svg)](https://github.com/rajandiappan/RustyPlayer/actions/workflows/tauri.yml)

A lightweight video player with a thumbnail gallery for easy browsing and playback,
built on [Tauri v2](https://tauri.app/) (~2MB nsis bundle, weak-webview).

## Download

Grab the latest release: **[RustyPlayer — latest release](https://github.com/rajandiappan/RustyPlayer/releases/latest)**

| File | Best for |
|------|----------|
| `RustyPlayer_*_x64-setup.exe` | Recommended — standard installer (Start Menu entry, updater support) |
| `RustyPlayer_*_x64_en-US.msi` | Managed PCs / Group-Policy deployment |
| `RustyPlayer-portable-win64.zip` | No install — unzip and run `rustyplayer.exe` (needs WebView2, preinstalled on Win10/11) |
| `SHA256SUMS.txt` | Verify downloads: `Get-FileHash <file> -Algorithm SHA256` and compare |

> First runs show a Windows SmartScreen warning (*unrecognized app*) — expected until
> Authenticode signing lands. Choose *More info → Run anyway*.

## Features

- **Thumbnail Gallery** — Browse videos as visual thumbnails in a scrollable grid
- **Auto-Advance** — Videos auto-play continuously (toggle with any key)
- **Keyboard Navigation** — `↑`/`↓` prev/next, `←`/`→` seek ±10s, `Space` play/pause, `Esc` browse mode
- **Tagging & Search** — Sidecar-JSON tags, filter by name or tag
- **Dark Theme** — Resizable sidebar, aspect-ratio-preserved player

Supported formats: MP4, WebM, MOV.

## Getting Started

Prerequisites: [Node.js](https://nodejs.org/) (v18+) and Rust toolchain.

```bash
npm ci
npm run tauri dev        # dev window
npm run tauri build      # release bundle (~2MB nsis)
```

## Docs & History

- Product spec: [PRD_Rust_Video_Player.md](PRD_Rust_Video_Player.md)
- Release signing: [docs/TAURI_SIGNING.md](docs/TAURI_SIGNING.md)
- Verification log: [TEST_LOG.md](TEST_LOG.md)
- Electron predecessor (archived): [legacy-electron/](legacy-electron/)

## License

[MIT](LICENSE) — See LICENSE file.
