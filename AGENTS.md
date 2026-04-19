# AGENTS.md — Rust Video Player

## Key Decisions (from Council v0.3)

- **Platform:** Electron (HTML/video.js) — not Rust native. Faster dev with web wrapper.
- **Format scope v1:** MP4, WebM, MOV only. MKV/AVI/FLV as v2 if needed.
- **Navigation:** Arrow keys (Up/Down prev/next), Space (play/pause), Escape (browse mode). Keyboard-first.
- **Auto-advance:** Videos auto-play next when current ends. Toggle with any key press.
- **Memory:** Preload current + next video only. Lazy-load rest (avoid OOM).
- **Fallback:** Skip unsupported codecs gracefully — don't crash gallery on corrupt files.
- **Tags:** Use sidecar JSON (same folder), not embedded video metadata.

## Architecture

- Left panel (25% default): Thumbnail gallery + search/tags
- Right panel: Video player with aspect ratio preserved
- Resizable split view, dark theme

## Supported Formats

MP4, WebM, MOV (v1)