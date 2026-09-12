const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  const localesDir = path.join(context.appOutDir, 'locales');
  if (fs.existsSync(localesDir)) {
    const keep = new Set(['en-US.pak']);
    for (const file of fs.readdirSync(localesDir)) {
      if (!keep.has(file)) {
        try { fs.unlinkSync(path.join(localesDir, file)); } catch {}
      }
    }
    console.log(`[afterPack] pruned locales, kept: ${[...keep].join(', ')}`);
  }
  // Prune additional chrome bloat (swiftshader, vk) that Electron ships but video player doesn't need
  const pruneDirs = ['swiftshader'];
  for (const d of pruneDirs) {
    const p = path.join(context.appOutDir, d);
    if (fs.existsSync(p)) {
      try { fs.rmSync(p, { recursive: true, force: true }); console.log(`[afterPack] pruned ${d}`); } catch {}
    }
  }
};
