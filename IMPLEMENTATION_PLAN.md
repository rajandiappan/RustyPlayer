# RustyPlayer Implementation Plan

## PRD Review

### Implemented (v0.1)
| Story | Feature | Status |
|-------|---------|--------|
| STORY-01 | Dark theme | ✅ |
| STORY-02 | Two-panel layout | ✅ |
| STORY-03 | Resizable sidebar | ✅ |
| STORY-04 | Open folder button | ✅ |
| STORY-05 | Video scanning (MP4, WebM, MOV) | ✅ |
| STORY-06 | Thumbnail gallery | ✅ |
| STORY-07 | Lazy loading | ✅ |
| STORY-07B | Search by name | ✅ |
| STORY-08 | Auto-play on click | ✅ |
| STORY-09 | Aspect ratio | ✅ |
| STORY-10 | Audio sync | ✅ |
| STORY-10A | Auto-advance | ✅ |
| STORY-10B | Now/Next highlight | ✅ |
| STORY-11 | Play/Pause/Seek/Volume | ✅ |
| STORY-12 | Playing highlight | ✅ |
| STORY-13 | Up arrow prev | ✅ |
| STORY-14 | Down arrow next | ✅ |
| STORY-15 | Left/Right seek | ✅ |

### Not Implemented / Gaps
| Story | Feature | Priority |
|-------|---------|----------|
| STORY-03 AC-02 | Collapse sidebar | Low |
| STORY-05 | Full format support (MKV, AVI, FLV) | Medium |
| STORY-06 | Real thumbnails (not video elements) | Medium |
| STORY-07A | Tag UI + save/load | High |
| STORY-07B | Search by tags | High |
| - | Window controls (min/max/close) | Medium |
| - | App icon | Low |
| - | Windows .exe release | **High** |

---

## Next Implementation Plan

### Phase 1: Bug Fixes & Polish
- [ ] Fix search to include tags in filter
- [ ] Add collapse sidebar when double-click handle
- [ ] Fix auto-advance toggle behavior (any key currently breaks)

### Phase 2: Tags System (STORY-07A)
- [ ] Add tag input UI on video click
- [ ] Save tags to sidecar JSON
- [ ] Load tags on folder scan
- [ ] Display tags in thumbnail view

### Phase 3: Enhancements
- [ ] Add more formats: MKV, AVI, FLV (via codec check)
- [ ] Real thumbnail generation using ffmpeg
- [ ] Window title showing current folder
- [ ] Remember last opened folder

### Phase 4: Windows Release
- [x] Configure electron-builder for exe
- [x] Build .exe (portable)
- [x] Create portable .zip package

---

## Build Output

**Portable exe (no installer):**
- `dist/win-unpacked/RustyPlayer.exe` - Run directly
- `dist/RustyPlayer-Portable.zip` - Zip archive (~136MB)

To run: Double-click `dist\win-unpacked\RustyPlayer.exe`

**Note:** NSIS installer failed due to Windows symlink privilege issue. Portable version works.