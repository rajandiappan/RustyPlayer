'use strict';

const { describe, it, before, after } = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const Module = require('node:module');

// --- Mock the electron module before main.js is required -------------------
const handlers = {};
let whenReadyCb = null;
const dialogQueue = [];
const appListeners = {};
const userDataDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rustyplayer-config-'));
const appMock = {
  whenReady: () => ({ then: (cb) => { whenReadyCb = cb; } }),
  on: (event, fn) => { appListeners[event] = fn; },
  quit: () => { appMock.quitCalled = true; },
  quitCalled: false,
  getPath: (name) => (name === 'userData' ? userDataDir : os.tmpdir()),
};
function WindowMock(options) {
  WindowMock.lastOptions = options;
  WindowMock.instances.push(this);
  this.loadFile = (f) => { this.loadedFile = f; return Promise.resolve(); };
  this.setBounds = (b) => { this.boundsSet = b; };
  this.getBounds = () => ({ x: 10, y: 20, width: 1200, height: 800 });
  this.on = () => {};
  this.webContents = { setWindowOpenHandler: () => {}, on: () => {} };
}
WindowMock.instances = [];
WindowMock.lastOptions = null;
const browserWindowMock = WindowMock;
browserWindowMock.getAllWindows = () => [];
const electronMock = {
  app: appMock,
  BrowserWindow: browserWindowMock,
  ipcMain: { handle: (channel, fn) => { handlers[channel] = fn; } },
  dialog: { showOpenDialog: async () => dialogQueue.shift() ?? { filePaths: [] }, showMessageBoxSync: () => {} },
  shell: { showItemInFolder: (p) => { electronMock.shownPaths.push(p); } },
  shownPaths: [],
};
const originalLoad = Module._load;
Module._load = function (request, ...rest) {
  if (request === 'electron') return electronMock;
  return originalLoad.call(this, request, ...rest);
};

require(path.join(__dirname, '..', 'src', 'main', 'main.js'));

Module._load = originalLoad;

// --- Fixture folder ---------------------------------------------------------
let fixtureDir;
before(() => {
  fixtureDir = fs.mkdtempSync(path.join(os.tmpdir(), 'rustyplayer-test-'));
  for (const name of ['alpha.mp4', 'beta.webm', 'gamma.mov', 'notes.txt']) {
    fs.writeFileSync(path.join(fixtureDir, name), '');
  }
  fs.writeFileSync(
    path.join(fixtureDir, 'alpha.mp4.json'),
    JSON.stringify({ tags: ['action', 'favorite'] })
  );
});
after(() => {
  fs.rmSync(fixtureDir, { recursive: true, force: true });
  fs.rmSync(userDataDir, { recursive: true, force: true });
});

// ---------------------------------------------------------------------------
describe('main — window lifecycle', () => {
  it('creates the window with secure, dark defaults', () => {
    assert.ok(whenReadyCb, 'expected app.whenReady().then() to be called');
    whenReadyCb();
    const opts = WindowMock.lastOptions;
    assert.equal(opts.width, 1200);
    assert.equal(opts.height, 800);
    assert.equal(opts.backgroundColor, '#1a1a1a');
    assert.equal(opts.webPreferences.contextIsolation, true);
    assert.equal(opts.webPreferences.nodeIntegration, false);
    assert.ok(opts.webPreferences.preload.endsWith('preload.js'));
    const win = WindowMock.instances.at(-1);
    assert.ok(win.loadedFile.endsWith('index.html'));
  });
});

describe('main — open-folder handler', () => {
  it('returns the selected path', async () => {
    dialogQueue.push({ filePaths: ['C:\\Vids'] });
    assert.equal(await handlers['open-folder']({}), 'C:\\Vids');
  });

  it('returns null when the dialog is cancelled', async () => {
    dialogQueue.push({ canceled: true, filePaths: [] });
    assert.equal(await handlers['open-folder']({}), null);
  });
});

describe('main — scan-folder handler', () => {
  it('returns supported formats with sidecar tags loaded', async () => {
    const files = await handlers['scan-folder']({}, fixtureDir);
    assert.deepStrictEqual(
      files.map((f) => f.name).sort(),
      ['alpha.mp4', 'beta.webm', 'gamma.mov']
    );
    const alpha = files.find((f) => f.name === 'alpha.mp4');
    assert.deepStrictEqual(alpha.tags, ['action', 'favorite']);
    const beta = files.find((f) => f.name === 'beta.webm');
    assert.deepStrictEqual(beta.tags, []);
    for (const f of files) {
      assert.ok(f.path.startsWith(fixtureDir));
    }
  });

  it('returns an empty list for a missing folder instead of throwing', async () => {
    const files = await handlers['scan-folder']({}, path.join(fixtureDir, 'nope'));
    assert.deepStrictEqual(files, []);
  });
});

describe('main — tag handlers', () => {
  it('round-trips tags through save + get', async () => {
    const videoPath = path.join(fixtureDir, 'beta.webm');
    assert.equal(await handlers['save-video-tags']({}, videoPath, ['comedy']), true);
    assert.deepStrictEqual(
      await handlers['get-video-tags']({}, videoPath),
      { tags: ['comedy'] }
    );
    fs.rmSync(videoPath + '.json');
  });

  it('returns empty tags when no sidecar file exists', async () => {
    assert.deepStrictEqual(
      await handlers['get-video-tags']({}, path.join(fixtureDir, 'gamma.mov')),
      { tags: [] }
    );
  });
});

describe('main — open-in-explorer handler (Tier 2: item 11)', () => {
  it('reveals the file in the native file manager', async () => {
    const p = path.join(fixtureDir, 'alpha.mp4');
    await handlers['open-in-explorer']({}, p);
    assert.deepStrictEqual(electronMock.shownPaths.slice(-1), [p]);
  });
});

describe('main — config handlers (Tier 2: item 12)', () => {
  it('starts empty and round-trips saved state', async () => {
    assert.deepStrictEqual(await handlers['get-config']({}), {});
    assert.equal(await handlers['save-config']({}, { volume: 0.5, lastVideoIndex: 2 }), true);
    assert.deepStrictEqual(await handlers['get-config']({}), { volume: 0.5, lastVideoIndex: 2 });
  });

  it('merges new keys with previously saved state', async () => {
    await handlers['save-config']({}, { sidebarWidth: 30 });
    assert.deepStrictEqual(
      await handlers['get-config']({}),
      { volume: 0.5, lastVideoIndex: 2, sidebarWidth: 30 }
    );
  });

  it('restores saved window bounds on launch', () => {
    fs.writeFileSync(
      path.join(userDataDir, 'rustyplayer-config.json'),
      JSON.stringify({ bounds: { x: 5, y: 5, width: 800, height: 600 } })
    );
    whenReadyCb();
    assert.deepStrictEqual(
      WindowMock.instances.at(-1).boundsSet,
      { x: 5, y: 5, width: 800, height: 600 }
    );
  });

  it('persists bounds and quits when all windows close', () => {
    whenReadyCb(); // ensure mainWindow exists
    appListeners['window-all-closed']();
    const saved = JSON.parse(fs.readFileSync(path.join(userDataDir, 'rustyplayer-config.json'), 'utf-8'));
    assert.deepStrictEqual(saved.bounds, { x: 10, y: 20, width: 1200, height: 800 });
    assert.equal(appMock.quitCalled, true);
  });
});

describe('main — Tier 5 handlers (items 41, 43)', () => {
  it('manages recent folders with dedup and cap', async () => {
    // clean config
    fs.writeFileSync(path.join(userDataDir, 'rustyplayer-config.json'), JSON.stringify({}));
    assert.deepStrictEqual(await handlers['get-recent-folders']({}), []);
    await handlers['add-recent-folder']({}, 'C:\\Vids\\A');
    await handlers['add-recent-folder']({}, 'C:\\Vids\\B');
    await handlers['add-recent-folder']({}, 'C:\\Vids\\A');
    assert.deepStrictEqual(await handlers['get-recent-folders']({}), ['C:\\Vids\\A', 'C:\\Vids\\B']);
    for (let i = 0; i < 12; i++) await handlers['add-recent-folder']({}, `C:\\Vids\\${i}`);
    const recent = await handlers['get-recent-folders']({});
    assert.equal(recent.length, 10);
  });

  it('returns null thumbnail when no cached file exists and returns path when cached', async () => {
    const videoPath = path.join(fixtureDir, 'alpha.mp4');
    assert.equal(await handlers['generate-thumbnail']({}, videoPath), null);
    const thumbPath = videoPath + '.thumb.jpg';
    fs.writeFileSync(thumbPath, '');
    assert.equal(await handlers['generate-thumbnail']({}, videoPath), thumbPath);
    fs.rmSync(thumbPath);
  });

  it('creates window with hidden title bar overlay', () => {
    whenReadyCb();
    const opts = WindowMock.lastOptions;
    assert.equal(opts.titleBarStyle, 'hidden');
    assert.ok(opts.titleBarOverlay);
  });
});

describe('main — P0 IPC validation (items P0.3, P0.7)', () => {
  it('rejects non-absolute and wrong-ext video paths', async () => {
    assert.deepStrictEqual(await handlers['get-video-tags']({}, 'relative/path.mp4'), { tags: [] });
    assert.equal(await handlers['save-video-tags']({}, 'C:\\Vids\\evil.txt', ['x']), false);
    assert.equal(await handlers['save-video-tags']({}, 'C:\\Vids\\alpha.mp4', ['x'.repeat(65)]), false);
    assert.equal(await handlers['save-video-tags']({}, 'C:\\Vids\\alpha.mp4', Array(21).fill('x')), false);
  });

  it('rejects scan-folder with relative path and validates tags on load', async () => {
    assert.deepStrictEqual(await handlers['scan-folder']({}, 'relative/path'), []);
    // plant malformed sidecar with non-array tags
    const badPath = path.join(fixtureDir, 'beta.webm.json');
    fs.writeFileSync(badPath, JSON.stringify({ tags: 'notArray' }));
    assert.deepStrictEqual(await handlers['get-video-tags']({}, path.join(fixtureDir, 'beta.webm')), { tags: [] });
    fs.rmSync(badPath);
  });

  it('rejects prototype pollution and validates config bounds', async () => {
    fs.writeFileSync(path.join(userDataDir, 'rustyplayer-config.json'), JSON.stringify({}));
    assert.equal(await handlers['save-config']({}, JSON.parse('{"__proto__":{"polluted":true}}')), false);
    assert.equal(Object.prototype.polluted, undefined);
    assert.equal(await handlers['save-config']({}, { bounds: { x: 0, y: 0, width: 10, height: 10 } }), true);
    // width too small should be sanitized away (not saved)
    const before = await handlers['get-config']({});
    assert.equal(before.bounds, undefined);
  });

  it('validates open-in-explorer and generate-thumbnail', async () => {
    electronMock.shownPaths.length = 0;
    await handlers['open-in-explorer']({}, 'relative/path');
    assert.deepStrictEqual(electronMock.shownPaths, []);
    assert.equal(await handlers['generate-thumbnail']({}, 'C:\\Vids\\a.txt'), null);
    assert.equal(await handlers['generate-thumbnail']({}, 'relative.mp4'), null);
  });
});
