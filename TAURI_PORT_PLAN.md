# RustyPlayer — Tauri Port Implementation Plan

> Parallel POC, not in-place rewrite. Electron on `main` stays green until Tauri parity gate.
> Picks from council: **smallest installer > Android > risk**, **yes Rust**, **parallel POC**.
> Bundle goal: `212MB exe / 298MB unpacked` → `12–20MB` (Tauri 5–15MB typical, 96% smaller than Electron 120–250MB).

---

## 0. Decision Summary

| Option | Size | Mobile | Risk | License | Verdict |
|--------|------|--------|------|---------|---------|
| **ffmpeg-static** (`5.3.0`, `ffmpeg 6.1.1`, `GPL-3.0-or-later`) | +25–80MB → ~280MB+ | Desktop only | Low (20 lines) | GPL burden + AV flags | Safe but worsens goal |
| **Tauri 2.x** (`~3MB hello-world vs 85MB Electron`, `~109k stars`) | ~12–20MB for RustyPlayer | **iOS/Android** (Tauri 2.0+) | Medium in-place, **Low via `tauri-poc/`** | MIT/Apache-2.0 | Correct for your #1 goal |

**Chosen:** Tauri parallel POC `tauri-poc/` at repo root. No edits to `src/main/main.js`, `src/renderer/*`, `src/preload/preload.js`, `package.json`, `installer.iss`, `.github/workflows/*`, `scripts/afterPack.js`, `tests/*` until gate.

---

## 1. Current Electron Architecture (frozen on `main`)

```
src/main/main.js:1          — app/BrowserWindow/ipcMain/dialog/shell/crashReporter, loadConfig/saveConfig atomic tmp+rename + saveQueue mutex, scan-folder Promise.all, IPC validation path.isAbsolute/ext/length, before-quit sync flush, electron-log + crashReporter
src/preload/preload.js:1    — contextBridge window.api (openFolder, scanFolder, get/saveVideoTags, generateThumbnail, openInExplorer, get/saveConfig, get/addRecentFolders)
src/renderer/renderer.js:1  — gallery chunked MAX_VISIBLE=60 + Show more, pathToFileURL file:/// + encodeURI, playVideo AbortError guard + _fadeTimer, file URL + seek guards
src/renderer/index.html:6   — CSP default-src 'self' media-src 'self' file:, titlebar drag, landmarks
src/renderer/styles.css:1   — --accent/--border, :root
package.json:1              — electron 41.2.1, electron-builder 26.8.1 --publish never, c8 80/70, tests 87, pack portable
installer.iss:1             — GetEnv(APP_VERSION) + APP_VERSION env in build.yml:25 (Node 22)
.github/workflows/*.yml     — build/portable/installer with npm ci + test + coverage + bundlesize + pack
```

Tests: `tests/renderer.test.js:1`, `tests/main.test.js:1`, `tests/e2e-smoke.spec.js:1` → `87 pass`, `c8 80.49/72.97`, `4 pass 1 skip`.

---

## 2. Target Tauri Architecture (`tauri-poc/`)

```
tauri-poc/
  src-tauri/
    Cargo.toml              — tauri 2.x, serde (deny_unknown_fields), tokio (sync::Mutex), tauri-plugin-dialog, tauri-plugin-opener (v2, NOT shell), tauri-plugin-fs, tauri-plugin-log, tauri-plugin-updater
    tauri.conf.json         — identifier com.rustyplayer.app, bundle {targets: ["nsis"] (+msi optional; NO "portable" — not a Tauri BundleTarget, schema allows deb/rpm/appimage/nsis/msi/app/dmg/all), windows: {nsis, wix}, externalBin: ["binaries/ffmpeg"]}, updater {pubkey pinned, endpoints https only}, dragDropEnabled: true (NOT fileDropEnabled — rejected by schema, proven Phase 0)
    src/main.rs             — builder + plugin registration, WebviewWindowBuilder (frameless drag like main.js:124 titleBarOverlay), setup() restore bounds, WindowEvent::CloseRequested sync flush (NOT RunEvent::ExitRequested), updater init
    src/commands.rs         — scan_folder, get_video_tags, save_video_tags, get_config, save_config (wrappers over config.rs), get_recent_folders, add_recent_folder, open_folder (dialog plugin), open_in_explorer (opener::reveal_item_in_dir + is_file check, deny .exe/.bat, canonicalize symlinks/UNC), generate_thumbnail (deferred to thumbnail.rs)
    src/config.rs           — load_config/save_config (atomic tmp+rename + tokio::sync::Mutex mirroring saveQueue main.js:87, 10KB cap, .bak on SyntaxError, reject __proto__/constructor/prototype keys)
    capabilities/default.json — LEAST PRIVILEGE (see §1.1): fs read $VIDEO/** + write ONLY $VIDEO/**/*.json + **/*.thumb.jpg, read/write $APPDATA/rustyplayer-config.json{,.tmp,.bak}, dialog:allow-open, opener:allow-reveal (NOT shell:allowOpen), shell:allow-spawn ONLY binaries/ffmpeg, updater:allow-check + allow-install, NO full $VIDEO/** write

### 1.1 Capability + validation rules (ports main.js:46-116 — enforce in Rust, not just capabilities)
- Port `isValidString` (non-empty, ≤2000 for paths / ≤500 default, no `\0`), `isValidTags` (Array ≤20, each ≤64 chars, JSON ≤10KB), `isValidBounds` (400–5000×300–4000, finite), `sanitizeConfig` allow-list (bounds/sidebarWidth 0–100/volume 0–1/lastFolder isAbsolute/lastVideoIndex ≥0/recentFolders ≤10 isAbsolute). `#[serde(deny_unknown_fields)]` + explicit `__proto__` key reject (serde has no proto guard — check manually before merge).
- CSP replacement for `index.html:6` (`file:` dies under asset://): `img-src 'self' asset: data: blob:; media-src 'self' asset: blob:; connect-src 'self' ipc: http://ipc.localhost; script-src 'self'` (no new unsafe-inline).
- Updater: `pubkey` pinned in tauri.conf.json, `https://github.com/.../latest/download` only, secrets `TAURI_SIGNING_PRIVATE_KEY[_PASSWORD]` on tag builds only.
  src/                      — Vite static copy of src/renderer/* (index.html, styles.css, renderer.js adapted)
  src/js/tauriIpc.ts        — adapter: window.api.* → invoke('scan_folder', {folderPath}) etc., feature-flag backend
  src/js/path.ts            — convertFileSrc via @tauri-apps/api/core
```

Frontend reuse: `100%` of `src/renderer/styles.css`, `~80%` of `index.html`/`renderer.js` (Vite `type=module` + CSP `asset:` + `convertFileSrc` + drag-drop rework — see Phase 2). `ended`/auto-advance stays frontend-only (no backend port).

---

## 3. Phase Plan (parallel, no `main` edits until gate)

### Phase 0 — Spike ✅ DONE (2026-09-12, commit `67b4b13`)
- Init: `npx -y create-tauri-app@latest tauri-poc --manager npm --template vanilla-ts --identifier com.rustyplayer.app --tauri-version 2 --yes`, `cd tauri-poc && npm i`
- Stub gallery (2 hardcoded videos) + `convertFileSrc` play wiring in `src/main.ts`, palette port in `src/styles.css`, `asset:` CSP in `index.html` + `tauri.conf.json`
- Config: `productName RustyPlayer`, `1200×800`, `dragDropEnabled: true`, `targets: "all"`, `asset:` CSP
- **Tests run:** `npm run build` (tsc+vite, 7 modules, 264ms) ✅, `npx tauri build` ✅ (`nsis 1.3MB` + `msi 1.9MB` vs Electron `212MB`), `npm test` Electron `87/87` ✅ (untouched)
- **Exit gate (passed):** release bundles exist + `npm test 87` green. No Rust commands yet — that's Phase 1.

### Phase 1 — Backend Parity (3–5d, Rust commands)
| Electron `src/main/main.js` | Tauri `src-tauri/src/commands.rs` | Notes |
|-----------------------------|-----------------------------------|-------|
| `loadConfig()` `main.js:23` | `config::load_config()` | JSON parse + `.bak` on corrupt, `Mutex` for `saveQueue` → ` tokio::sync::Mutex` |
| `saveConfig()` `main.js:87` | `config::save_config(data: Value)` | `sanitizeConfig` (bounds 400–5000, sidebar 0–100, volume 0–1, isAbsolute, 10 recents) + tmp+rename, ENOSPC→ dialog |
| `scan-folder` `main.js:224` | `#[tauri::command] scan_folder(folder_path: String)` | `tokio::fs::read_dir`, `supported [.mp4,.webm,.mov]`, `Promise.all` → `join_all` for tag reads, `10KB` sidecar cap + `data.tags` 20×64, `.bak` on large/SyntaxError |
| `get/save_video_tags` `main.js:260` | `get_video_tags/save_video_tags` | ext whitelist + `isValidTags` |
| `get-recent-folders/add-recent-folder` `main.js:312` | `get_recent_folders/add_recent_folder` | dedup cap 10, `await save_config` |
| `open-folder` `main.js:218` | `open_folder` via `tauri-plugin-dialog` | `open({directory:true})` |
| `open-in-explorer` `main.js:298` | `open_in_explorer(path)` via `tauri-plugin-opener::reveal_item_in_dir` + `is_absolute` + `metadata().is_file()` + deny executables + canonicalize | never `shell::open` on raw path |
| `before-quit` sync flush `main.js:169` + `window-all-closed` `main.js:208` | `WindowEvent::CloseRequested` in `main.rs` (NOT RunEvent) + explicit save on resize/pause (beforeunload `renderer.js:1042` async is unreliable) | sync `fs::write` tmp+rename |
| `createWindow` `main.js:118` (hidden titlebar `124`, setBounds `140`, loadFile `145`, setWindowOpenHandler/will-navigate `135`) | `WebviewWindowBuilder` frameless + `drag` region, `setup()` restore bounds, opener deny navigation | port |
| `window-all-closed`/`activate` `main.js:208/220`, `uncaughtException/render-process-gone` `main.js:152/157`, `autoUpdater` `main.js:198` | `tauri-plugin-log` + `tauri-plugin-updater` + `WindowEvent` handlers | add missing Cargo crates |
| `electron-log/crashReporter` `main.js:5` | `tauri-plugin-log` + `log` crate | `appLogDir()/main.log` |
| `generate-thumbnail` `main.js:325` | deferred to `thumbnail.rs` (Phase 3) | keep `fs::metadata` cache + `null` fallback parity |

- `tauri.conf.json` capabilities: per §1.1 least-privilege (NOT `path:all` / `shell:allowOpen`).
- **Test cases (new `src-tauri/src/*` `#[cfg(test)]`, mirror `tests/main.test.js:58` tempdir fixtures):**
  - `T1.1` validation ports: `is_valid_tags` (20×64, non-array reject, 21 tags reject), `is_valid_bounds` (400–5000×300–4000, NaN reject), `sanitize_config` drops unknown/`__proto__` keys
  - `T1.2` `scan_folder`: tempdir with `a.mp4/b.webm/c.mov/d.txt` → 3 videos sorted; empty dir → `[]`; missing dir → `[]` no panic; relative path → reject
  - `T1.3` sidecar: valid `.json` tags loaded; malformed JSON → `.bak` + `[]`; `>10KB` → `.bak` + `[]`; missing → `[]` (no error)
  - `T1.4` `save_video_tags`: round-trip; wrong ext (`.txt`) reject; 65-char tag reject; oversized JSON reject
  - `T1.5` config atomicity: `save_config` → file parses; corrupt existing config → `.bak` + `{}`; concurrent saves serialized (Mutex, no interleave)
  - `T1.6` recents: dedup + cap 10 + relative reject
  - `T1.7` `open_in_explorer`: missing file → no-op; `.exe` → deny; relative → deny
  - `T1.8` `clippy -- -D warnings` clean
- **Exit gate (blocks Phase 2):** `cargo test` all green + `clippy` clean + `npm test` Electron `87/87` still green + `cargo fmt --check` clean. Record results in `tauri-poc/TEST_LOG.md`.

### Phase 2 — Frontend Adapter (3–4d with learning curve)
- `tauri-poc/src/js/tauriIpc.ts`: mirror ALL 10 `window.api` methods (`src/preload/preload.js:1`): `openFolder/scanFolder/getVideoTags/saveVideoTags/openInExplorer/getConfig/saveConfig/getRecentFolders/addRecentFolder/generateThumbnail` → `invoke('scan_folder',{folderPath})` etc. (snake_case).
- Adapter wiring (NO dynamic `await import` — `index.html:66` is classic script, top-level await = SyntaxError): ship static `tauri-shim.js` before `renderer.js` doing `window.api ??= tauriIpc`, OR migrate to Vite `type=module` + static `import {api as tauriApi}`. Replace all ~13 `window.api.*` sites (`renderer.js:93,108,127,137,203,239,301,468,962,975,1046,1073,1097`). Keep `debounce`, `browseMode`, `resizeHandle` `aria-valuenow`, `contextMenu` `role=menu` (`renderer.js:480`).
- `pathToFileURL` `renderer.js:72` → `src/js/path.ts`: `resolve(p)=>__TAURI__?convertFileSrc(p):pathToFileURL(p)` applied at all 4 sites (`vid.src :199`, `img.src :207`, `playVideo.src :686`, `restoreState.src :983` incl. `thumbPath`) + CSP `asset:` fix (§1.1).
- Drag-drop: `webkitGetAsEntry().isDirectory` + `file.path` (`renderer.js:1028/1031`) are Electron-only → `getCurrentWebview().onDragDropEvent(e=>{if(e.payload.type==='drop')openAndRenderFolder(e.payload.paths[0])})`, keep overlay `:1013`, `dragDropEnabled: true` already in spike config (NOT `fileDropEnabled` — schema rejects it).
- Chunked `MAX_VISIBLE=60` + `CHUNK=30` (`renderer.js:331`) stays; paginate `Show more` remainder in 60-chunks (unbounded append = OOM, violates memory rule).
- **Test cases (new `tauri-poc/tests/tauri.adapter.test.js`, same fixtures as `renderer.test.js:24`):**
  - `T2.1` all 10 adapter methods call `invoke` with snake_case command + args (mock `global.__TAURI_INVOKE__`, assert command names)
  - `T2.2` `path.resolve`: absolute Windows path → `asset://` URL (no `file:`, no `C%3A`); fallback `pathToFileURL` when `__TAURI__` absent
  - `T2.3` gallery parity: same fixture folder renders same count + `tagChips` + `titlebar` in shim vs `window.api` mode
  - `T2.4` keyboard/a11y preserved: thumbs `role=button` + Enter/Space play, context menu `role=menu`, `aria-valuenow` on resize
  - `T2.5` drag-drop handler accepts `payload.paths[0]` directories, ignores files-only drops without crash
  - `T2.6` `beforeunload` triggers config save via adapter (no async loss — explicit save path)
- **Exit gate (blocks Phase 3):** adapter tests green + `cargo test` (Phase 1) still green + `npm test` Electron `87/87` green + manual same-folder render identical in `tauri dev` vs Electron. Log in `TEST_LOG.md`.

### Phase 3 — Thumbnails Rust (2–3d; LICENSE WARNING)
- Current `src/main/main.js:325` stub `try require('fluent-ffmpeg')` → `null` if missing. In Tauri: prefer official `tauri-plugin-shell` sidecar over community `ffmpeg-sidecar` crate. Binary at `src-tauri/binaries/ffmpeg-x86_64-pc-windows-msvc.exe`, config `bundle > externalBin: ["binaries/ffmpeg"]` (triple/`.exe` stripped), PLUS `capabilities shell:allow-spawn + allow-execute` scoped to `binaries/ffmpeg` (plan previously listed only `allowOpen` — spawn would be denied). `screenshots {timestamps:['00:00:02'], size:'320x?'}` → `*.thumb.jpg` cache, `fs::metadata` check first, keep `null` fallback parity (`main.js:343`).
- ⚠️ LICENSE: sidecar crate may be MIT but the **ffmpeg binary itself (gyan/BtbN full) is GPL-3.0** — same burden as rejected `ffmpeg-static`, +25–80MB kills the `12–20MB` goal (§0). Options: (a) disclose + attribution/source-offer and accept `~40–90MB`, (b) zero-dep `<video>`+canvas thumbnails, (c) stripped LGPL/nano build feature-gated. Default: (b) first, (a) opt-in.
- **Test cases:**
  - `T3.1` cache-hit: existing `*.thumb.jpg` returned without spawning ffmpeg (assert no spawn)
  - `T3.2` generation (option a only): `alpha.mp4` → `alpha.mp4.thumb.jpg` `320w` exists; corrupt/zero-byte video → `null` no crash
  - `T3.3` fallback parity: ffmpeg absent → `null` (matches Electron `main.js:343`), gallery keeps `<video>` element
  - `T3.4` canvas path (option b): thumbnail `<img>` from `<video>` frame at `2s`, aspect preserved
  - `T3.5` bundlesize recorded: with/without ffmpeg binary (gate input for Phase 4)
- **Exit gate (blocks Phase 4):** `T3.1+T3.3` (+`T3.2` or `T3.4` per chosen option) green + `cargo test` + `npm test 87` green. Log in `TEST_LOG.md`.

### Phase 4 — Pack/Sign/Update (3–4d with learning curve)
- `tauri.conf.json` (v2 keys — `bundle.windows.portable` object does NOT exist; `portable` is NOT a valid target at all, schema: deb/rpm/appimage/nsis/msi/app/dmg/all): `package > productName RustyPlayer`, `bundle > identifier com.rustyplayer.app`, `bundle > targets: ["nsis"]` (+`"msi"` optional; spike uses `"all"`), `bundle > windows: {nsis: {...}, wix: {...}}`, `bundle > resources: []`, `build > beforeDevCommand npm run dev`, `plugins > updater {pubkey PINNED, endpoints: ["https://github.com/rajandiappan/RustyPlayer/releases/latest/download"]}` + `updater: {active:true}`. `Cargo.toml` MUST include `tauri-plugin-updater + tauri-plugin-log + tauri-plugin-opener` (previously omitted).
- Signing: `tauri signer generate` → `TAURI_SIGNING_PRIVATE_KEY` + `_PASSWORD` as `secrets.*` (vs Electron `CSC_LINK` in `build.yml:42`). Document `tauri signer sign`.
- CI `tauri-poc/.github/workflows/tauri.yml` (new, keep `npm run pack --publish never` on main): `dtolnay/rust-toolchain@stable (1.79+)` + `rustup target`, Node 22, `tauri-apps/tauri-action@v0` with `GITHUB_TOKEN`, signing secrets on tag builds ONLY, `includeUpdaterJson: true`. Do NOT use empty `GITHUB_REF_NAME` as `APP_VERSION` on push/PR.
- Drop `scripts/afterPack.js` (no locales/swiftshader in WebView2 bundle — correct to remove).
- **Test cases (CI `.github/workflows/tauri.yml` + local):**
  - `T4.1` `cargo tauri build` succeeds unsigned on branch (no secrets) — proves secrets-optional path
  - `T4.2` bundlesize gate: any `.exe` >90MB fails (tighten to 25MB once canvas thumbs land); record nsis+msi sizes in `TEST_LOG.md`
  - `T4.3` updater JSON: `latest.json` emitted with `pubkey`-signed entries on tag builds (draft release); branch builds skip signing but still bundle
  - `T4.4` installer smoke: nsis installs, launches, window `1200×800` + title `RustyPlayer`, `asset:` CSP no console errors
  - `T4.5` regression re-run: `cargo test` + adapter tests + `npm test 87` all green on the release commit
- **Exit gate (blocks Phase 5):** `T4.1–T4.5` green + CI `tauri.yml` green on `main`. Log in `TEST_LOG.md`.

### Phase 5 — Parity Gate → Cutover (1–2d)
- **Parity matrix (same video folder, both builds — automated where possible, manual where noted):**
  - `T5.1` scan parity (auto): same folder → identical video list/count/tags in `invoke('scan_folder')` vs `window.api.scanFolder`
  - `T5.2` render parity (auto): same `tagChips` + gallery count + `titlebar` text for default + filtered views
  - `T5.3` playback (manual): play/pause/seek/mute, auto-advance + toast, NO `AbortError` toast on rapid nav (guard ported from `renderer.js:642`)
  - `T5.4` OOM (auto+manual): 200-video folder → DOM nodes capped (~60 + pagination), no freeze; scroll smooth
  - `T5.5` errors (auto): corrupt sidecar → `.bak` + gallery intact; missing folder → empty state; ENOSPC save → `false` surfaced
  - `T5.6` a11y spot-check (manual): landmarks, `role=menu` nav, `aria-modal` focus return, `aria-valuenow` resize keys
  - `T5.7` perf: scan time within 2× Electron, `bundlesize <25MB` (CI), startup `<500ms`, idle `<80MB`
- Automated: `cargo test` + adapter tests + `npm test 87` + `npx c8 --lines 80` + CI `tauri.yml` green.
- **Gate decision:** ALL `T5.1–T5.7` pass → `git mv src src-electron-legacy && git mv tauri-poc/src src && git mv tauri-poc/src-tauri src-tauri` + update `README`, `AGENTS.md:9` `Electron → Tauri`. ANY fail → stay on `Electron`, file fix-forward tasks, re-run gate. POC isolation = zero regression risk either way. Full matrix results in `TEST_LOG.md`.

### Phase 6 — Mobile (separate milestone, not in size gate; under-specified — details)
- Toolchain: `rustup target add aarch64-linux-android armv7-linux-androideabi x86_64-linux-android` + Android SDK/NDK + `JAVA_HOME`/`ANDROID_HOME`/`NDK_HOME` (CI job needed — none defined yet).
- Manifest: `READ_MEDIA_VIDEO` (API 33+) vs `READ_EXTERNAL_STORAGE` (≤32), `keystore.properties` + Play signing (rotation/secret plan needed — vs `CSC_LINK`).
- Scoped storage: `path.isAbsolute` + `fs $VIDEO/**` model BREAKS — `scan_folder` must accept `content://` URIs via SAF/`MediaStore` picker (`tauri-plugin-fs` + `dialog`), not dir walk.
- UI: 25% resizable sidebar + hover tooltips + right-click menu unusable on touch → bottom-sheet/drawer + ≥44px targets + media-query rework of `styles.css`.
- Codecs: explicit matrix — `MP4/H.264` safe, `WebM/VP9` partial, `MOV/HEVC` often fails on OEM WebView (desktop WebView2 ≈ Chromium, mobile varies). Plan transcode-or-skip, not "test variance".
- **Test cases (separate Android CI job, new `tauri-android.yml`):**
  - `T6.1` toolchain: `cargo test --target aarch64-linux-android` compiles; SDK/NDK present in CI
  - `T6.2` permissions: fresh install requests `READ_MEDIA_VIDEO` (API 33+) / `READ_EXTERNAL_STORAGE` (≤32), deny → graceful empty state
  - `T6.3` `content://` scan: `MediaStore` folder → video list (no `path.isAbsolute` assumption)
  - `T6.4` codec matrix: `MP4/H.264` plays, `WebM/VP9` + `MOV/HEVC` per-device result recorded (transcode-or-skip decision)
  - `T6.5` touch: bottom-sheet nav, ≥44px targets, no hover/right-click dependency
- **Exit gate:** `T6.1–T6.5` on internal-track APK. Desktop gates unaffected.

---

## 4. File Map (Electron → Tauri)

| Electron | Tauri |
|----------|-------|
| `src/main/main.js:1` | `src-tauri/src/main.rs` + `commands.rs` + `config.rs` + `thumbnail.rs` |
| `src/preload/preload.js:1` | `src/js/tauriIpc.ts` (adapter) |
| `src/renderer/*` | `tauri-poc/src/*` (Vite, same) |
| `package.json:47-79` `build` | `src-tauri/tauri.conf.json` `build`+`bundle` |
| `installer.iss:1` | `tauri.conf.json` `bundle > windows > nsis` |
| `scripts/afterPack.js:1` | `tauri.conf.json` `bundle > externalBin` (no locales prune needed) |
| `.github/workflows/build.yml:1` | `.github/workflows/tauri.yml` (new, old kept) |
| `tests/main.test.js:1` | `src-tauri/src/commands.rs` `#[cfg(test)]` + `tests/tauri.test.js` (invoke mock) |

---

## 5. Risks & Mitigations

| Risk | Likelihood | Impact | Mitigation |
|------|------------|--------|------------|
| WebView `WebM/MOV` codec variance (`WebView2` vs Chromium `150`) | Med | Video not playable | Retain `MP4` baseline, test all three, transcode fallback or `ffmpeg` preview; gate requires `MP4/WebM/MOV` pass |
| `file://` → `asset://` + `convertFileSrc` miss (`renderer.js:72`) | High if in-place | Blank thumbnails/play | POC keeps both paths, adapter abstracts |
| `saveQueue Mutex` starvation (`main.js:87`) | Low | Lost `bounds` | `tokio::sync::Mutex` + `before-quit` sync flush `main.js:169` port |
| `capabilities` too strict (fs allow-list) | Med | `scan_folder` denied | Start allow `$VIDEO/**` + `$APPDATA/**`, tighten after gate |
| `ffmpeg` GPL + binary bloat (`ffmpeg-static`) | N/A if Tauri sidecar | `~280MB` | Use `ffmpeg-sidecar` Rust + `externalBin` only target OS |
| CI `Rust` + `TAURI_SIGNING` secrets missing | Med | Build fails | Keep `electron-builder --publish never` on `main`, gate Tauri CI on tag only |
| `tests` mock `electron` (`tests/main.test.js:22`) breaks | High if in-place | `87` red | POC has `src-tauri/tests/` separate, `main` untouched |

---

## 6. Testing Strategy (tauri-driver NOT viable — keep jsdom)

- **Unit:** `cargo test is_valid_tags/is_valid_bounds/sanitize/scan_folder` (tempdir mirror `tests/main.test.js:58`, `10KB` cap, `.bak`); coverage via `cargo-tarpaulin`/`llvm-cov` (c8 `package.json:30` covers only `src/**/*.js`, NOT `src-tauri/*.rs` — separate gates until cutover).
- **Frontend:** keep `npm test 87` untouched; new `tauri-poc/tests/tauri.adapter.test.js` mocking `global.__TAURI_INVOKE__` + shim parity (same fixtures as `renderer.test.js:24`).
- **e2e:** do NOT adopt `tauri-driver` (needs WebDriver+harness, flaky, zero coverage) — keep `jsdom` stub `tests/e2e-smoke.spec.js:1` + extend to `asset://`/`convertFileSrc` path, plus `cargo tauri build --debug` manual open → play → auto-advance.
- **perf:** `tauri build` `bundlesize <25MB` (no-ffmpeg) / `<90MB` (ffmpeg opt-in), `startup <500ms`, `idle <80MB`.

## 6.2 Regression Policy (anti-regression — applies to EVERY phase)

1. **No phase is marked done unless its exit gate passes in full.** Partial green = phase stays open with fix-forward tasks.
2. **End-of-phase regression (mandatory, every phase):** re-run ALL prior gates in order —
   `cargo test` (Phase 1) → adapter tests (Phase 2) → thumbnail tests (Phase 3) → `cargo tauri build` smoke (Phase 4) → `npm test` Electron `87/87` (always). A later phase that breaks an earlier gate blocks on the fix, not on new work.
3. **Evidence log:** append-only `tauri-poc/TEST_LOG.md` per phase — date, commit, each `Tn.m` case with pass/fail + duration, bundle sizes, manual checklist initials. No log entry = gate not passed.
4. **Electron frozen:** `src/`, `tests/`, `package.json`, workflows Electron-side are read-only during the port. Any Electron change needs its own `npm test 87` run + justification in the commit message.
5. **CI as backstop:** `tauri.yml` (`guard` skip pre-POC → full test/build once POC exists) runs on every push/PR touching `tauri-poc/**`; Electron `build.yml` runs on every push. Red CI = stop, fix, re-run — never stack new phases on red.

## 6.1 Multi-Agent Execution (required — plan previously had none)

| Stream | Owner files | Task | Gate |
|--------|-------------|------|------|
| **A Rust backend** | `tauri-poc/src-tauri/{commands,config,thumbnail}.rs`, `capabilities/default.json` | `scan_folder`/`config`/`tags` + validation ports, `cargo test` mirror of `main.test.js` | `cargo test` green |
| **B Frontend adapter** | `tauriIpc.ts`, `path.ts`, `tauri-shim.js`, `tests/tauri.adapter.test.js` | `__TAURI__` flag, `convertFileSrc` at 4 sites, drag-drop event, keep 87 green | `npm test 87` + adapter test green |
| **C Thumbs/build** | `thumbnail.rs`, `tauri.conf.json`, `tauri.yml`, updater/signing | sidecar `externalBin` + spawn scope, bundler, CI, bundlesize | `cargo tauri build` + `<25MB` |
| **D QA/mobile** | parity matrix, touch CSS, Android SDK/NDK CI spike | gate matrix (scan/thumbs/AbortError/OOM/CSP), scoped-storage spike | parity gate pass |

Coordination: `tauri-poc/` isolated, `main` frozen; daily parity check (same folder → same `tagChips`/`gallery`/auto-advance); cutover only via `git mv` after ALL gates pass. Effort ×1.5–2 vs plan (Rust/capabilities/updater learning): Phase 1 `3–5d→5–8d`, Phase 4 `2d→3–4d`.

---

## 7. Rollback

- Until gate, `main` is Electron; `tauri-poc/` is untracked. To rollback: `rm -rf tauri-poc/` + keep `6b341d5`.
- After cutover, `legacy-electron` branch at `84ac8a9` remains for hotfix.

---

## 8. Next Actions (status)

1. ✅ **Init POC spike** (`Phase 0`) — done `67b4b13` (`1.3MB` nsis + `1.9MB` msi).
2. **Port `scan_folder` + `config`** (`Phase 1`) — `commands.rs` + `capabilities`, exit on `T1.1–T1.8` (§6.2 regression applies).
3. **Wire `tauriIpc` adapter** (`Phase 2`) — `convertFileSrc` + `tests/tauri.adapter.test.js` (`T2.1–T2.6`).
4. **Thumbnail sidecar** (`Phase 3`) — decision (b) canvas vs (a) ffmpeg opt-in + `T3.1–T3.5`.
5. **Bundler/updater** (`Phase 4`) — pubkey paste (see `docs/TAURI_SIGNING.md`) + `T4.1–T4.5`.

Say `go phase 1` and Streams A–D launch in parallel (Streams defined in §6.1).
