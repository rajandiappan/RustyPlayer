# RustyPlayer — Tauri POC (Phase 0 spike)

> Isolated proof of the size thesis. Electron on `main` is untouched and stays primary
> until the parity gate (`TAURI_PORT_PLAN.md` Phase 5). Do NOT import Electron code here
> except via the Phase 2 adapter plan.

## What this proves (2026-09-12)

- `npx tauri build --target x86_64-pc-windows-msvc` succeeds with a stub gallery +
  `convertFileSrc` (`asset://`) video wiring — no Rust commands yet.
- Bundle sizes (release):
  - `bundle/nsis/RustyPlayer_1.0.0_x64-setup.exe`: **1.3 MB**
  - `bundle/msi/RustyPlayer_1.0.0_x64_en-US.msi`: **1.9 MB**
  - vs Electron `dist/win-unpacked/RustyPlayer.exe`: **212 MB** (298 MB unpacked)
- Schema lessons (baked into `TAURI_PORT_PLAN.md`): window key is
  `dragDropEnabled` (NOT `fileDropEnabled`); `bundle.targets` allows
  `deb/rpm/appimage/nsis/msi/app/dmg/all` — there is NO `portable` target
  (that was electron-builder vocabulary). Spike uses `"all"`.

## Layout

- `src/main.ts` — stub gallery (2 hardcoded videos) + `convertFileSrc` play wiring.
  Replaced by the full `tauriIpc` adapter in Phase 2.
- `src/styles.css` — spike palette mirroring `../src/renderer/styles.css`
  (`--accent/--border`). Full reuse in Phase 2.
- `index.html` — Vite shell + `asset:` CSP (port of `../src/renderer/index.html:6`).
- `src-tauri/tauri.conf.json` — `com.rustyplayer.app`, `1200×800`,
  `dragDropEnabled: true`, `asset:` CSP.

## Commands

```powershell
cd tauri-poc
npm ci
npm run tauri dev      # hot-reload spike
npx tauri build --target x86_64-pc-windows-msvc   # release bundles (~7 min Rust compile)
```
