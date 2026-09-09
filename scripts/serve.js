const http = require('http');
const fs = require('fs');
const path = require('path');
const { build } = require('./build');

const rootDir = path.resolve(__dirname, '..');
const siteDir = path.join(rootDir, '_site');
const PORT = process.env.PORT || 3000;

const mimeTypes = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'application/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.woff': 'font/woff',
  '.woff2': 'font/woff2'
};

async function startServer() {
  await build();

  const server = http.createServer((req, res) => {
    let reqUrl = req.url.split('?')[0];
    if (reqUrl === '/') reqUrl = '/index.html';

    // Check _site first, then root (for assets)
    let filePath = path.join(siteDir, reqUrl);
    if (!fs.existsSync(filePath)) {
      filePath = path.join(rootDir, reqUrl);
    }

    if (!fs.existsSync(filePath) || fs.statSync(filePath).isDirectory()) {
      res.writeHead(404, { 'Content-Type': 'text/plain' });
      res.end('404 Not Found');
      return;
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = mimeTypes[ext] || 'application/octet-stream';

    fs.readFile(filePath, (err, data) => {
      if (err) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
      } else {
        res.writeHead(200, { 'Content-Type': contentType });
        res.end(data);
      }
    });
  });

  server.listen(PORT, () => {
    console.log(`\n🚀 Portfolio dev server running at: http://localhost:${PORT}`);
    console.log(`Watching _data/, _includes/, _layouts/, and assets/ for changes...\n`);
  });

  // Watch directories for auto-rebuild
  const watchDirs = ['_data', '_includes', '_layouts', 'assets'];
  watchDirs.forEach(dir => {
    const fullPath = path.join(rootDir, dir);
    if (fs.existsSync(fullPath)) {
      fs.watch(fullPath, { recursive: true }, async (eventType, filename) => {
        if (filename) {
          console.log(`[Changed] ${dir}/${filename} -> Rebuilding...`);
          try {
            await build();
          } catch (err) {
            console.error('Rebuild failed:', err.message);
          }
        }
      });
    }
  });

  fs.watch(path.join(rootDir, 'index.html'), async () => {
    console.log(`[Changed] index.html -> Rebuilding...`);
    try {
      await build();
    } catch (err) {
      console.error('Rebuild failed:', err.message);
    }
  });
}

startServer().catch(console.error);
