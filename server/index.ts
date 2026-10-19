import { createServer } from 'node:http';
import { readFile, stat } from 'node:fs/promises';
import { resolve, extname, sep } from 'node:path';
import { Store } from './database.ts';
import { apiHandler, trustedRequest } from './http.ts';
const dev = process.argv.includes('--dev');
const store = new Store(resolve(process.env.DATA_DIR || 'data', 'orbit.sqlite'));
const api = apiHandler(store);
const vite = dev
  ? await (
      await import('vite')
    ).createServer({ configLoader: 'native', server: { middlewareMode: true }, appType: 'spa' })
  : null;
const root = resolve('dist');
const server = createServer(async (req, res) => {
  if (!trustedRequest(req)) {
    res.writeHead(403);
    res.end('Local access only');
    return;
  }
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('X-Frame-Options', 'DENY');
  if (!dev)
    res.setHeader(
      'Content-Security-Policy',
      "default-src 'self'; script-src 'self'; style-src 'self' 'unsafe-inline'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'",
    );
  if (req.url?.startsWith('/api/')) {
    await api(req, res);
    return;
  }
  if (vite) {
    vite.middlewares(req, res);
    return;
  }
  try {
    const pathname = decodeURIComponent(new URL(req.url || '/', 'http://localhost').pathname);
    let file = resolve(root, '.' + pathname);
    if (file !== root && !file.startsWith(root + sep)) {
      res.writeHead(403);
      res.end();
      return;
    }
    if (!extname(file)) file = resolve(root, 'index.html');
    if (!(await stat(file)).isFile()) throw new Error('Not a file');
    const types: Record<string, string> = {
      '.html': 'text/html; charset=utf-8',
      '.js': 'text/javascript',
      '.css': 'text/css',
      '.svg': 'image/svg+xml',
      '.png': 'image/png',
    };
    res.writeHead(200, {
      'Content-Type': types[extname(file)] || 'application/octet-stream',
      'Cache-Control': extname(file) === '.html' ? 'no-cache' : 'public, max-age=3600',
    });
    res.end(await readFile(file));
  } catch {
    res.writeHead(404);
    res.end('Page not found. Run npm run build before npm start.');
  }
});
const port = Number(process.env.PORT || 3000);
const host = process.env.HOST || '127.0.0.1';
if (!['127.0.0.1', '::1', '0.0.0.0'].includes(host))
  throw new Error('Unsupported HOST; use loopback or Docker internal binding');
server.listen(port, host, () =>
  console.log(
    `Orbit is running at http://localhost:${port} (${dev ? 'development' : 'production'})`,
  ),
);
for (const signal of ['SIGINT', 'SIGTERM'] as const)
  process.on(signal, () => {
    server.close(() => {
      store.close();
      void vite?.close().then(() => process.exit());
    });
  });
