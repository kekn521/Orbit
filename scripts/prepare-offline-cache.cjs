// Optional local bootstrap: copies already downloaded npm entries into a writable
// cache. No network requests. Normal installations do not need this script.
const path = require('node:path');
const npmRoot =
  process.env.NPM_MODULE_ROOT || 'C:/Program Files/nodejs/node_modules/npm/node_modules';
const cache = require(path.join(npmRoot, 'cacache'));
const source = process.argv[2];
const destination = path.resolve('.npm-cache/_cacache');
if (!source) throw new Error('Usage: node scripts/prepare-offline-cache.cjs <source _cacache>');
(async () => {
  const entries = Object.entries(await cache.ls(source)).filter(
    ([, entry]) => entry.size < 12000000,
  );
  for (const [key, entry] of entries) {
    const result = await cache.get(source, key);
    await cache.put(destination, key, result.data, { metadata: entry.metadata, time: entry.time });
  }
  console.log(`Copied ${entries.length} existing entries to the workspace npm cache.`);
})();
