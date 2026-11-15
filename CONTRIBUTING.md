# Contributing to RustyPlayer

Thank you for your interest in contributing to RustyPlayer, a lightweight Windows
desktop video player with a thumbnail gallery, built on Tauri v2 (Rust backend +
vanilla JS/TS frontend, Vite). This document covers setup, conventions, required
checks, and the pull request process.

## Prerequisites

- Node.js 18 or newer
- Rust toolchain (stable channel)
- Windows 10 or 11 (the target platform)
- WebView2 runtime (preinstalled on Windows 11)

## Getting Started

```sh
npm ci                 # install dependencies from the lockfile
npm run tauri dev      # run the app in development mode
npm run tauri build    # produce a release bundle (~2-3 MB NSIS installer)
```

## Repository Layout

- `src/` — frontend code. `renderer.js` owns all DOM manipulation; keep reusable
  logic in helper modules under `src/js/*.ts`.
- `src-tauri/src/` — Rust backend: `main.rs`, `lib.rs`, `commands.rs`, `config.rs`.
- `tests/` — frontend tests, run with Node's built-in test runner.
- `.github/workflows/tauri.yml` — CI: builds and tests on push/PR to `main`.

## Architecture Notes

- Media loads via the Tauri asset protocol (`convertFileSrc`); direct `file://`
  URLs are blocked by WebView2 and are not used.
- Window bounds persist through Rust-side handling on close.
- Tags are stored as sidecar JSON files next to the videos they describe.
- Configuration lives at `%APPDATA%\com.rustyplayer.app\rustyplayer-config.json`.

## Coding Conventions

### Rust

- Edition 2024.
- Clippy pedantic warnings are enabled; code must compile with zero warnings.
- Run `cargo fmt` before committing; `cargo fmt --check` must pass in CI.

### JavaScript / TypeScript

- Plain ES modules; no framework.
- `renderer.js` is the sole owner of the DOM. Do not touch the DOM from helper
  modules under `src/js/*.ts` — keep them pure and testable.
- Frontend tests live in `tests/*.test.js`.

### Commits

Use conventional commits:

```
feat: add volume slider
fix: preserve window bounds on second monitor
chore: bump tauri to 2.x
docs: expand contributing guide
```

## Required Checks (Gates)

Every PR must pass all of the following before merge:

```sh
node --test tests/*.test.js          # frontend tests, all green
cd src-tauri && cargo test           # Rust tests (currently 17), green
cargo clippy --all-targets -- -D warnings   # zero warnings
cargo fmt --check                    # formatting clean
```

CI (`.github/workflows/tauri.yml`) runs the build and tests on every push and PR
to `main`. A PR is mergeable only when CI is green.

## Pull Request Process

1. Keep PRs small and focused. A PR should do one thing.
2. Describe the behavior change in the PR description — what changed for the
   user, not just what changed in the code.
3. Make sure all gates above pass locally before pushing.
4. Wait for CI to be green; a maintainer will review.

## Scope Guidance

Version 1 supports MP4, WebM, and MOV only. MKV, AVI, FLV, and other formats are
deliberately out of scope for now. If you want to propose widening format
support or other significant features, open an Issue to discuss it first rather
than submitting a large PR out of the blue.

## Questions

If anything is unclear — setup, architecture, or conventions — open a Discussion
or Issue on GitHub. Questions are always welcome; they are often a sign that
documentation or code could be clearer.

## Licensing

By contributing, you agree that your contributions are licensed under the MIT
License, the same license as the project (see `LICENSE` at the repository root).
