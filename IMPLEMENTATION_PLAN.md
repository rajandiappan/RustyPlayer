# RustyPlayer Implementation Plan

## What's Implemented ✅
- Dark theme two-panel layout
- Thumbnail gallery with video thumbnails
- Video playback (MP4, WebM, MOV)
- Auto-advance playback
- Keyboard navigation (↑↓ prev/next, ←→ seek, Space play/pause)
- Resizable sidebar
- Search/filter by name
- Tag system (sidecar JSON)

## To Do 🔄

### High Priority
- [x] Folder path and video count display in sidebar (implemented locally, needs commit)
- [x] Current playing video highlighted in gallery (needs commit)
- [x] Gallery auto-scrolls to playing video (needs commit)
- [x] Pause video when adding tag (needs commit)

### Medium Priority
- [ ] Click thumbnail → toggle play/pause
- [ ] Window title showing current video name
- [ ] Remember last opened folder
- [ ] Real thumbnail generation (ffmpeg)

### Low Priority
- [ ] Add more formats (MKV, AVI, FLV)
- [ ] Collapse sidebar on double-click