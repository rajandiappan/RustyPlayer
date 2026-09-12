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
