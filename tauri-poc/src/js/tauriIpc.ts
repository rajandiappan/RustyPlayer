import { invoke } from "@tauri-apps/api/core";

// Phase 2 adapter — mirrors `window.api` shape (`src/preload/preload.js:1`)
// over Tauri snake_case commands (`src-tauri/src/commands.rs`).
// Same camelCase method names so `src/renderer/renderer.js` call sites work
// unchanged behind the `window.api ??= tauriApi` shim (see `renderer.js` header).
export interface VideoEntry {
  name: string;
  path: string;
  tags: string[];
}

export const tauriApi = {
  openFolder: (): Promise<string | null> => invoke("open_folder"),
  scanFolder: (folderPath: string): Promise<VideoEntry[]> =>
    invoke("scan_folder", { folderPath }),
  getVideoTags: (videoPath: string): Promise<string[]> =>
    invoke("get_video_tags", { videoPath }),
  saveVideoTags: (videoPath: string, tags: string[]): Promise<boolean> =>
    invoke("save_video_tags", { videoPath, tags }),
  openInExplorer: (filePath: string): Promise<void> =>
    invoke("open_in_explorer", { filePath }),
  getConfig: (): Promise<Record<string, unknown>> => invoke("get_config"),
  saveConfig: (data: Record<string, unknown>): Promise<boolean> =>
    invoke("save_config", { data }),
  getRecentFolders: (): Promise<string[]> => invoke("get_recent_folders"),
  addRecentFolder: (folderPath: string): Promise<string[]> =>
    invoke("add_recent_folder", { folderPath }),
  generateThumbnail: (videoPath: string): Promise<string | null> =>
    invoke("generate_thumbnail", { videoPath }),
};
