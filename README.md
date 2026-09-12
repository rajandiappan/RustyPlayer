# RustyPlayer

A lightweight video player with a thumbnail gallery for easy browsing and playback,
built on [Tauri v2](https://tauri.app/) (~2MB nsis bundle, weak-webview).

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
