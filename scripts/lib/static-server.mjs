// Mini-Server wie GitHub Pages für Prüfungen vor dem Deploy: Ordner → index.html, unbekannte Pfade → 404.html
import { createServer } from 'node:http';
import { existsSync, readFileSync, statSync } from 'node:fs';
import { extname, join } from 'node:path';

const TYPES = {
  '.html': 'text/html', '.js': 'text/javascript', '.css': 'text/css', '.json': 'application/json', '.webmanifest': 'application/manifest+json',
  '.svg': 'image/svg+xml', '.webp': 'image/webp', '.png': 'image/png', '.jpg': 'image/jpeg', '.woff2': 'font/woff2', '.ics': 'text/calendar', '.pdf': 'application/pdf',
};

export function serve(dir, port = 0) {
  const server = createServer((req, res) => {
    const path = decodeURIComponent(new URL(req.url, 'http://x').pathname);
    let file = join(dir, path);
    if (existsSync(file) && statSync(file).isDirectory()) file = join(file, 'index.html');
    const found = existsSync(file);
    res.writeHead(found ? 200 : 404, { 'Content-Type': found ? (TYPES[extname(file)] ?? 'application/octet-stream') : 'text/html' });
    res.end(readFileSync(found ? file : join(dir, '404.html')));
  }).listen(port);
  return { base: `http://127.0.0.1:${server.address().port}`, close: () => server.close() };
}
