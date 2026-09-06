const fs = require('fs');
const path = require('path');

exports.default = async function afterPack(context) {
  const localesDir = path.join(context.appOutDir, 'locales');
  if (!fs.existsSync(localesDir)) return;
  const keep = new Set(['en-US.pak']);
  for (const file of fs.readdirSync(localesDir)) {
    if (!keep.has(file)) {
      try { fs.unlinkSync(path.join(localesDir, file)); } catch {}
    }
  }
  console.log(`[afterPack] pruned locales, kept: ${[...keep].join(', ')}`);
};
