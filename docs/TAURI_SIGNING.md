# Tauri Signing + Release Bootstrap (do BEFORE Phase 0 build)

> Electron stays primary until the Tauri parity gate (`TAURI_PORT_PLAN.md` Phase 5).
> This doc prepares everything CI needs so Phase 0–4 never block on secrets.
> Secrets are tag-gated: branch pushes/PRs build **unsigned** and still pass.

## 1. Required GitHub secrets (repo → Settings → Secrets and variables → Actions)

| Secret | Required for | Notes |
|--------|--------------|-------|
| `TAURI_SIGNING_PRIVATE_KEY` | Updater signatures (`latest.json`) on tags | Output of `tauri signer generate` (minisign secret key, base64). **Tag builds only.** |
| `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` | Same | Password you set at generation. Empty string if none. |
| `GITHUB_TOKEN` | `tauri-action` releases | Auto-provided, no setup. Workflow already has `contents: write`. |
| `CSC_LINK` *(optional)* | Windows Authenticode (SmartScreen) | Same cert flow as Electron `build.yml:42`. Base64 `.pfx`. Omit → unsigned exe, still installs. |
| `CSC_KEY_PASSWORD` *(optional)* | Same | Cert password. |

No other secrets needed. **Never commit `.key` / `.pfx` files** — `.gitignore` already blocks them (see §4).

## 2. One-time key generation (maintainer laptop, NOT CI)

Prereqs: Node 22 + Rust stable (1.79+) + Tauri CLI:

```powershell
cd tauri-poc
npx tauri signer generate --ci -w "$env:USERPROFILE\.tauri\rustyplayer.key" -f
# prints the PUBLIC KEY + writes the secret key file (no password with --ci)
```

✅ **DONE 2026-09-12:** keypair generated. Private key lives ONLY at
`C:\Users\Raj\.tauri\rustyplayer.key` (+`.pub`) — outside the repo, gitignored,
never committed. Public key is already pinned in `tauri-poc/src-tauri/tauri.conf.json`
(`plugins.updater.pubkey`, `active: true`).

Remaining maintainer steps:

1. Open `C:\Users\Raj\.tauri\rustyplayer.key`, copy its **entire contents** → GitHub secret `TAURI_SIGNING_PRIVATE_KEY`.
2. Back up the `.key` file in a password manager (loss = rotate keys + ship a release note, since old clients pin the old pubkey).
3. No password was set (`--ci`): leave secret `TAURI_SIGNING_PRIVATE_KEY_PASSWORD` **empty/unset**.
4. Never commit the `.key` (`.gitignore` blocks `*.key`).

Verify locally (unsigned path, no secrets needed):

```powershell
cd tauri-poc
npx tauri build --target x86_64-pc-windows-msvc
# expect: src-tauri/target/release/bundle/{nsis,portable}/*.exe  (~12-20MB, ~40-90MB with ffmpeg opt-in)
```

Verify signing (tags only): push `v*` tag → `tauri.yml:build` creates **draft** release with `latest.json` + signed bundles.

## 3. What CI does (`.github/workflows/tauri.yml`)

- `guard`: skips everything (green) while `tauri-poc/src-tauri/tauri.conf.json` is absent — safe pre-Phase 0.
- `test`: Node 22 + Rust stable + `Swatinem/rust-cache`, `npm ci` in `tauri-poc/`, `cargo test --locked`, `npm test --if-present`.
- `build` (push/main + tags + manual only; PRs test-only): `tauri-action@v0` with `projectPath: tauri-poc`, `includeUpdaterJson: true`, `args: --target x86_64-pc-windows-msvc`. Signing envs resolve to empty on branches → unsigned build passes. Tags → signed + **draft** release (human publishes after parity check).
- `Bundlesize gate`: fails any `.exe` over **90MB** (allows ffmpeg opt-in; tighten to 25MB once canvas thumbs land per plan Phase 3).
- Electron workflows untouched — `npm run pack --publish never` remains until cutover.

## 4. Files / gitignore (already applied)

```
# Rust / Tauri (added to .gitignore)
src-tauri/target/
src-tauri/WixTools/
tauri-poc/node_modules/
tauri-poc/src-tauri/target/
*.key
*.pfx
*.p12
```

## 5. Pre-Phase-0 checklist

- [ ] Secrets `TAURI_SIGNING_PRIVATE_KEY[_PASSWORD]` set (or explicitly deferred — CI still green unsigned)
- [ ] `tauri.yml` present and passing its `guard` skip on `main`
- [ ] Maintainer ran `tauri signer generate` and stored pubkey ready for Phase 4 paste
- [ ] (Optional) `CSC_LINK` Authenticode cert ready — else expect SmartScreen warning on test builds
- [ ] Mobile out of scope (plan Phase 6 removed): no keystore, no Play signing

## 6. Troubleshooting

| Symptom | Cause | Fix |
|---------|-------|-----|
| `tauri.yml` all-skipped green | No `tauri-poc/` yet | Expected pre-Phase 0. Say `go` to start spike. |
| `error: private key not found` on tag | Secrets missing | Add §1 secrets, re-run failed job (tags only). |
| `latest.json` missing | `includeUpdaterJson` + `updater.pubkey` unset | Paste pubkey per §2, ensure `plugins.updater.active: true`. |
| `spawn ffmpeg denied` | Missing `shell:allow-spawn` scope | Add per plan §1.1 capabilities, not `allowOpen`. |
| `capability fs denied` on scan | Allow-list too tight | Start `read $VIDEO/**` + write `*.json`/`*.thumb.jpg` only, tighten after gate. |
