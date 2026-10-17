import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';
import { resolve, sep, extname } from 'node:path';
const root = fileURLToPath(new URL('../math-class-hub/public/pdf-counter/', import.meta.url));
const types = { '.html': 'text/html; charset=utf-8', '.mjs': 'text/javascript; charset=utf-8', '.css': 'text/css; charset=utf-8', '.bcmap': 'application/octet-stream', '.wasm': 'application/wasm', '.pfb': 'application/octet-stream', '.ttf': 'font/ttf' };
export const server = http.createServer(async (req, res) => {
  res.setHeader('X-Content-Type-Options', 'nosniff');
  res.setHeader('Referrer-Policy', 'no-referrer');
  res.setHeader('Cache-Control', 'no-store');
  res.setHeader('Cross-Origin-Resource-Policy', 'same-origin');
  res.setHeader('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');
  res.setHeader('Content-Security-Policy', "default-src 'none'; script-src 'self'; worker-src 'self'; style-src 'self'; connect-src 'self'; img-src 'self'; object-src 'none'; base-uri 'none'; form-action 'none'; frame-ancestors 'none'");
  if (!['GET', 'HEAD'].includes(req.method)) { res.writeHead(405); res.end(); return; }
  try {
    let pathname = decodeURIComponent(new URL(req.url, 'http://127.0.0.1').pathname);
    if (pathname.startsWith('/pdf-counter/')) pathname = pathname.slice('/pdf-counter'.length);
    if (pathname === '/') pathname = '/index.html';
    const path = resolve(root, '.' + pathname);
    if (!path.startsWith(root.endsWith(sep) ? root : root + sep)) { res.writeHead(403); res.end(); return; }
    if (!types[extname(path)] && !path.endsWith(sep + 'LICENSE')) { res.writeHead(404); res.end(); return; }
    const data = await readFile(path);
    res.setHeader('Content-Type', types[extname(path)] || 'text/plain; charset=utf-8');
    res.writeHead(200); res.end(req.method === 'HEAD' ? undefined : data);
  } catch { res.writeHead(404); res.end(); }
});
if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  server.listen(4174, '127.0.0.1', () => console.log('PDF 글자 수: http://127.0.0.1:4174/pdf-counter/'));
}
