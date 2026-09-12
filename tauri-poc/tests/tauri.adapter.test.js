// Phase 2 gate T2.1–T2.6: tauriIpc adapter parity + asset path resolution.
// Runs under plain `node --test` (ESM; Node strips .ts types); `window.api`
// shape must match `src/preload/preload.js:1` so `src/renderer.js` call sites work.
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

const calls = [];
const fixtures = {
  open_folder: 'C:\\Vids',
  scan_folder: [{ name: 'a.mp4', path: 'C:\\Vids\\a.mp4', tags: ['rock'] }],
  get_video_tags: ['rock'],
  save_video_tags: true,
  open_in_explorer: null,
  get_config: { volume: 0.5 },
  save_config: true,
  get_recent_folders: ['C:\\Vids'],
  add_recent_folder: ['C:\\Vids'],
  generate_thumbnail: null,
};

// Mock the Tauri IPC bridge before importing the adapter.
// NOTE: real window.__TAURI__ is an OBJECT, not boolean true — the mock must
// match reality (a `=== true` check here once hid the file:// fallback bug).
globalThis.window = {
  __TAURI__: { core: {}, event: {} },
  __TAURI_INTERNALS__: {
    invoke: async (cmd, args) => {
      calls.push({ cmd, args });
      return fixtures[cmd];
    },
    // Mirrors @tauri-apps/api convertFileSrc (asset://, drive colon kept).
    convertFileSrc: (filePath) =>
      `https://asset.localhost/${encodeURI(String(filePath).replace(/\\/g, '/')).replace(/#/g, '%23')}`,
  },
};

describe('tauri adapter — T2.1 all 10 methods map to snake_case commands', () => {
  test('invoke mapping + arg shapes', async () => {
    const { tauriApi } = await import('../src/js/tauriIpc.ts');
    assert.equal(typeof tauriApi.openFolder, 'function');
    assert.equal(tauriApi.debugReport, undefined); // probe removed after diagnosis
    assert.equal(await tauriApi.openFolder(), 'C:\\Vids');
    assert.deepEqual(await tauriApi.scanFolder('C:\\Vids'), fixtures.scan_folder);
    assert.deepEqual(await tauriApi.getVideoTags('C:\\Vids\\a.mp4'), ['rock']);
    assert.equal(await tauriApi.saveVideoTags('C:\\Vids\\a.mp4', ['rock']), true);
    await tauriApi.openInExplorer('C:\\Vids\\a.mp4');
    assert.deepEqual(await tauriApi.getConfig(), { volume: 0.5 });
    assert.equal(await tauriApi.saveConfig({ volume: 0.5 }), true);
    assert.deepEqual(await tauriApi.getRecentFolders(), ['C:\\Vids']);
    assert.deepEqual(await tauriApi.addRecentFolder('C:\\Vids'), ['C:\\Vids']);
    assert.equal(await tauriApi.generateThumbnail('C:\\Vids\\a.mp4'), null);

    const cmds = calls.map((c) => c.cmd);
    assert.deepEqual(cmds, [
      'open_folder',
      'scan_folder',
      'get_video_tags',
      'save_video_tags',
      'open_in_explorer',
      'get_config',
      'save_config',
      'get_recent_folders',
      'add_recent_folder',
      'generate_thumbnail',
    ]);
    assert.deepEqual(calls[1].args, { folderPath: 'C:\\Vids' });
    assert.deepEqual(calls[3].args, { videoPath: 'C:\\Vids\\a.mp4', tags: ['rock'] });
    assert.deepEqual(calls[6].args, { data: { volume: 0.5 } });
  });
});

describe('tauri adapter — T2.2b __TAURI__ object shape (regression)', () => {
  test('object (real) and boolean (legacy mock) both detect Tauri; absent does not', async () => {
    const pathMod = await import('../src/js/path.ts');
    globalThis.window.__TAURI__ = { core: {} };
    assert.equal(pathMod.isTauri(), true);
    globalThis.window.__TAURI__ = true;
    assert.equal(pathMod.isTauri(), true);
    delete globalThis.window.__TAURI__;
    assert.equal(pathMod.isTauri(), false);
    globalThis.window.__TAURI__ = { core: {}, event: {} };
    assert.equal(pathMod.isTauri(), true);
  });
});

describe('tauri adapter — T2.2 asset paths (no file://, no C%3A)', () => {
  test('convertFileSrc under __TAURI__, fallback otherwise', async () => {
    const pathMod = await import('../src/js/path.ts');
    assert.equal(pathMod.isTauri(), true);
    const url = pathMod.pathToFileURL('C:\\Vids\\my video #1.mp4');
    assert.match(url, /^https:\/\/asset\.localhost\//);
    assert.doesNotMatch(url, /file:/);
    assert.doesNotMatch(url, /C%3A/);
    // Fallback parity with renderer.js:72 (spaces encoded, drive colon kept)
    const fb = pathMod.pathToFileURLFallback('C:\\Vids\\my video #1.mp4');
    assert.equal(fb, 'file:///C:/Vids/my%20video%20%231.mp4');
  });
});

describe('tauri adapter — T2.3/T2.4 structural parity (source checks)', () => {
  test('renderer port keeps shim, roles, guards', () => {
    const src = fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer.js'), 'utf-8');
    assert.match(src, /window\.api = tauriApi/); // T2.3 shim (!window.api guard), 13 call sites intact
    assert.match(src, /onDragDropEvent/); // T2.5 Tauri native drop
    assert.match(src, /'role', 'button'/); // T2.4 keyboard thumbs
    assert.match(src, /aria-valuenow/); // T2.4 resize a11y
    assert.match(src, /saveConfig\(\{/); // T2.6 beforeunload save path
    const html = fs.readFileSync(path.join(__dirname, '..', 'index.html'), 'utf-8');
    assert.match(html, /img-src 'self' asset:/);
    assert.match(html, /media-src 'self' asset:/);
    assert.match(html, /id="gallery"/);
    assert.match(html, /id="videoPlayer"/);
  });
});
