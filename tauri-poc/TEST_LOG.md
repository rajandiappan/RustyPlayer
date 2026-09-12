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
