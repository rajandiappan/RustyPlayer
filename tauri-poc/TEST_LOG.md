# RustyPlayer Tauri — Test Evidence Log (append-only, see TAURI_PORT_PLAN.md §6.2)

> Every phase exit appends: date, commit, each Tn.m case pass/fail + duration,
> bundle sizes, manual checklist. No entry = gate not passed.

## Phase 0 — Spike (2026-09-12, commit `67b4b13`)

| Case | Result | Notes |
|------|--------|-------|
| `npm run build` (tsc + vite, 7 modules) | ✅ pass (264ms) | |
| `npx tauri build --target x86_64-pc-windows-msvc` | ✅ pass (~7min) | `nsis 1.3MB`, `msi 1.9MB` |
| `npm test` Electron regression | ✅ 87/87 | `main` untouched |
| Schema corrections (`dragDropEnabled`, no `portable` target) | ✅ proven by build | Baked into plan §2/Phase 4 |

**Gate: PASSED.** No Rust commands yet — Phase 1.

## Phase 1 — Backend Parity (2026-09-12)

| Case | Result | Notes |
|------|--------|-------|
| `T1.1` validation ports (`is_valid_string/tags/bounds`, `sanitize_config` + `__proto__` reject) | ✅ pass | `config.rs` tests (4 tests) |
| `T1.2` `scan_dir` tempdir matrix (sorted, skips `.txt`, uppercase ext, missing/relative → `[]`) | ✅ pass | `commands.rs` (2 tests) |
| `T1.3` sidecar (valid/malformed→`.bak`/oversize/missing) | ✅ pass | covered in scan + `sidecar_rules` |
| `T1.4` `save_video_tags` round-trip + ext/tag rejects | ✅ pass | |
| `T1.5` config atomicity + 10× concurrent saves valid JSON | ✅ pass | `SAVE_MUTEX` mirrors `saveQueue` |
| `T1.6` recents dedup + cap 10 | ✅ pass | |
| `T1.7` reveal (absolute/exists/is-file/exe-deny) | ✅ pass | `reveal_item_in_dir`, never `shell::open` |
| `T1.8` `clippy --all-targets -- -D warnings` + `cargo fmt --check` | ✅ clean | |
| `cargo test` total | ✅ 13/13 | |
| `npx tauri build` (10 commands + dialog/fs/log/opener plugins + least-privilege capabilities) | ✅ pass | `nsis 1.5MB`, `msi 2.3MB` |
| `npm test` Electron regression | ✅ 87/87 | `src/`, `tests/` untouched |

**Gate: PASSED.** Commands registered but unwired to UI — Phase 2 adapter.

## Phase 2 — Frontend Adapter (2026-09-12)

| Case | Result | Notes |
|------|--------|-------|
| `T2.1` 10 methods → snake_case `invoke` + arg shapes | ✅ pass | `tests/tauri.adapter.test.js` |
| `T2.2` `asset://` URL (no `file:`, no `C%3A`) + `file:///` fallback parity | ✅ pass | `src/js/path.ts` |
| `T2.3` shim (`window.api = tauriApi`), 13 call sites intact | ✅ pass | source check; `renderer.js` copied + 3-line header |
| `T2.4` keyboard/a11y (`role=button`, `aria-valuenow`) preserved | ✅ pass | source check; full `styles.css` + `index.html` port |
| `T2.5` `onDragDropEvent` native drop (webkit path kept as no-op) | ✅ pass | source check; `dragDropEnabled: true` |
| `T2.6` `beforeunload` `saveConfig` path intact | ✅ pass | source check |
| `npm run build` (tsc + vite, 16 modules) | ✅ pass | |
| `cargo test` regression (Phase 1) | ✅ 13/13 | |
| `npx tauri build` full renderer bundle | ✅ pass | `nsis 1.6MB`, `msi 2.3MB` |
| `npm test` Electron regression | ✅ 87/87 | `src/`, `tests/` untouched |
| Manual same-folder render identical (`tauri dev` vs Electron) | ⏳ PENDING | Needs a display; run `tauri-poc` exe, open a video folder, compare with Electron |

**Gate: PASSED (auto).** Manual visual check left to user — Phase 3+ unaffected (backend/frontend decoupled via `invoke` surface, already tested).

## Phase 3 — Thumbnails (2026-09-12)

**Decision: option (b) default.** Zero-dep first-frame `<video>` display (already the
gallery fallback in both builds) ships; no ffmpeg binary bundled. Rationale: the
ffmpeg binary is GPL-3.0 (+25–80MB, kills the 1.3MB thesis) and blind canvas-seek
pipelines risk 60-decoder OOM with no display to verify. `generate_thumbnail` keeps
Electron's `null`-when-missing contract; ffmpeg opt-in stays a flagged follow-up.

| Case | Result | Notes |
|------|--------|-------|
| `T3.1` cache-hit returns `Some` without spawn | ✅ pass | `thumbnail_cache_hit_and_miss` |
| `T3.3` miss/invalid-ext/relative → `None`, no crash | ✅ pass | same test |
| `T3.2` ffmpeg generation | ➖ N/A | deferred with (b) decision |
| `T3.4` canvas capture | ➖ N/A | covered by (b): first-frame `<video>` already displays |
| `T3.5` sizes recorded | ✅ | `nsis 1.6MB` / `msi 2.3MB` — ffmpeg delta `0MB` |
| `cargo test` regression | ✅ 14/14 | |
| `clippy -D warnings` + `fmt --check` | ✅ clean | |
| Adapter tests regression | ✅ 3/3 | |
| `npm test` Electron regression | ✅ 87/87 | |

**Gate: PASSED.**

## Phase 4 — Pack/Sign/Update (2026-09-12)

| Case | Result | Notes |
|------|--------|-------|
| `T4.1` unsigned branch build (no secrets) | ✅ pass | `nsis 2.3MB`, `msi 3.3MB` (+updater/dialog/fs/log plugins) |
| `T4.2` bundlesize gate (<90MB, target <25MB) | ✅ pass | well under; ffmpeg delta still `0MB` |
| `T4.3` updater JSON signed on tags | ✅ config done / ⏳ secrets | real keypair generated (`~/.tauri/rustyplayer.key`, outside repo), pubkey pinned, `active: true`; needs `TAURI_SIGNING_PRIVATE_KEY` secret for tag signing (`docs/TAURI_SIGNING.md §2`) |
| `T4.4` installer smoke (install, launch, `asset:` clean console) | ⏳ PENDING | needs display; run `bundle/nsis/*.exe` |
| `T4.5` full regression | ✅ pass | `cargo 14/14`, `clippy`/`fmt` clean, adapter `3/3`, `npm 87/87` |
| CI `tauri.yml` (guard→test→build on next push) | ⏳ PENDING | verify green in GitHub Actions after push |

**Gate: PASSED (auto).** `T4.3/T4.4` + CI watch are user-side; they gate Phase 5 cutover, not Phase 5 prep.

## Phase 5 — Parity Gate (2026-09-12)

| Case | Result | Notes |
|------|--------|-------|
| `T5.1` scan parity (auto): shared `tests/fixtures/videos` | ✅ pass | `parity_shared_fixture` (sorted, tags, `.bak`, `note.txt` excluded) |
| `T5.2` render parity | ⏳ MANUAL | run-book `PARITY.md`; DOM is 1:1 port, ids verified by adapter test |
| `T5.3` playback incl. `AbortError` guard | ⏳ MANUAL | needs display + real media |
| `T5.4` OOM 200-video | ⏳ MANUAL | cap code ported verbatim (`MAX_VISIBLE=60`) |
| `T5.5` errors (auto part: corrupt→`.bak`, missing→`[]`) | ✅ pass | in `parity_shared_fixture` + `scan_missing_or_relative_is_empty` |
| `T5.6` a11y spot-check | ⏳ MANUAL | markup ported verbatim |
| `T5.7` perf (`<25MB`, `<500ms`, `<80MB`) | ✅/⏳ | size ✅ (`2.3MB`); timing needs display |
| Full regression | ✅ pass | `cargo 15/15`, `clippy`/`fmt` clean, adapter `3/3`, `npm 87/87` |

**Verdict: CUTOVER DEFERRED.** Auto green; manual T5.2–T5.4/T5.6 + T4.3 keys +
T4.4 smoke need a display and maintainer keys. Per §6.2 incomplete ≠ pass —
Electron stays primary, POC isolated, zero regression. Run-book: `PARITY.md`.

## Launch fix (2026-09-12)

**Symptom:** release exe exited silently on click (`0xC0000409`, Event 1000).
**Root cause:** `tauri-plugin-updater` panics at startup when `plugins.updater`
has no `pubkey` — even with `active: false` (found via debug build stderr:
`PluginInitialization("updater", ... missing field 'pubkey')`).
**Fix:** real keypair generated (`~/.tauri/rustyplayer.key`), pubkey pinned,
`active: true`. Rebuilt: `nsis 2.3MB` / `msi 3.3MB`.
**Verified:** release exe launches, stays ALIVE, working set **24 MB**
(Electron idle ~168MB). Lesson baked into plan: updater plugin REQUIRES pubkey.

## Playback fix (2026-09-12)

**Symptom:** folder scans, gallery renders, but every video fails with
`Playback failed: no supported source`.
**Root cause:** `app.security.assetProtocol` was never enabled — Tauri refuses ALL
`convertFileSrc` (`asset://`) loads unless `assetProtocol: { enable: true, scope }`
is set (`tauri.conf.json`). Docs: `v2.tauri.app/security/asset-protocol`.
**Fix:** `assetProtocol: { enable: true, scope: ["**/*"] }` (`**/*` because
user-picked folders can live anywhere) + `http(s)://asset.localhost` added to
`img-src`/`media-src` in `tauri.conf.json` CSP and `index.html` meta CSP.
Rebuilt, relaunched: ALIVE, **26 MB**. Lesson baked into plan §1.1.
**Verify:** open a real video folder — thumbnails + playback should work now.

## isTauri object-shape bug (2026-09-12, found via `debug_report` probe)

**Probe evidence** (`debug-last-play.json`): `isTauri: true` (probe's `!!` check)
but `src: file:///C:/Users/Raj/Videos/Demo/157551-815078267.mp4` with
`MEDIA_ELEMENT_ERROR: Media load rejected by URL safety check` — WebView2
blocking `file://`, which also explains blank gallery thumbnails (same helper).
**Root cause:** real `window.__TAURI__` is an OBJECT, but `path.ts isTauri()`
used strict `=== true` → always false → `file:///` fallback. The adapter test
mock used boolean `true`, hiding it.
**Fix:** truthiness check in `isTauri()`; mock now uses an object + new `T2.2b`
regression test (object/boolean/absent). Rebuilt, relaunched ALIVE — probe file
reset, awaiting one click to confirm `asset://` src.
**Verify:** click the MP4 again — playback + thumbnails should work now.

## Probe removal + user confirmation (2026-09-12)

- User confirmed: **playback works, "so fast"**. `debug_report` command +
  `debugReport` adapter method + renderer probe calls all reverted (nothing
  debug-only remains; adapter test asserts `debugReport === undefined`).
- Clean-build gate: `cargo 15/15`, `clippy`/`fmt` clean, adapter `4/4`,
  `npm test 87/87`, `nsis 2.3MB` / `msi 3.3MB`.
- Left for cutover decision (`PARITY.md`): manual T5.2/T5.4/T5.6 matrix,
  T4.3 signing secret, T4.4 installer smoke.
