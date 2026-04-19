---
title: Rust Video Player PRD
date: 2026-04-19
tags: [rust, video-player, windows, prd]
status: draft
version: 0.3
---

# Rust Video Player — Requirements Document

**Mode:** Agile Backlog
**Version:** 0.1 | **Date:** 2026-04-19 | **Status:** Draft
**Author:** PRD-Agent

---

## Overview

A native Windows video player built in Rust that solves the friction of navigating videos one-by-one in File Explorer. Features an integrated folder browser with thumbnail gallery and seamless keyboard navigation. Users open a folder → browse thumbnails → click to play. No switching to File Explorer needed.

## Objectives

- Play videos (MP4, MKV, WebM, AVI, MOV, FLV) with proper aspect ratio
- Browse video library as thumbnail gallery
- Navigate between videos with Up/Down keys
- Resizable two-panel layout
- Dark theme for comfortable viewing
- Fast startup and thumbnail generation (<3s)
- Tag videos for search/filter
- Auto-advance to next video when current ends (core feature from council)

## Out of Scope

- Subtitle support
- Network streaming
- Linux/macOS support
- Video editing
- Writing tags directly into video metadata (uses sidecar JSON instead)

## Open Questions

**Council Recommendations (applied in v0.3):**

1. **Interaction model:** Instead of full TikTok swipe (mobile gesture), use vertical snap-scroll with mouse wheel OR Netflix-style horizontal thumbnail bar with auto-advance. Full swipe conflicts with mouse controls.
2. **Format scope:** Start with supported formats only (MP4, WebM, MOV) — not all formats. MKV, AVI, FLV as v2 if needed.
3. **Keyboard-first nav:** Arrow keys for prev/next video, Space for play/pause, Escape for browse mode.
4. **Memory management:** Preload current video + next video only. Lazy-load rest to avoid OOM.
5. **Fallback logic:** Skip unsupported codecs gracefully — don't crash entire gallery if one file is corrupt.
6. **Platform:** Use Electron web wrapper (HTML/video.js) for fastest dev, not Rust native.

---

# Requirements: Agile Backlog

## THEME-01: Application Shell

**Description:** Basic window, layout, and theming that provides the container for all features.

---

### EPIC-01: Dark Theme Window

**Goal:** User sees a dark-themed application window with proper two-panel layout
**Scope:** Main window, dark theme, resizeable panels
**Dependencies:** None

**STORY-01:** As a user, I want a dark-themed window so visual experience is comfortable for video viewing
- **Priority:** Must Have
- **Size:** Small

**AC-01:** Given window, when opened, then dark theme applied

---

**STORY-02:** As a user, I want a two-panel layout (left: files, right: video) so I can browse and play simultaneously
- **Priority:** Must Have
- **Size:** Medium

**AC-01:** Given window, when opened, then left panel (25% default) and right panel visible
**AC-02:** Given two panels, when window resized, then proportions maintained

---

**STORY-03:** As a user, I want the left panel to be resizable so I can make more room for landscape videos
- **Priority:** Must Have
- **Size:** Small

**AC-01:** Given split view, when drag handle moved, then left panel Resizes
**AC-02:** Given left panel, when collapsed, then right panel fills window

---

## THEME-02: Folder & Gallery

**Description:** Open folders, scan videos, display gallery thumbnails, manage file list.

---

### EPIC-02: Folder Scanning

**Goal:** User opens a folder and sees all supported videos indexed
**Scope:** Folder picker, video scanning, format filtering
**Dependencies:** None

**STORY-04:** As a user, I want to open a folder via button so I can select my video library
- **Priority:** Must Have
- **Size:** Small

**AC-01:** Given folder dialog, when user clicks "Open Folder", then file picker opens
**AC-02:** Given folder selected, when scan completes, then video count displayed

---

**STORY-05:** As a user, I want videos scanned automatically so all supported formats appear in gallery
- **Priority:** Must Have
- **Size:** Small

**AC-01:** Given folder with MP4/MKV/WebM/AVI/MOV/FLV, when folder opened, then all appear in gallery
**AC-02:** Given unsupported file, when scanned, then file excluded

---

### EPIC-03: Thumbnail Gallery

**Goal:** User sees videos as thumbnails in left panel grid
**Scope:** Thumbnail generation, grid display, scroll
**Dependencies:** EPIC-02

**STORY-06:** As a user, I want video thumbnails shown so I can visually browse my library
- **Priority:** Must Have
- **Size:** Medium

**AC-01:** Given folder opened, when thumbnails load, then each video shows frame preview
**AC-02:** Given long folder, when scrolling, then lazy load (no UI freeze)

---

**STORY-07:** As a user, I want thumbnails generated fast so I'm not waiting long
- **Priority:** Must Have
- **Size:** Medium

**AC-01:** Given folder with N videos, when generating, then all complete within 3 seconds total
**AC-02:** Given generation in progress, when background, then UI remains responsive

---

**EPIC-03B: Search & Tags**

**Goal:** User can tag videos and search/filter by tags in gallery
**Scope:** Tag editor, search bar, filter logic
**Dependencies:** EPIC-02

**STORY-07A:** As a user, I want to add custom tags to my videos so I can organize and find them later
- **Priority:** Should Have
- **Size:** Medium

**AC-01:** Given video selected, when I click "Add Tag", then tag input appears
**AC-02:** Given tag entered, when saved, then stored in sidecar JSON alongside video
**AC-03:** Given video with tags, when folder reopened, then tags loaded from JSON

**AC-04:** Given .mp4 video, when tags saved, then video.json created in same folder
**AC-05:** Given video deleted, when tags exist, then .json file removed

---

**STORY-07B:** As a user, I want a search bar in the gallery so I can filter videos by name or tag
- **Priority:** Should Have
- **Size:** Small

**AC-01:** Given gallery view, when search bar typed, then videos filter in real-time
**AC-02:** Given search text, when matched against name OR tags, then matching videos shown
**AC-03:** Given search cleared, when refresh, then all videos shown again

---

## THEME-03: Video Playback

**Description:** Play videos with proper aspect ratio, controls, and quality.

---

### EPIC-04: Core Playback

**Goal:** Play selected video with correct aspect ratio
**Scope:** FFmpeg decode, audio sync, aspect ratio
**Dependencies:** EPIC-02

**STORY-08:** As a user, I want clicked video to auto-play so I don't need additional clicks
- **Priority:** Must Have
- **Size:** Small

**AC-01:** Given video in gallery, when clicked, then playback starts immediately

---

**STORY-09:** As a user, I want video to scale to fit panel while keeping aspect ratio so no distortion
- **Priority:** Must Have
- **Size:** Medium

**AC-01:** Given video playing, when panel resized, then letterbox/pillarbox maintains ratio
**AC-02:** Given landscape video, when full right panel, then fills without stretch

---

**STORY-10:** As a user, I want audio to sync with video so playback is smooth
- **Priority:** Must Have
- **Size:** Medium

**AC-01:** Given video playing, when audio plays, then in sync with video frames

---

### EPIC-04B: Auto-Advance (Council Feature)

**Goal:** When video ends, automatically play next in gallery — TikTok flow
**Scope:** End detection, auto-next, seamless transition
**Dependencies:** EPIC-04

**STORY-10A:** As a user, I want auto-advance so videos play continuously without clicking each one
- **Priority:** Must Have
- **Size:** Small

**AC-01:** Given video reaches end, when auto-advance enabled, then next video starts automatically
**AC-02:** Given last video in gallery, when auto-advance triggers, then loop to first or stop
**AC-03:** Given auto-advance, when I press any key, then auto-advance toggles off

**STORY-10B:** As a user, I want the gallery to show which video is "now playing" vs "up next" so I know what's coming
- **Priority:** Should Have
- **Size:** Small

**AC-01:** Given video playing, when in gallery, then current highlighted and "next" indicated

---

**STORY-11:** As a user, I want play/pause, seek, volume controls so I can control playback
- **Priority:** Must Have
- **Size:** Medium

**AC-01:** Given video playing, when pause clicked, then video pauses
**AC-02:** Given video paused, when play clicked, then video resumes
**AC-03:** Given video, when seek bar dragged, then video jumps
**AC-04:** Given video, when volume adjusted, then audio changes

---

## THEME-04: Navigation

**Description:** Move between videos seamlessly while playing.

---

### EPIC-05: Folder Navigation

**Goal:** Navigate between videos using keyboard and UI buttons
**Scope:** Up/Down keys, next/prev buttons, current highlight
**Dependencies:** EPIC-03

**STORY-12:** As a user, I want the currently playing video highlighted in the gallery so I know what's playing
- **Priority:** Must Have
- **Size:** Small

**AC-01:** Given video playing, when in gallery view, then highlight visible around thumbnail

---

**STORY-13:** As a user, I want Up arrow to play the previous video so I can navigate without clicking
- **Priority:** Must Have
- **Size:** Small

**AC-01:** Given video playing, when Up pressed, then previous video starts
**AC-02:** Given first video, when Up pressed, then cycles to last

---

**STORY-14:** As a user, I want Down arrow to play the next video so I can navigate without clicking
- **Priority:** Must Have
- **Size:** Small

**AC-01:** Given video playing, when Down pressed, then next video starts
**AC-02:** Given last video, when Down pressed, then cycles to first

---

**STORY-15:** As a user, I want Left/Right arrows to seek within current video
- **Priority:** Should Have
- **Size:** Small

**AC-01:** Given video playing, when Left pressed, then rewind 10s
**AC-02:** Given video playing, when Right pressed, then forward 10s

---

## Changelog

| Version | Date | Change | Author |
|---------|------|--------|--------|
| 0.1 | 2026-04-19 | Initial draft from PRD-Agent | PRD-Agent |
| 0.2 | 2026-04-19 | Added Search & Tags feature (STORY-07A, 07B) | PRD-Agent |
| 0.3 | 2026-04-19 | Council verdict applied — added auto-advance, format scope, platform guidance | Council + User |