// Entry: full renderer port + update check. `renderer.js` (ported from
// Electron with the tauriApi shim + asset:// paths + native drag-drop) owns
// all UI; update status arrives as CustomEvents rendered as toasts there.
import "./renderer.js";
import { checkForUpdatesOnStartup } from "./js/updater.js";

// Fire-and-forget after boot so a slow/offline endpoint never blocks the UI.
setTimeout(() => {
  checkForUpdatesOnStartup().catch(() => {});
}, 3000);
