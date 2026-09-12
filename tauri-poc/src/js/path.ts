import { convertFileSrc } from "@tauri-apps/api/core";

// Port of `pathToFileURL` (`src/renderer/renderer.js:72`) that works in both
// runtimes: Tauri `asset://` via `convertFileSrc`, Electron/file fallback via
// the original `encodeURI` implementation. Call sites stay `pathToFileURL(p)`.
export function isTauri(): boolean {
  if (typeof globalThis === "undefined") return false;
  const g = globalThis as Record<string, unknown>;
  if (g.__TAURI__ === true) return true;
  // node --test mock shape (browser globalThis === window, so harmless there)
  const w = g.window as Record<string, unknown> | undefined;
  return w !== undefined && w.__TAURI__ === true;
}

// Exact copy of the Electron fallback (`renderer.js:72-75`) so non-Tauri
// contexts (tests, Electron) behave identically.
export function pathToFileURLFallback(p: string): string {
  let normalized = p.replace(/\\/g, "/");
  if (!normalized.startsWith("/")) normalized = "/" + normalized;
  return encodeURI("file://" + normalized)
    .replace(/#/g, "%23")
    .replace(/\?/g, "%3F");
}

export function pathToFileURL(p: string): string {
  if (isTauri()) {
    // C:\Vids\alpha.mp4 → https://asset.localhost/... (NOT file://C%3A/...)
    return convertFileSrc(p);
  }
  return pathToFileURLFallback(p);
}
