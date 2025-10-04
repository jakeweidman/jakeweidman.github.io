// Simple static server for Hello World app
// Requires Node 18+ (WHATWG fetch, fs/promises preinstalled)

import http from 'node:http';
import { readFile } from 'node:fs/promises';
import { extname, join, normalize } from 'node:path';
import { fileURLToPath } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = normalize(join(__filename, '..'));

const PORT = process.env.PORT ? Number(process.env.PORT) : 3000;
const PUBLIC_DIR = join(__dirname, 'public');

const mimeTypes = {
  '.html': 'text/html; charset=UTF-8',
  '.css': 'text/css; charset=UTF-8',
  '.js': 'text/javascript; charset=UTF-8',
  '.json': 'application/json; charset=UTF-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.ico': 'image/x-icon',
  '.txt': 'text/plain; charset=UTF-8'
};

function safeJoin(baseDir, requestedPath) {
  const normalizedPath = normalize('/' + requestedPath).replace(/^\/+/,'/');
  const fsPath = normalize(join(baseDir, '.' + normalizedPath));
  if (!fsPath.startsWith(baseDir)) {
    return join(baseDir, 'index.html');
  }
  return fsPath;
}

const server = http.createServer(async (req, res) => {
  const url = new URL(req.url || '/', `http://${req.headers.host}`);
  let pathname = url.pathname;
  if (pathname === '/') pathname = '/index.html';

  const filePath = safeJoin(PUBLIC_DIR, pathname);
  const ext = extname(filePath).toLowerCase();
  const mime = mimeTypes[ext] || 'application/octet-stream';

  try {
    const data = await readFile(filePath);
    res.writeHead(200, { 'Content-Type': mime });
    res.end(data);
  } catch (err) {
    if (ext !== '.html') {
      // fallback to index.html for SPA-like behavior
      try {
        const data = await readFile(join(PUBLIC_DIR, 'index.html'));
        res.writeHead(200, { 'Content-Type': mimeTypes['.html'] });
        res.end(data);
        return;
      } catch {}
    }
    const message = 'Not Found';
    res.writeHead(404, { 'Content-Type': 'text/plain; charset=UTF-8' });
    res.end(message);
  }
});

server.listen(PORT, () => {
  const address = server.address();
  const effectivePort = typeof address === 'object' && address ? address.port : PORT;
  console.log(`Server listening on http://localhost:${effectivePort}`);
});
