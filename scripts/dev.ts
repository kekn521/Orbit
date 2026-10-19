import { build } from 'vite';

// Build-watch works even where native esbuild dependency scanning is restricted.
// The production server serves each completed build. Refresh to see changes.
const watcher = await build({ configLoader: 'native', build: { watch: {}, minify: false } });
if (!('on' in watcher)) throw new Error('Expected a Vite build watcher');
let started = false;
watcher.on('event', async (event) => {
  if (event.code === 'END') {
    if (!started) {
      started = true;
      await import('../server/index.ts');
    } else console.log('Frontend rebuilt. Refresh the browser to see changes.');
  }
  if (event.code === 'ERROR') console.error(event.error);
});
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    void watcher.close();
  });
