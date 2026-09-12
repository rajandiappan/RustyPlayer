// Updater wiring tests: silent-offline contract + event notification.
// The real @tauri-apps/plugin-updater `check()` is exercised only through the
// isTauri() guard (mocked bridge returns null = no update); available-update
// flow is tested via handleUpdateResult with a fake (no network, no WebView).
import { test, describe } from 'node:test';
import assert from 'node:assert/strict';

globalThis.window = {
  __TAURI__: { core: {}, event: {} },
  __TAURI_INTERNALS__: {
    invoke: async () => null,
    convertFileSrc: (p) => `https://asset.localhost/${p}`,
  },
  dispatchEvent: (ev) => {
    dispatched.push(ev);
    return true;
  },
};
const dispatched = [];

describe('updater — silent when no update or not Tauri', () => {
  test('null from check() resolves false, no events', async () => {
    const { checkForUpdatesOnStartup } = await import('../src/js/updater.ts');
    const seen = [];
    assert.equal(await checkForUpdatesOnStartup((m) => seen.push(m)), false);
    assert.deepEqual(seen, []);
  });

  test('non-Tauri runtime never invokes', async () => {
    delete globalThis.window.__TAURI__;
    const { checkForUpdatesOnStartup } = await import('../src/js/updater.ts');
    assert.equal(await checkForUpdatesOnStartup(() => {}), false);
    globalThis.window.__TAURI__ = { core: {}, event: {} };
  });
});

describe('updater — available-update flow', () => {
  test('notifies download + installed, returns true', async () => {
    const { handleUpdateResult } = await import('../src/js/updater.ts');
    const seen = [];
    let installed = false;
    const fake = {
      version: '9.9.9',
      downloadAndInstall: async () => {
        installed = true;
      },
    };
    assert.equal(await handleUpdateResult(fake, (m) => seen.push(m)), true);
    assert.equal(installed, true);
    assert.equal(seen.length, 2);
    assert.match(seen[0], /9\.9\.9.*downloading/);
    assert.match(seen[1], /restart to apply/);
  });

  test('null update notifies nothing', async () => {
    const { handleUpdateResult } = await import('../src/js/updater.ts');
    const seen = [];
    assert.equal(await handleUpdateResult(null, (m) => seen.push(m)), false);
    assert.deepEqual(seen, []);
  });
});
