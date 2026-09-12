import { check } from "@tauri-apps/plugin-updater";
import { isTauri } from "./path.ts";

// Update-check wiring (Electron parity: autoUpdater.checkForUpdatesAndNotify).
// Silent on failure (offline, unsigned dev build, no release yet).
// UI surface is a DOM CustomEvent so renderer.js stays the only DOM owner.
export const UPDATE_EVENT = "rustyplayer-update";

export type Notify = (message: string) => void;

export function notifyDefault(message: string): void {
  if (typeof window !== "undefined") {
    window.dispatchEvent(new CustomEvent(UPDATE_EVENT, { detail: message }));
  }
}

export interface AvailableUpdate {
  version: string;
  downloadAndInstall: () => Promise<void>;
}

export async function handleUpdateResult(
  update: AvailableUpdate | null,
  notify: Notify = notifyDefault
): Promise<boolean> {
  if (!update) return false;
  notify(`Update available: v${update.version} — downloading…`);
  await update.downloadAndInstall();
  notify(`Update ${update.version} installed — restart to apply`);
  return true;
}

export async function checkForUpdatesOnStartup(
  notify: Notify = notifyDefault
): Promise<boolean> {
  if (!isTauri()) return false;
  try {
    const update = await check();
    return handleUpdateResult(update, notify);
  } catch {
    return false;
  }
}
