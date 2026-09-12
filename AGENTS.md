# AGENTS.md — Rust Video Player

## Key Decisions (from Council v0.3, cutover 2026-09-12: Electron → Tauri v2)

- **Platform:** Tauri v2 (weak-webview, ~2MB nsis) — cut over from Electron. Electron app archived to `legacy-electron/` + `legacy-electron` branch (at c354775).
- **Asset protocol:** `app.security.assetProtocol { enable: true, scope: ["**/*"] }` replaces `file://` — all media loads via `convertFileSrc` (`asset://`); `file://` is blocked by WebView2.
- **Capabilities:** least-privilege (`capabilities/default.json`) — fs read `$VIDEO/**` + write only `$VIDEO/**/*.json`, dialog/open/updater scoped allows; no broad shell/path access.
- **Updater:** via `tauri-plugin-updater` (pubkey pinned in `tauri.conf.json`, tag-gated signing secrets; plugin REQUIRES pubkey even when inactive).
- **Format scope v1:** MP4, WebM, MOV only. MKV/AVI/FLV as v2 if needed.
- **Navigation:** Arrow keys (Up/Down prev/next), Space (play/pause), Escape (browse mode). Keyboard-first.
- **Auto-advance:** Videos auto-play next when current ends. Toggle with any key press.
- **Memory:** Preload current + next video only. Lazy-load rest (avoid OOM).
- **Fallback:** Skip unsupported codecs gracefully — don't crash gallery on corrupt files.
- **Tags:** Use sidecar JSON (same folder), not embedded video metadata.
- **Inline tag editor:** Popover-based tag editing (no browser prompt).

## Architecture

- Left panel (25% default): Thumbnail gallery + search/tags
- Right panel: Video player with aspect ratio preserved
- Resizable split view, dark theme

## Controls

- `▶` / `⏸` — Play / Pause (icons, not text)
- `🔊` / `🔇` — Mute toggle
- `Auto` — Toggle auto-advance (blue = ON)
- Play/Pause, Seek, Volume disabled until video loaded

## Supported Formats

MP4, WebM, MOV (v1)