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
