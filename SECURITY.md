# Security Policy

## Supported Versions

| Version | Supported |
| ------- | --------- |
| v1.0.0 (latest release) | Yes |
| Older versions / `legacy-electron` branch | No |

Security fixes are applied to the latest release line only. Please make sure you
are running the newest published version before reporting an issue.

## Reporting a Vulnerability

Please report vulnerabilities privately through GitHub:

1. Go to the repository's **Security** tab.
2. Select **Report a vulnerability**.

This repository does not have a dedicated security email address; GitHub's
private vulnerability reporting is the preferred and only monitored channel.
Please do not report security issues in public Issues or Discussions.

When reporting, include:

- A description of the vulnerability and its potential impact.
- Steps to reproduce or a proof of concept.
- The version of the app you tested against.
- Any relevant logs, screenshots, or configuration details.

## Scope

### In scope

The RustyPlayer desktop application itself, including:

- **Asset-protocol path traversal** — whether media loading via the Tauri asset
  protocol (`convertFileSrc`) can be abused to read files outside the intended
  scope.
- **IPC command validation** — whether Tauri commands exposed by the Rust
  backend (`src-tauri/src/commands.rs` and related modules) can be invoked with
  malformed or unexpected arguments to cause unintended behavior.
- **Config file handling** — issues in parsing, writing, or the location of the
  configuration file (`%APPDATA%\com.rustyplayer.app\rustyplayer-config.json`),
  including injection or unsafe deserialization concerns.
- **Updater feed handling** — whether the updater (tauri-plugin-updater, with a
  pinned public key) can be manipulated through its feed or signature handling.

### Out of scope

- The SmartScreen warning shown on unsigned/locally built installers is known
  and expected behavior, not a vulnerability.
- Social engineering, phishing, or convincing users to run malicious files.
- Denial of service against the local app through resource exhaustion that
  requires local code execution or local file access.
- Issues in third-party dependencies that are not reachable from RustyPlayer.
- The archived `legacy-electron` codebase.

## Response Timeline

- **Acknowledgment:** within approximately 72 hours of your report.
- **Assessment:** an initial assessment of severity and validity follows
  acknowledgment; we will keep you informed of progress.
- **Fix and disclosure:** once a fix is ready, we will coordinate disclosure
  timing with you and credit you in the release notes if you wish.
