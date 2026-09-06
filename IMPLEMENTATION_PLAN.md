# RustyPlayer — Comprehensive UX Implementation Plan

> Generated from multi-agent code audit (UX/UI + Performance + Accessibility + PRD Gap).
> 44 improvement items → 73 concrete tasks across 5 tiers.

---

## What's Already Implemented ✅

- Dark theme two-panel layout, custom hidden titlebar (36px drag region)
- Thumbnail gallery with video thumbnails, skeleton loading, tag color coding
- Video playback (MP4, WebM, MOV) with crossfade, error toasts, async I/O
- Auto-advance with loop + now-playing toast
- Keyboard navigation (↑↓ prev/next, ←→ seek, Space play/pause, browse mode, ? overlay)
- Resizable + collapsible sidebar (double-click), window state persistence
- Search/filter by name + tag chips + debounced input
- Tag system (sidecar JSON) — inline popover editor + per-tag × removal
- Now playing / up next indicators, auto-scroll with scroll preservation, event delegation
- Empty state + no-results state, loading spinner, shortcut hints, seek tooltip
- Fullscreen (button + double-click + Esc), Picture-in-Picture
- Custom context menu (Play, Copy Path, Open in Explorer, Edit Tags)
- Volume levels (🔊/🔈/🔇), mute toggle with volume sync
- Folder name display, recent folders, drag-and-drop folder open, ffmpeg thumbnail hook
- Accessibility: landmarks, sr-only labels, focus-visible, reduced-motion, aria-live timer, keyboard-operable thumbnails, enlarged touch targets, aria-pressed, contrast fixes

---

## Audit Findings Summary

| Domain | Critical | High | Medium | Low |
|--------|----------|------|--------|-----|
| UX/UI | 4 | 6 | 8 | 4 |
| Performance | 3 | 3 | 2 | 0 |
| Accessibility | 5 | 5 | 0 | 0 |
| PRD Gaps | 2 | 2 | 2 | 0 |
| **Total** | **14** | **16** | **12** | **4** |

---

# TIER 1 — Quick Wins

> High impact, low effort. Do these first.

---

## Item 1: Replace `prompt()` with Inline Tag Editor

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T1.1** | Create floating popover DOM structure. Replace `addTagBtn` click handler to show `<div class="tag-popover">` with input + Save/Cancel buttons, positioned via `getBoundingClientRect()` on the clicked `+` button. | `renderer.js` (lines 79-88) | M |
| **T1.2** | Implement save/cancel/outside-click logic. On Save: split by comma, call `saveVideoTags()`, update `videos[]`, re-render. On Cancel or click-outside: remove popover. Use one-shot `mousedown` listener for outside-click. | `renderer.js` | M |
| **T1.3** | Add tag popover CSS: `.tag-popover` (absolute, z-100, #333 bg, border-radius 6px, shadow), `.tag-input` (width 100%, #2a2a2a bg), `.tag-popover-actions` (flex, gap 6px, right-aligned). | `styles.css` | S |

**Dependencies:** None. **Acceptance:** Clicking `+` opens styled popover; `prompt()` never called.

---

## Item 2: Use Existing `.empty-state` CSS Class

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T2.1** | Create `showEmptyState()` function that sets `gallery.innerHTML` to `<div class="empty-state"><p>Open a folder to get started</p></div>`. Call on script init and when `videos.length === 0`. | `renderer.js` | S |
| **T2.2** | Verify `renderGallery()` clears empty state when folder loads (already handled by `gallery.innerHTML = ''` at line 42). Test flow: empty → load → populated. | `renderer.js` | S |

**Dependencies:** None. **Acceptance:** Fresh load shows centered "Open a folder" message.

---

## Item 3: Add "No Results" Empty State

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T3.1** | After computing `filtered` in `renderGallery()`, add: if `filtered.length === 0 && searchTerm`, show `<div class="empty-state"><p>No videos match your search</p></div>` and return early. | `renderer.js` (after line 48) | S |
| **T3.2** | If `filtered.length === 0 && !searchTerm`, call `showEmptyState()` from T2.1. Clearing search restores gallery or empty state. | `renderer.js` | S |

**Dependencies:** T2.1. **Acceptance:** Zero-result search shows message; clearing search restores gallery.

---

## Item 4: Fix Auto-Advance Active State on Load

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T4.1** | Add `autoAdvanceBtn.classList.add('active')` after DOM setup (after line 15). Button starts styled as ON to match `autoAdvance = true`. | `renderer.js` | S |

**Dependencies:** None. **Acceptance:** Auto button shows blue `.active` background on page load.

---

## Item 5: Disable Controls When No Video Loaded

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T5.1** | Add `.control-btn.disabled` CSS: `opacity: 0.4; cursor: not-allowed; pointer-events: none;`. Add `.seek-bar.disabled, .volume-bar.disabled` with same properties. | `styles.css` | S |
| **T5.2** | On init: add `.disabled` to playPauseBtn, seekBar, volumeBar. In `playVideo()`: remove `.disabled` from all three. Auto-advance stays enabled (it's a mode toggle). | `renderer.js` | S |
| **T5.3** | Add JS guards: early return in playPauseBtn handler if `currentIndex === -1`. Early return in seekBar handler if `currentIndex === -1`. Safety net behind CSS `pointer-events: none`. | `renderer.js` | S |

**Dependencies:** T5.1 → T5.2 → T5.3. **Acceptance:** Controls dimmed on load; activate after video selection.

---

## Item 6: Add Mute Toggle Button

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T6.1** | Add `<button id="muteBtn" class="control-btn" aria-label="Mute">🔊</button>` in controls between timeDisplay and volumeBar. | `index.html` | S |
| **T6.2** | Destructure `muteBtn`. Add click listener: toggle `videoPlayer.muted`, swap text between `🔊`/`🔇`, update title attribute. | `renderer.js` | S |
| **T6.3** | In `volumeBar` input handler: if volume > 0 and muted, auto-unmute and reset icon. Keep mute icon in sync with volume state. | `renderer.js` | S |

**Dependencies:** T6.1 → T6.2 → T6.3. **Acceptance:** Click mutes/unmutes; icon reflects state; volume slider unmutes.

---

## Item 7: Use Play/Pause Icons Instead of Text

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T7.1** | Replace all `playPauseBtn.textContent = 'Pause'` (lines 86, 121, 156, 200) with `⏸`. Replace all `textContent = 'Play'` (lines 159, 202) with `▶`. | `renderer.js` | S |
| **T7.2** | Add `min-width: 36px; text-align: center; font-size: 16px;` to `.control-btn` so button width stays constant when icon toggles. | `styles.css` | S |

**Dependencies:** T7.1 → T7.2. **Acceptance:** Button shows `▶`/`⏸` icons; width doesn't shift.

---

## Item 8: Show Folder Name, Not Full Path

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T8.1** | Replace full path in `folderInfo` with basename: `folderPath.split(/[\\/]/).pop()`. Set `folderInfo.title = folderPath` for native tooltip. | `renderer.js` (line 29) | S |
| **T8.2** | Add `text-overflow: ellipsis; overflow: hidden; white-space: nowrap;` to `.folder-info`. Remove `word-break: break-all`. | `styles.css` | S |

**Dependencies:** T8.1 → T8.2. **Acceptance:** Shows "MyVideos (12 videos)"; hover reveals full path.

---

# TIER 2 — Feature Additions

> High impact, medium effort. Expected by video player users.

---

## Item 9: Fullscreen Button + Double-Click Fullscreen

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T9.1** | Add `<button id="fullscreenBtn" class="control-btn" aria-label="Fullscreen">⛶</button>` in controls after autoAdvanceBtn. | `index.html` | S |
| **T9.2** | Create `toggleFullscreen()`: if `document.fullscreenElement` → `exitFullscreen()`, else → `document.documentElement.requestFullscreen()`. Bind to fullscreenBtn click and `videoPlayer` dblclick. | `renderer.js` | S |
| **T9.3** | Modify Escape handler: if `document.fullscreenElement`, exit fullscreen and return before focusing search. | `renderer.js` (line 207) | S |

**Dependencies:** None. **Acceptance:** ⛶ toggles fullscreen; double-click video toggles; Escape exits.

---

## Item 10: Picture-in-Picture Button

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T10.1** | Add `<button id="pipBtn" class="control-btn" style="display:none;" aria-label="Picture in Picture">⧉</button>` after fullscreenBtn. | `index.html` | S |
| **T10.2** | On `loadedmetadata`, check `document.pictureInPictureEnabled` and show/hide pipBtn. Bind click to toggle PiP. Add `enterpictureinpicture`/`leavepictureinpicture` listeners to toggle `.active` class. | `renderer.js` | S |

**Dependencies:** None. **Acceptance:** Button only visible if PiP supported; toggles PiP mode.

---

## Item 11: Custom Context Menu

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T11.1** | Add CSS: `.context-menu` (position fixed, z-9999, #2a2a2a, border-radius 6px, shadow, min-width 180px), `.context-menu-item` (padding 8px 16px, hover #3a3a3a), `.context-menu-separator` (height 1px, #444). | `styles.css` | S |
| **T11.2** | Create `showContextMenu(x, y, items)` function: remove existing menu, create positioned div, append items with click handlers, append to body. Create `hideContextMenu()` on click/scroll/resize. | `renderer.js` | M |
| **T11.3** | Register `contextmenu` on `videoPlayer` and each thumbnail. Menu items: Play/Pause, Fullscreen, Copy Path (`navigator.clipboard.writeText`), Open in Explorer (new IPC), Edit Tags (calls showTagInput). | `renderer.js` | M |
| **T11.4** | Add IPC channel `open-in-explorer` in preload.js and main.js. Use `shell.showItemInFolder(filePath)`. Import `shell` from electron. | `preload.js`, `main.js` | S |

**Dependencies:** None. **Acceptance:** Right-click shows styled custom menu; actions work; menu closes on outside click.

---

## Item 12: Window State Persistence

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T12.1** | Create config helpers in main.js: `getConfigPath()` → `app.getPath('userData')/rustyplayer-config.json`, `loadConfig()`, `saveConfig(data)`. | `main.js` | S |
| **T12.2** | Add IPC handlers: `get-config` (returns loadConfig()), `save-config` (calls saveConfig(data)). | `main.js` | S |
| **T12.3** | In `createWindow()`: restore `mainWindow.setBounds(config.bounds)` if present. Register `will-quit`: save bounds. | `main.js` | S |
| **T12.4** | Expose `getConfig`/`saveConfig` in preload.js. | `preload.js` | S |
| **T12.5** | On startup: restore sidebarWidth, volume, lastFolder, lastVideoIndex from config. On `beforeunload`: save all state. | `renderer.js` | M |

**Dependencies:** None. **Acceptance:** Close/reopen restores window size, sidebar, volume, last folder+video.

---

## Item 13: Debounce Search Input

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T13.1** | Add `debounce(fn, ms)` utility at top of renderer.js. Replace inline search listener with `searchInput.addEventListener('input', debounce(() => renderGallery(searchInput.value.toLowerCase()), 200))`. | `renderer.js` | S |

**Dependencies:** None. **Acceptance:** Rapid typing triggers render only 200ms after last keystroke.

---

## Item 14: Keyboard Shortcut Hints

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T14.1** | Add `<div id="shortcutHints" class="shortcut-hints">` after controls with `<kbd>` elements for Space, ↑↓, ←→, Esc. | `index.html` | S |
| **T14.2** | Style: `.shortcut-hints` (flex, gap 16px, padding 6px 16px, #1a1a1a bg, 11px font, #666 color). Style `kbd` elements (bg #333, padding 1px 5px, border-radius 3px). | `styles.css` | S |

**Dependencies:** None. **Acceptance:** Shortcut hints visible below controls in dark theme.

---

## Item 15: Seek Bar Hover Preview Tooltip

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T15.1** | Create seek tooltip element dynamically: `div.seek-tooltip` positioned absolute above cursor. Add `mousemove` listener on seekBar: calculate ratio → time → display tooltip. Add `mouseleave` to hide. | `renderer.js`, `styles.css` | S |

**Dependencies:** None. **Acceptance:** Hovering seek bar shows timestamp tooltip following cursor.

---

## Item 16: Volume Icon Changes with Level

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T16.1** | Add `<button id="volumeMuteBtn" class="control-btn volume-icon">🔊</button>` before volumeBar. | `index.html` | S |
| **T16.2** | Create `updateVolumeIcon()`: set icon to `🔇` if muted/vol=0, `🔈` if vol<0.5, `🔊` otherwise. Bind to volumeBar input, `volumechange` event, and muteBtn click. | `renderer.js` | S |

**Dependencies:** None. **Acceptance:** Icon changes with volume level; click mutes/unmutes.

---

## Item 17: Tag Filter Chips Above Gallery

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T17.1** | Add `<div id="tagChips" class="tag-chips"></div>` between folder-info and gallery. | `index.html` | S |
| **T17.2** | Style: `.tag-chips` (flex, wrap, gap 6px, padding 8px 12px, border-bottom). `.tag-chip` (bg #333, padding 3px 10px, border-radius 12px, cursor pointer). `.tag-chip.active` (bg #4a9eff, white). | `styles.css` | S |
| **T17.3** | Add `activeTagFilter` state. Create `renderTagChips()`: collect unique tags, render "All" chip + one per tag. Chip click toggles filter, re-renders chips + gallery. Modify `renderGallery()` to apply tag filter before search filter. Call `renderTagChips()` after scanFolder and tag saves. | `renderer.js` | M |

**Dependencies:** None. **Acceptance:** Tag chips appear; clicking filters gallery; combines with text search.

---

## Item 18: Loading Spinner on Folder Scan

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T18.1** | Add `<div id="loadingSpinner" class="loading-spinner" style="display:none;"><div class="spinner"></div><span>Scanning folder...</span></div>` inside gallery. | `index.html` | S |
| **T18.2** | Style: `.loading-spinner` (flex column, center, gap 12px, #888). `.spinner` (32px, 3px border, #4a9eff top, 0.8s spin animation). `@keyframes spin`. | `styles.css` | S |
| **T18.3** | Wrap openFolderBtn handler: show spinner, disable button, clear gallery. After scanFolder resolves: hide spinner, enable button. Use try/finally for error safety. | `renderer.js` | S |

**Dependencies:** None. **Acceptance:** Spinner shows during scan; button disabled; spinner hides on completion/error.

---

# TIER 3 — Polish & Performance

> Medium impact, medium effort. Makes the app feel professional.

---

## Item 19: Event Delegation on Gallery

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T19.1** | Add single delegated click listener on `gallery` using `event.target.closest('.thumbnail')`. Handle add-tag button (`.add-tag-btn`) with `stopPropagation`, and thumbnail click. Add `data-index` attribute to each thumbnail. Remove per-element listeners from `renderGallery()`. | `renderer.js` (lines 83, 96) | S |

**Dependencies:** None. **Acceptance:** One listener handles all gallery clicks; add-tag and play still work.

---

## Item 20: Virtual Scrolling for Gallery

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T20.1** | Extract thumbnail creation into `createThumbnailElement(video, originalIndex)` helper function. Move lines 52-94 into it. Return the `.thumbnail` div (no event listeners — delegation handles that). | `renderer.js` | M |
| **T20.2** | Implement virtual scroll: create a tall spacer div, calculate visible range from `scrollTop` + `clientHeight` + buffer (±5 items), only append thumbnails for visible range. Listen to `scroll` event to re-render visible items. | `renderer.js` | L |
| **T20.3** | Add `data-index` attribute to thumbnails for mapping back to video array. Update `renderGallery()` to clear spacer and recalculate range on filter changes. | `renderer.js` | M |

**Dependencies:** T19.1 (delegation must be in place). **Acceptance:** 200+ videos: only ~30 DOM nodes exist; smooth scroll.

---

## Item 21: Async Main-Process I/O

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T21.1** | Replace `fs.readdirSync` → `await fs.promises.readdir` in `scan-folder` handler (line 52). | `main.js` | S |
| **T21.2** | Replace `fs.readFileSync` → `await fs.promises.readFile` in tag read operations (lines 62, 85). Replace `fs.existsSync` with try/catch on readFile. | `main.js` | S |
| **T21.3** | Replace `fs.writeFileSync` → `await fs.promises.writeFile` in `save-video-tags` handler (line 96). | `main.js` | S |

**Dependencies:** None. **Acceptance:** No `*Sync` calls remain; main thread never blocks during I/O.

---

## Item 22: Gallery Scroll Position Preservation

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T22.1** | Save `gallery.scrollTop` before `renderGallery()` clears DOM. Restore via `requestAnimationFrame` after rebuild. | `renderer.js` (line 42) | S |
| **T22.2** | In `playVideo()`: only auto-scroll to playing thumb if it's NOT already visible (check `getBoundingClientRect` vs gallery bounds). | `renderer.js` (line 123-128) | S |

**Dependencies:** None. **Acceptance:** Editing tags doesn't jump to top; playing video still scrolls into view.

---

## Item 23: Video Crossfade on Switch

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T23.1** | Add `transition: opacity 0.15s ease-in-out; opacity: 1;` to `.video-wrapper`. Add `.video-wrapper.fading { opacity: 0; }`. | `styles.css` | S |
| **T23.2** | Modify `playVideo()`: add `.fading` class, setTimeout 150ms to swap source and remove `.fading`. | `renderer.js` | S |

**Dependencies:** None. **Acceptance:** Video switches with smooth fade-out/fade-in (no black flash).

---

## Item 24: Now-Playing Toast Overlay

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T24.1** | Add `<div class="now-playing-toast" id="nowPlayingToast"></div>` inside `.player`. Add `position: relative` to `.player`. | `index.html`, `styles.css` | S |
| **T24.2** | Style: `.now-playing-toast` (absolute, bottom 60px, centered, rgba(0,0,0,0.75), padding 8px 20px, border-radius 20px, pointer-events none, opacity 0, transition 0.3s). `.visible` → opacity 1. | `styles.css` | S |
| **T24.3** | Create `showNowPlayingToast(name)`: set text, add `.visible`, setTimeout 2500ms to remove. Call in `videoPlayer 'ended'` handler AFTER advancing to next video. | `renderer.js` | S |

**Dependencies:** None. **Acceptance:** Auto-advance shows "Now playing: filename" toast for 2.5s; not on manual play.

---

## Item 25: Skeleton Loading State for Thumbnails

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T25.1** | Add `.thumbnail::before` pseudo-element: gradient skeleton (#2a2a2a → #333 → #2a2a2a), `background-size: 200% 100%`, `animation: skeleton-pulse 1.5s infinite`. Add `.thumbnail.loaded::before { display: none; }`. | `styles.css` | S |
| **T25.2** | In `createThumbnailElement()`: add `vid.addEventListener('loadedmetadata', () => thumb.classList.add('loaded'), { once: true })`. | `renderer.js` | S |

**Dependencies:** T20.1 (helper function). **Acceptance:** Pulsing skeleton shows before metadata loads; disappears after.

---

## Item 26: Tag Color Coding

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T26.1** | Add `hashStringToHue(str)` and `getTagColor(tagName)` helper functions. Hash tag name → deterministic hue → return `{bg: hsl(hue,30%,25%), text: hsl(hue,40%,75%)}`. | `renderer.js` | S |
| **T26.2** | In tag rendering: apply inline `style.backgroundColor` and `style.color` from `getTagColor()`. Remove hardcoded `.tag` background/color from CSS. | `renderer.js`, `styles.css` | S |

**Dependencies:** T20.1 (helper function). **Acceptance:** Each tag gets unique consistent hue; readable on dark bg.

---

# TIER 4 — Accessibility (WCAG 2.1 AA)

> Compliance requirements. Many are quick fixes.

---

## Item 27: Add `aria-label` to All Controls

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T27.1** | Add `aria-label` to: openFolderBtn ("Open folder"), searchInput ("Search videos"), playPauseBtn ("Play"), seekBar ("Seek"), volumeBar ("Volume"), autoAdvanceBtn ("Toggle auto-advance"), muteBtn ("Mute"), fullscreenBtn ("Fullscreen"), pipBtn ("Picture in Picture"). | `index.html` | S |
| **T27.2** | Add `aria-label` to dynamically created addTagBtn: `Add tag to ${video.name}`. Update playPauseBtn `aria-label` on toggle. | `renderer.js` | S |

**Dependencies:** None. **Acceptance:** Screen readers announce each control correctly.

---

## Item 28: Fix Color Contrast Failures

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T28.1** | Bump colors to meet WCAG AA (4.5:1): `.tag` color → `#c0c0c0`, `.folder-info` color → `#9e9e9e`, `.empty-state` color → `#999`, `.time-display` color → `#9e9e9e`, `.resize-handle` bg → `#555`. | `styles.css` | S |

**Dependencies:** None. **Acceptance:** All text meets 4.5:1 contrast ratio.

---

## Item 29: Add `:focus-visible` Styles Globally

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T29.1** | Add global `*:focus-visible { outline: 2px solid #4a9eff; outline-offset: 2px; }`. Add `*:focus:not(:focus-visible) { outline: none; }` for mouse users. Add specific overrides for seekBar, volumeBar, searchInput (border-color + box-shadow). | `styles.css` | S |

**Dependencies:** None. **Acceptance:** Tab shows blue ring on all interactive elements; mouse clicks don't.

---

## Item 30: Add Semantic Landmarks

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T30.1** | Wrap sidebar in `<aside role="complementary" aria-label="Video gallery">`. Wrap toolbar in `<nav aria-label="Folder controls">`. Wrap player in `<main role="main" aria-label="Video player">`. Add `role="list"` to gallery. Add `role="separator"` to resize handle. | `index.html` | S |

**Dependencies:** T27.1 (aria-labels). **Acceptance:** Screen readers navigate by landmark.

---

## Item 31: Add `<label>` Elements for Inputs

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T31.1** | Add visually hidden `<label class="sr-only">` elements for searchInput, seekBar, volumeBar. Add `.sr-only` CSS class (absolute, 1px, clip, hidden). | `index.html`, `styles.css` | S |

**Dependencies:** None. **Acceptance:** Each input has associated label; screen readers announce it.

---

## Item 32: Add `@media (prefers-reduced-motion)`

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T32.1** | Add media query: `animation-duration: 0.01ms !important; transition-duration: 0.01ms !important;` for all elements. Remove `.thumbnail:hover` transform. Disable all transition properties. | `styles.css` | S |

**Dependencies:** None. **Acceptance:** With OS reduce-motion enabled, no animations/transitions run.

---

## Item 33: Add `aria-live` Region for Time Display

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T33.1** | Add `aria-live="polite" role="timer" aria-atomic="true"` to timeDisplay span. | `index.html` | S |
| **T33.2** | Throttle aria-label updates to once per second (track `lastAnnouncedTime`, only update if minute changed). | `renderer.js` | S |

**Dependencies:** None. **Acceptance:** Screen readers announce time no more than once per second.

---

## Item 34: Surface Playback Errors

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T34.1** | Create `showError(message)` function: create/find `div.error-toast` with `role="alert" aria-live="assertive"`, show message, auto-dismiss after 5s. | `renderer.js` | M |
| **T34.2** | Style `.error-toast`: fixed bottom-center, #d32f2f bg, white text, slide-up animation. `.visible` class for show/hide. | `styles.css` | S |
| **T34.3** | Replace `videoPlayer.play().catch(() => {})` with `.catch(err => showError('Playback failed: ' + (err.message || 'Unsupported format'))`. | `renderer.js` (line 119) | S |

**Dependencies:** T32.1 (reduced-motion disables toast animation). **Acceptance:** Failed playback shows red error toast for 5s.

---

## Item 35: Make Gallery Thumbnails Keyboard-Operable

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T35.1** | Add `role="button" tabindex="0" aria-label="Play ${video.name}"` to each thumbnail div. Add keydown listener: Enter/Space → `playVideo()`. | `renderer.js` | M |
| **T35.2** | Add `.thumbnail:focus-visible { outline: 2px solid #4a9eff; outline-offset: 2px; }`. | `styles.css` | S |

**Dependencies:** T29.1 (global focus-visible). **Acceptance:** Tab moves through thumbnails; Enter/Space plays; focus ring visible.

---

## Item 36: Enlarge Touch Targets

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T36.1** | Increase `.add-tag-btn` to 44×44px with flex centering. Increase seek thumb to 18×18px. Increase volume thumb to 18×18px. | `styles.css` | S |

**Dependencies:** None. **Acceptance:** All interactive controls meet 44px minimum touch target.

---

# TIER 5 — Power User Features

> Lower priority, high value for enthusiasts.

---

## Item 37: Browse Mode (Gallery Arrow-Key Navigation)

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T37.1** | Add `browseMode` and `browseIndex` state variables. Modify keydown handler: if `browseMode`, Up/Down calls `moveBrowseFocus(delta)` instead of `playVideo()`. Enter plays focused video and exits browse mode. Escape exits browse mode. | `renderer.js` | M |
| **T37.2** | Create `setBrowseMode(active)`, `moveBrowseFocus(delta)`, `highlightBrowseThumb()` functions. Map `browseIndex` back to filtered gallery position. Scroll focused thumb into view. | `renderer.js` | M |
| **T37.3** | Add `.thumbnail.browse-focus { outline: 2px solid #ffaa00; outline-offset: 2px; }`. | `styles.css` | S |

**Dependencies:** T35.1 (keyboard-operable thumbnails). **Acceptance:** Arrows browse without playing; Enter plays; Escape exits.

---

## Item 38: Custom Title Bar

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T38.1** | Add `titleBarStyle: 'hidden'` and `titleBarOverlay: { color: '#1a1a1a', symbolColor: '#e0e0e0', height: 36 }` to BrowserWindow options. | `main.js` | S |
| **T38.2** | Add `<div class="titlebar"><span id="titlebarText">RustyPlayer</span></div>` at top of body. Style: `-webkit-app-region: drag`, height 36px, #1a1a1a bg. Adjust `.app` height to `calc(100vh - 36px)`. | `index.html`, `styles.css` | S |
| **T38.3** | In `playVideo()`: update `titlebarText.textContent` to `${video.name} — RustyPlayer`. | `renderer.js` | S |

**Dependencies:** None. **Acceptance:** Frameless window with custom draggable title bar showing current video.

---

## Item 39: Sidebar Collapse Toggle

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T39.1** | Add `sidebarCollapsed` state and `SIDEBAR_DEFAULT = 25` constant. Add `dblclick` listener on `resizeHandle`: toggle between 0% and 25% width. Toggle `min-width` between 0 and 200px. | `renderer.js` | M |
| **T39.2** | Add `transition: width 0.2s ease` to `.sidebar`. Add `.sidebar.collapsed` class with `width: 0 !important; min-width: 0; border: none;`. | `styles.css` | S |
| **T39.3** | Add optional collapse button `<button id="collapseBtn" class="btn" aria-label="Collapse sidebar">◀</button>` in toolbar. | `index.html` | S |

**Dependencies:** T32.1 (reduced-motion disables transition). **Acceptance:** Double-click resize toggles sidebar; player expands to full width.

---

## Item 40: Inline Tag Removal (× Button)

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T40.1** | In tag rendering: add `<button class="tag-remove-btn" aria-label="Remove tag ${tag}">×</button>` inside each tag span. Add click listener: filter out tag, save, re-render. | `renderer.js` | M |
| **T40.2** | Style `.tag-remove-btn`: no bg/border, #aaa color, hover → #ff4444 with subtle red bg. Add focus-visible style. Add `display: inline-flex; align-items: center; gap: 4px;` to `.tag`. | `styles.css` | S |

**Dependencies:** None. **Acceptance:** Tags show × on hover; clicking removes tag immediately; persisted to JSON.

---

## Item 41: FFmpeg Thumbnail Generation

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T41.1** | Install `fluent-ffmpeg` npm package. Add IPC handler `generate-thumbnail`: check for cached `.thumb.jpg`, if missing call `ffmpeg().screenshots()` at 2s mark, 320px width. Return thumb path or null on error. | `main.js` | L |
| **T41.2** | Expose `generateThumbnail` in preload.js. | `preload.js` | S |
| **T41.3** | In `createThumbnailElement()`: try generating thumbnail first. If path returned, create `<img>` with `file://` src. Fallback to `<video>` element. Make function async or use callback pattern. | `renderer.js` | L |
| **T41.4** | Add `.thumb-image` CSS: width 100%, aspect-ratio 16/9, object-fit cover. | `styles.css` | S |

**Dependencies:** None (requires ffmpeg installed on system). **Acceptance:** Real frame thumbnails; cached as .jpg; graceful fallback.

---

## Item 42: Drag-and-Drop Folder Open

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T42.1** | Add `<div class="drop-overlay" id="dropOverlay"><div class="drop-message">Drop a folder here to open</div></div>`. | `index.html` | S |
| **T42.2** | Style `.drop-overlay`: fixed inset, rgba(74,158,255,0.15) bg, 3px dashed #4a9eff border, z-9998, opacity 0, transition 0.2s. `.visible` → opacity 1. `.drop-message`: #4a9eff, 20px, font-weight 600. | `styles.css` | S |
| **T42.3** | Add `dragover`/`dragleave`/`drop` listeners on `document`. On dragover: show overlay. On dragleave (relatedTarget null): hide overlay. On drop: check `webkitGetAsEntry().isDirectory`, scan folder, hide overlay. | `renderer.js` | M |

**Dependencies:** None. **Acceptance:** Drag folder shows blue overlay; dropping loads it; files ignored.

---

## Item 43: Recent Folders List

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T43.1** | Add config persistence in main.js: `loadConfig()`/`saveConfig()` for recent folders array. Add IPC handlers `get-recent-folders` and `add-recent-folder` (dedup, cap at 10). | `main.js` | M |
| **T43.2** | Expose `getRecentFolders`/`addRecentFolder` in preload.js. | `preload.js` | S |
| **T43.3** | Create `openAndTrackFolder(path)` wrapper: scans, saves to recent, renders gallery + recent list. Create `renderRecentFolders()`: show last 10 as clickable items (basename only). | `renderer.js` | M |
| **T43.4** | Add `<div class="recent-section"><div class="recent-header">Recent Folders</div><div id="recentFolders"></div></div>` below folder-info. Style: section padding, header 11px uppercase #666, items 12px #9e9e9e, hover #3a3a3a. | `index.html`, `styles.css` | S |

**Dependencies:** None. **Acceptance:** Last 10 folders shown as clickable links; persists across restarts.

---

## Item 44: Keyboard Shortcut Overlay (`?` Key)

| Task | Description | Files | Effort |
|------|-------------|-------|--------|
| **T44.1** | Add `<div class="shortcut-overlay" id="shortcutOverlay" hidden>` with modal containing grouped shortcut list (Playback, Navigation, General). Add `role="dialog" aria-label="Keyboard shortcuts"`. | `index.html` | M |
| **T44.2** | Style overlay: fixed inset, rgba(0,0,0,0.7) bg, centered flex. Modal: #2a2a2a bg, border-radius 8px, padding 24px. Header with h2 + close button. Groups with h3 (#4a9eff uppercase). Rows with kbd elements. | `styles.css` | M |
| **T44.3** | Add `?` key handler: toggle overlay visibility. Close on Escape, click outside, or × button. Focus close button when opened. | `renderer.js` | S |

**Dependencies:** None. **Acceptance:** Press `?` shows modal with all shortcuts; dark themed; closes on Escape/outside click.

---

# Dependency Graph

```
TIER 1 (independent items):
  T1.1 → T1.2
  T2.1 → T2.2, T3.2
  T3.1 → T3.2
  T5.1 → T5.2 → T5.3
  T6.1 → T6.2 → T6.3
  T7.1 → T7.2
  T8.1 → T8.2

TIER 2 (independent items):
  T9.1-3 (standalone)
  T10.1-2 (standalone)
  T11.1-4 (standalone)
  T12.1-5 (standalone)
  T13.1 (standalone)
  T14.1-2 (standalone)
  T15.1 (standalone)
  T16.1-2 (standalone)
  T17.1-3 (standalone)
  T18.1-3 (standalone)

TIER 3 (some cross-dependencies):
  T19.1 → T20.1 → T20.2 → T20.3
  T20.1 → T25.1-2, T26.1-2
  T21.1-3 (standalone)
  T22.1-2 (standalone)
  T23.1-2 (standalone)
  T24.1-3 (standalone)

TIER 4 (some cross-dependencies):
  T27.1 → T30.1
  T29.1 → T35.1-2
  T32.1 → T34.1, T39.2
  T35.1 → T37.1-3

TIER 5 (independent):
  T38.1-3 (standalone)
  T41.1-4 (standalone)
  T42.1-3 (standalone)
  T43.1-4 (standalone)
  T44.1-3 (standalone)
```

---

# Effort Summary

| Tier | Items | Tasks | S | M | L | Est. Hours |
|------|-------|-------|---|---|---|------------|
| Tier 1 — Quick Wins | 8 | 18 | 14 | 4 | 0 | 6-8h |
| Tier 2 — Features | 10 | 23 | 16 | 7 | 0 | 12-16h |
| Tier 3 — Polish | 8 | 18 | 12 | 3 | 3 | 14-18h |
| Tier 4 — Accessibility | 10 | 16 | 13 | 3 | 0 | 8-10h |
| Tier 5 — Power User | 8 | 23 | 9 | 8 | 6 | 20-26h |
| **Total** | **44** | **98** | **64** | **25** | **9** | **60-78h** |

---

# Recommended Execution Order

| Phase | Items | Why |
|-------|-------|-----|
| **Phase 1** | T1-T8 (Tier 1) | Quick wins — immediate UX lift with minimal risk |
| **Phase 2** | T13, T18, T9, T10, T6, T7 (Tier 2 partial) | Debounce, spinner, fullscreen, PiP, mute, icons — core player feel |
| **Phase 3** | T27-T36 (Tier 4) | Accessibility fixes — compliance baseline |
| **Phase 4** | T19-T26 (Tier 3) | Performance + polish — event delegation, async I/O, crossfade, toast |
| **Phase 5** | T11, T12, T14-T17 (Tier 2 remaining) | Context menu, persistence, hints, tags, spinner |
| **Phase 6** | T37-T44 (Tier 5) | Power user features — browse mode, title bar, drag-drop, etc. |
| **Phase 7** | P0 Hardening | Ship-blocking production gaps |
| **Phase 8** | P1/P2 Hardening | Production-grade backlog |

---

# TIER 6 — Production Hardening (from 5-agent audit)

> Added after full 44-item implementation. P0 = ship-blocking, P1 = 1-2 sprints, P2 = backlog. Each task maps to audit finding with file:line.

## P0 — Ship-blocking

| ID | Task | Files | Effort |
|----|------|-------|--------|
| **P0.1** | **Crash handlers:** add `process.on('uncaughtException')` + `app.on('render-process-gone','child-process-gone')` in `main.js:58` showing `dialog.showMessageBox`; add `window.onerror`/`unhandledrejection` in `renderer.js:1` → `showError`. | `main.js`, `renderer.js` | S |
| **P0.2** | **Sandbox hardening:** add `sandbox:true, webSecurity:true` to `BrowserWindow` (`main.js:32`), add `setWindowOpenHandler(()=>{action:'deny'})` + `will-navigate` deny non-`file://` after `createWindow`. Fix CSP `index.html:6` → `default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' file: data:; media-src 'self' file:; object-src 'none'; base-uri 'none'; connect-src 'self'`. | `main.js`, `index.html` | S |
| **P0.3** | **IPC validation (arbitrary FS + pollution):** validate `folderPath/videoPath/filePath` in all `main.js:83,109,118,129,145,153` handlers — `path.isAbsolute`, `ext` whitelist, `Array.isArray(tags)` + length caps (20 tags × 64 chars), cap `tags` JSON 10KB, guard `__proto__` pollution (`Object.assign` → `structuredClone` + schema check), cap `recentFolders` 10×260 chars, validate `bounds` numeric + on-screen. | `main.js` | M |
| **P0.4** | **Gallery OOM (virtualization):** finish `T20.2/3` — `gallery` uses `IntersectionObserver` lazy `src` (default `preload='none'`), cap visible DOM to ~30 (+5 buffer) or fix `preload='metadata'` to `current+next` only per `AGENTS.md:9`. | `renderer.js` | M |
| **P0.5** | **Signing + update channel:** `package.json:26` add `publish:{provider:'github'}`, document `CSC_LINK`/`CSC_KEY_PASSWORD` usage, add `electron-updater` + `autoUpdater.checkForUpdatesAndNotify()` in `main.js`, consolidate 3 workflows (`build.yml`/`installer-release.yml`/`portable-release.yml`) into single `release.yml` with `needs: test`. | `package.json`, `main.js`, `.github/workflows/*` | M |
| **P0.6** | **CI must run tests:** add `npm test` + `c8` after `npm ci` in all 3 workflows; make `build` `needs: test`; add branch protection required check. | `.github/workflows/*` | S |
| **P0.7** | **Shell UNC leak:** `main.js:129` `open-in-explorer` — validate `fs.existsSync(filePath)` + `path.isAbsolute` + `startsWith(allowedRoot)` before `shell.showItemInFolder`. | `main.js` | S |

## P1 — Production-grade (next 1-2 sprints)

| ID | Task | Files | Effort |
|----|------|-------|--------|
| **P1.1** | Surface `video.error` event + `showError` persistent variant with copy/report; surface `saveVideoTags`/`loadConfig` failures; atomic `saveConfig` (write tmp + rename + mutex). | `renderer.js`, `main.js` | M |
| **P1.2** | Fix `beforeunload` race `renderer.js:803` (async `saveConfig` may be killed) — use `close` + `event.preventDefault(); saveSync(); destroy()` or `sendSync` for last flush; keep sync only in `before-quit`. | `main.js`, `renderer.js` | S |
| **P1.3** | Coverage + E2E: add `c8 --check-coverage --lines 80` + Playwright Electron smoke (open folder → play → auto-advance) + negative cases (malformed sidecar, ENOSPC). | `package.json`, `tests/*`, `.github/workflows/*` | M |
| **P1.4** | Version drift `package.json:3` vs `installer.iss:3` — inject from `GITHUB_REF` / `app.getVersion()`; fix `Rustyplayer` typo. | `package.json`, `installer.iss` | S |
| **P1.5** | A11y traps: context menu `role=menu/menuitem` + arrow nav, popover/overlay `inert` + `aria-modal=true` + return focus, recent items as `button`, `resizeHandle` `aria-valuenow/min/max` + keyboard Arrow. | `renderer.js`, `index.html`, `styles.css` | M |
| **P1.6** | Observability: add `electron-log` to `app.getPath('logs')`, `crashReporter.start`, `render-process-gone` logging. | `main.js` | S |
| **P1.7** | Dead code cleanup: remove `player` var `renderer.js:26`, `get-video-tags` orphan `preload.js:6`, `.time-display` dead `styles.css:629`, duplicate helpers `togglePlayPause`/`refreshFilters`. | `renderer.js`, `styles.css` | S |

## P2 — Backlog / hardening

| ID | Task | Files | Effort |
|----|------|-------|--------|
| **P2.1** | Replace `innerHTML` in `showEmptyState:52` with `createElement/TextNode`; validate sidecar JSON schema + 10KB cap + move corrupt `.bak`; fix TOCTOU `existsSync` → `fs.promises.access`. | `renderer.js`, `main.js` | S |
| **P2.2** | Deduplicate CSS (`--accent`, `--border` vars), gallery diff vs full re-render, cache config in memory, `bundlesize` guard, `git rm --cached dist`. | `styles.css`, `renderer.js`, `main.js` | S |
| **P2.3** | A11y polish: toast `assertive`, drop overlay `role=status`, gate `smooth` scroll on `prefers-reduced-motion`, `role=listitem` on thumbs, skip link. | `renderer.js`, `index.html`, `styles.css` | S |
| **P2.4** | File URL encoding: `vid.src=file://` fails on spaces/`#` → `URL.pathToFileURL(p).href` + `encodeURI`. | `renderer.js`, `main.js` | S |
| **P2.5** | Logic fixes: `showTagPopover` bounds check `0<=index<videos.length`, `playVideo` `videos.length===0` guard, `seek` `Number.isFinite(duration)`, browse `filtered` vs `videos` index mismatch, drag-drop `isDirectory` check, overlapping `openAndRenderFolder` disable, stale `video.src` on empty folder, `autoAdvance` loop intent, `beforeunload` `NaN` in `parseFloat`. | `renderer.js`, `main.js` | M |
