# RustyPlayer — Parity Run-Book (Phase 5 gate T5.1–T5.7)

> Automated parts run headless (`cargo test`, `node --test`). Manual parts need a
> display + real video files. **Cutover requires ALL green** (plan §6.2).
> Record results in `TEST_LOG.md` — no entry = gate not passed.

## Shared fixture (automated)

`tests/fixtures/videos/`: `alpha.mp4` (+`alpha.mp4.json` tags `[rock]`),
`beta.webm` (+malformed `beta.webm.json`), `note.txt` (ignored).
Rust: `parity_shared_fixture` (`commands.rs`). Electron contract mirrors
`tests/main.test.js` (mocked fs, same expectations).

## Manual matrix (same REAL video folder in both builds)

| Case | Electron (`dist/` exe) | Tauri (`tauri-poc` bundle) | Pass? |
|------|------------------------|----------------------------|-------|
| T5.1 scan parity | list/count/tags | identical list/count/tags | ☐ |
| T5.2 render parity (default + tag filter + search) | `tagChips`, gallery, `titlebar` | identical | ☐ |
| T5.3 playback: play/pause/seek/mute, auto-advance + toast, rapid-nav no `AbortError` toast | works | works | ☐ |
| T5.4 OOM: 200-video folder, DOM capped (~60+pages), smooth scroll | works | works | ☐ |
| T5.5 errors: corrupt sidecar → `.bak` + gallery intact; missing folder → empty state | works | works | ☐ |
| T5.6 a11y: landmarks, `role=menu` arrows, `aria-modal` focus return, resize arrows | works | works | ☐ |
| T5.7 perf: scan ≤2× Electron time, startup `<500ms`, idle `<80MB` | baseline | meets | ☐ |

## How to run

```powershell
# Tauri app (needs display + real videos in a folder)
.\tauri-poc\src-tauri\target\x86_64-pc-windows-msvc\release\tauri-poc.exe
# then: Open Folder → compare against Electron dist\win-unpacked\RustyPlayer.exe
```

## Verdict log

- 2026-09-12: auto green (`cargo 15/15`, adapter `3/3`, `npm 87/87`); manual
  T5.1–T5.7 PENDING (no display in build env) + T4.3 keys pending →
  **CUTOVER DEFERRED** (correct per plan: incomplete ≠ pass).
