const http = require('http');
const fs = require('fs');
const path = require('path');

const PORT = process.env.PORT || 3333;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const TRIBUTES_FILE = path.join(DATA_DIR, 'tributes.json');

// Ensure data dir exists
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
if (!fs.existsSync(TRIBUTES_FILE)) {
  fs.writeFileSync(TRIBUTES_FILE, JSON.stringify({}), 'utf8');
}

const MIME_TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
  '.gif': 'image/gif',
  '.svg': 'image/svg+xml',
  '.ico': 'image/x-icon',
  '.mp3': 'audio/mpeg',
  '.wav': 'audio/wav',
  '.ogg': 'audio/ogg',
  '.m4a': 'audio/mp4',
  '.mp4': 'video/mp4',
  '.webm': 'video/webm',
  '.woff2': 'font/woff2',
  '.woff': 'font/woff',
  '.ttf': 'font/ttf'
};

function readTributes() {
  try {
    return JSON.parse(fs.readFileSync(TRIBUTES_FILE, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveTributes(data) {
  fs.writeFileSync(TRIBUTES_FILE, JSON.stringify(data, null, 2), 'utf8');
}

const server = http.createServer((req, res) => {
  const urlParts = req.url.split('?');
  let reqUrl = urlParts[0];

  // API Endpoints
  if (reqUrl === '/api/network-info') {
    const os = require('os');
    const interfaces = os.networkInterfaces();
    let lanIp = '192.168.1.124';
    for (const name of Object.keys(interfaces)) {
      for (const iface of interfaces[name]) {
        if (iface.family === 'IPv4' && !iface.internal) {
          if (!iface.address.startsWith('169.') && !iface.address.startsWith('192.168.56.')) {
            lanIp = iface.address;
            break;
          }
        }
      }
    }
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({ ok: true, ip: lanIp, port: PORT }));
    return;
  }

  if (req.method === 'POST' && reqUrl === '/api/tributes') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const id = payload.id || 'homenaje-' + Date.now();
        payload.id = id;
        payload.createdAt = new Date().toISOString();

        const all = readTributes();
        all[id] = payload;
        saveTributes(all);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: true, id, tribute: payload }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  if (req.method === 'GET' && reqUrl.startsWith('/api/tributes/')) {
    const id = reqUrl.replace('/api/tributes/', '');
    const all = readTributes();
    const item = all[id];
    if (item) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, tribute: item }));
    } else {
      res.writeHead(404, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Not found' }));
    }
    return;
  }

  if (req.method === 'GET' && reqUrl === '/api/tributes') {
    const all = readTributes();
    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify(all));
    return;
  }

  // Auth endpoints (Google instant login & Email OTP)
  if (req.method === 'POST' && reqUrl === '/api/auth/login') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body || '{}');
        const email = (payload.email || '').trim().toLowerCase();
        const provider = payload.provider || 'email';

        // "si es con gmail entra enseguida"
        if (provider === 'google' || email.endsWith('@gmail.com') || email.endsWith('@googlemail.com')) {
          const user = {
            email: email || 'usuario.love@gmail.com',
            name: (email || 'Diego').split('@')[0],
            provider: 'google',
            loggedInAt: new Date().toISOString()
          };
          res.writeHead(200, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ ok: true, instant: true, user }));
          return;
        }

        // "pero si no manda un codigo, quiero hacerlo igual"
        const code = Math.floor(100000 + Math.random() * 900000).toString();
        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          ok: true,
          instant: false,
          email,
          code,
          message: 'Código de verificación generado'
        }));
      } catch (err) {
        res.writeHead(400, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ ok: false, error: err.message }));
      }
    });
    return;
  }

  // Standalone Tribute Page Route: /tribute/:id
  if (reqUrl.startsWith('/tribute/')) {
    const filePath = path.join(PUBLIC_DIR, 'tribute.html');
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Tribute viewer template not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    });
    return;
  }

  // Auth Pages Routing
  if (reqUrl === '/login' || reqUrl === '/es/login' || reqUrl === '/pt-br/login' || reqUrl === '/en/login') {
    const filePath = path.join(PUBLIC_DIR, 'login.html');
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Login page not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    });
    return;
  }

  // Dashboard Page Routing
  if (reqUrl === '/dashboard' || reqUrl === '/mis-sitios' || reqUrl === '/es/dashboard' || reqUrl === '/panel') {
    const filePath = path.join(PUBLIC_DIR, 'dashboard.html');
    fs.readFile(filePath, (err, content) => {
      if (err) {
        res.writeHead(404, { 'Content-Type': 'text/plain' });
        res.end('Dashboard page not found');
        return;
      }
      res.writeHead(200, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(content);
    });
    return;
  }

  // Static routing
  if (reqUrl === '/' || reqUrl === '/es' || reqUrl === '/pt-br' || reqUrl === '/en') {
    reqUrl = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, reqUrl);

  // Prevent path traversal
  if (!filePath.startsWith(PUBLIC_DIR)) {
    res.writeHead(403, { 'Content-Type': 'text/plain' });
    res.end('403 Forbidden');
    return;
  }

  fs.stat(filePath, (err, stats) => {
    if (err || !stats.isFile()) {
      filePath = path.join(PUBLIC_DIR, 'index.html');
    }

    const ext = path.extname(filePath).toLowerCase();
    const contentType = MIME_TYPES[ext] || 'application/octet-stream';

    // Video streaming support (Range headers)
    if (ext === '.mp4' || ext === '.webm') {
      const range = req.headers.range;
      if (range) {
        fs.stat(filePath, (err, stats) => {
          if (err) {
            res.writeHead(404);
            res.end();
            return;
          }
          const total = stats.size;
          const parts = range.replace(/bytes=/, '').split('-');
          const partialStart = parts[0];
          const partialEnd = parts[1];
          const start = parseInt(partialStart, 10);
          const end = partialEnd ? parseInt(partialEnd, 10) : total - 1;
          const chunkSize = (end - start) + 1;

          const fileStream = fs.createReadStream(filePath, { start, end });
          res.writeHead(206, {
            'Content-Range': `bytes ${start}-${end}/${total}`,
            'Accept-Ranges': 'bytes',
            'Content-Length': chunkSize,
            'Content-Type': contentType
          });
          fileStream.pipe(res);
        });
        return;
      }
    }

    fs.readFile(filePath, (readErr, content) => {
      if (readErr) {
        res.writeHead(500, { 'Content-Type': 'text/plain' });
        res.end('500 Internal Server Error');
        return;
      }
      res.writeHead(200, {
        'Content-Type': contentType,
        'Cache-Control': 'public, max-age=3600'
      });
      res.end(content);
    });
  });
});

server.listen(PORT, '0.0.0.0', () => {
  console.log(`\n======================================================`);
  console.log(` Love ❤️ (love.appzplay.online) está activo!`);
  console.log(` URL Local:  http://localhost:${PORT}`);
  console.log(` Producción: https://love.appzplay.online`);
  console.log(`======================================================\n`);
});
