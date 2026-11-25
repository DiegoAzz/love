const http = require('http');
const https = require('https');
const fs = require('fs');
const path = require('path');
const crypto = require('crypto');
let nodemailer = null;
try {
  nodemailer = require('nodemailer');
} catch (e) {
  console.warn('Nodemailer not loaded yet, fallback to log mode');
}

const PORT = process.env.PORT || 3333;
const PUBLIC_DIR = path.join(__dirname, 'public');
const DATA_DIR = path.join(__dirname, 'data');
const TRIBUTES_FILE = path.join(DATA_DIR, 'tributes.json');
const USERS_FILE = path.join(DATA_DIR, 'users.json');
const SESSIONS_FILE = path.join(DATA_DIR, 'sessions.json');
const TOKENS_FILE = path.join(DATA_DIR, 'magic_tokens.json');

// Ensure data dir and files exist
if (!fs.existsSync(DATA_DIR)) {
  fs.mkdirSync(DATA_DIR, { recursive: true });
}
[TRIBUTES_FILE, USERS_FILE, SESSIONS_FILE, TOKENS_FILE].forEach(file => {
  if (!fs.existsSync(file)) {
    fs.writeFileSync(file, JSON.stringify({}), 'utf8');
  }
});

function readData(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (e) {
    return {};
  }
}

function saveData(file, data) {
  try {
    fs.writeFileSync(file, JSON.stringify(data, null, 2), 'utf8');
  } catch (e) {
    console.error('Error saving data to', file, e.message);
  }
}

// Mailer Setup (Configurable via standard SMTP or Gmail in Coolify)
function getTransporter() {
  if (!nodemailer) return null;
  const host = process.env.SMTP_HOST;
  const user = process.env.SMTP_USER;
  const pass = process.env.SMTP_PASS;

  if (host && user && pass) {
    return nodemailer.createTransport({
      host,
      port: parseInt(process.env.SMTP_PORT || '587', 10),
      secure: process.env.SMTP_PORT === '465',
      auth: { user, pass }
    });
  }
  return null;
}

async function sendMagicLinkEmail(email, magicUrl) {
  const transporter = getTransporter();
  console.log(`\n======================================================`);
  console.log(` [MAGIC LINK DISPATCHED]`);
  console.log(` Para:    ${email}`);
  console.log(` Enlace:  ${magicUrl}`);
  console.log(`======================================================\n`);

  if (!transporter) {
    return { sent: false, reason: 'smtp_not_configured' };
  }

  const mailOptions = {
    from: process.env.SMTP_FROM || `"Love ❤️" <noreply@love.appzplay.online>`,
    to: email,
    subject: `Tu enlace de acceso a Love ❤️`,
    html: `
      <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, Helvetica, Arial, sans-serif; max-width: 560px; margin: 0 auto; background-color: #0c0e14; color: #ffffff; border-radius: 20px; overflow: hidden; border: 1px solid #232738;">
        <div style="background: linear-gradient(135deg, #e11d48, #fb7185); padding: 30px 24px; text-align: center;">
          <h1 style="margin: 0; font-size: 26px; font-weight: 800; letter-spacing: -0.5px;">LOVE ❤️</h1>
          <p style="margin: 6px 0 0; font-size: 14px; opacity: 0.95;">Acceso a tu cuenta y homenajes</p>
        </div>
        <div style="padding: 32px 28px; text-align: center;">
          <h2 style="font-size: 20px; font-weight: 700; margin-top: 0; color: #ffffff;">Tu enlace mágico de acceso</h2>
          <p style="font-size: 14px; color: #94a3b8; line-height: 1.6; margin: 16px 0 28px;">
            Haz clic en el siguiente botón para iniciar sesión de forma segura y acceder a tus mini-sitios y homenajes en Love.
          </p>
          <a href="${magicUrl}" style="display: inline-block; background: linear-gradient(135deg, #e11d48, #f43f5e); color: #ffffff; font-weight: 700; font-size: 15px; padding: 14px 32px; text-decoration: none; border-radius: 12px; box-shadow: 0 10px 25px rgba(225, 29, 72, 0.4);">
            Acceder a Mi Cuenta ➔
          </a>
          <p style="font-size: 12px; color: #64748b; margin-top: 30px; line-height: 1.5;">
            Si el botón no funciona, copia y pega el siguiente enlace en tu navegador:<br/>
            <a href="${magicUrl}" style="color: #f43f5e; word-break: break-all;">${magicUrl}</a>
          </p>
          <hr style="border: none; border-top: 1px solid #1e2230; margin: 24px 0;" />
          <p style="font-size: 11px; color: #475569; margin: 0;">
            Este enlace expira en 15 minutos. Si no solicitaste este acceso, puedes ignorar este mensaje.
          </p>
        </div>
      </div>
    `
  };

  try {
    await transporter.sendMail(mailOptions);
    console.log(`[EMAIL ENVIADO EXITOSAMENTE A ${email}]`);
    return { sent: true };
  } catch (err) {
    console.error(`[ERROR ENVIANDO EMAIL]:`, err.message);
    return { sent: false, error: err.message };
  }
}

// Session Auth Helper
function getAuthenticatedUser(req) {
  const cookieHeader = req.headers.cookie || '';
  const match = cookieHeader.match(/love_session=([a-zA-Z0-9_\-]+)/);
  if (!match) return null;

  const sessionId = match[1];
  const sessions = readData(SESSIONS_FILE);
  const session = sessions[sessionId];

  if (!session) return null;
  if (session.expiresAt && Date.now() > session.expiresAt) {
    delete sessions[sessionId];
    saveData(SESSIONS_FILE, sessions);
    return null;
  }

  const users = readData(USERS_FILE);
  const user = users[session.email] || { email: session.email, name: session.email.split('@')[0] };
  return { ...user, sessionId };
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

const server = http.createServer(async (req, res) => {
  const urlParts = req.url.split('?');
  const reqUrl = urlParts[0];
  const queryStr = urlParts[1] || '';
  const query = new URLSearchParams(queryStr);

  // Helper for origin determination
  const hostHeader = req.headers.host || `localhost:${PORT}`;
  const protocol = req.headers['x-forwarded-proto'] || (hostHeader.includes('localhost') ? 'http' : 'https');
  const baseUrl = `${protocol}://${hostHeader}`;

  // ==========================================
  // 1. API: Network info for mobile testing
  // ==========================================
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

  // ==========================================
  // 2. API: Magic Link Sign-In (Matches Official Better-Auth)
  // ==========================================
  if (req.method === 'POST' && (reqUrl === '/api/auth/sign-in/magic-link' || reqUrl === '/api/auth/login')) {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', async () => {
      try {
        const payload = JSON.parse(body || '{}');
        const email = (payload.email || '').trim().toLowerCase();

        // Validate email
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        if (!email || !emailRegex.test(email)) {
          res.writeHead(400, { 'Content-Type': 'application/json' });
          res.end(JSON.stringify({ status: false, error: 'Correo electrónico inválido' }));
          return;
        }

        // Generate 32-byte secure token
        const token = crypto.randomBytes(32).toString('hex');
        const tokens = readData(TOKENS_FILE);
        tokens[token] = {
          email,
          createdAt: Date.now(),
          expiresAt: Date.now() + 15 * 60 * 1000, // 15 mins
          used: false
        };
        saveData(TOKENS_FILE, tokens);

        const magicUrl = `${baseUrl}/api/auth/verify?token=${token}`;
        const emailResult = await sendMagicLinkEmail(email, magicUrl);

        res.writeHead(200, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({
          status: true,
          email,
          emailSent: emailResult.sent,
          // If SMTP is not yet configured, provide dev link for instant testing
          devMagicLink: !emailResult.sent ? `/api/auth/verify?token=${token}` : undefined
        }));
      } catch (err) {
        res.writeHead(500, { 'Content-Type': 'application/json' });
        res.end(JSON.stringify({ status: false, error: err.message }));
      }
    });
    return;
  }

  // ==========================================
  // 3. API: Magic Link Verification
  // ==========================================
  if (reqUrl === '/api/auth/verify') {
    const token = query.get('token');
    const tokens = readData(TOKENS_FILE);
    const tokenData = tokens[token];

    if (!tokenData || tokenData.used || Date.now() > tokenData.expiresAt) {
      res.writeHead(400, { 'Content-Type': 'text/html; charset=utf-8' });
      res.end(`
        <!DOCTYPE html>
        <html lang="es" class="dark">
        <head><meta charset="utf-8"/><title>Enlace no válido | Love</title>
        <link rel="stylesheet" href="/css/bundle2.css"/></head>
        <body style="background:#08090c; color:#fff; min-height:100vh; display:flex; align-items:center; justify-content:center; font-family:sans-serif; text-align:center; padding:20px;">
          <div style="background:#0f1118; border:1px solid rgba(255,255,255,0.1); border-radius:24px; padding:40px; max-width:440px;">
            <h1 style="color:#f43f5e; font-size:24px; margin-bottom:12px;">Enlace Expirado o Inválido</h1>
            <p style="color:#94a3b8; font-size:14px; margin-bottom:24px;">Este enlace mágico ya fue utilizado o ha expirado. Por favor solicita uno nuevo.</p>
            <a href="/login" style="display:inline-block; background:linear-gradient(135deg, #e11d48, #fb7185); color:#fff; text-decoration:none; padding:12px 24px; border-radius:12px; font-weight:bold;">Volver a Iniciar Sesión</a>
          </div>
        </body></html>
      `);
      return;
    }

    // Mark token as used
    tokenData.used = true;
    saveData(TOKENS_FILE, tokens);

    // Register / update user
    const users = readData(USERS_FILE);
    const email = tokenData.email;
    if (!users[email]) {
      users[email] = {
        email,
        name: email.split('@')[0],
        createdAt: new Date().toISOString()
      };
      saveData(USERS_FILE, users);
    }

    // Create session
    const sessionId = crypto.randomBytes(24).toString('hex');
    const sessions = readData(SESSIONS_FILE);
    sessions[sessionId] = {
      email,
      createdAt: Date.now(),
      expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000 // 30 days
    };
    saveData(SESSIONS_FILE, sessions);

    // Set HTTPOnly cookie & redirect to /dashboard
    res.writeHead(302, {
      'Set-Cookie': [
        `love_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
        `love_user_email=${encodeURIComponent(email)}; Path=/; Max-Age=2592000`
      ],
      'Location': '/dashboard'
    });
    res.end();
    return;
  }

  // ==========================================
  // 4. API: Google OAuth Flow
  // ==========================================
  if (reqUrl === '/api/auth/google' || reqUrl === '/api/auth/sign-in/google') {
    const clientId = process.env.GOOGLE_CLIENT_ID;
    if (!clientId) {
      // If Google Client ID is not configured, inform the user cleanly
      res.writeHead(302, { 'Location': '/login?error=google_not_configured' });
      res.end();
      return;
    }

    const redirectUri = `${baseUrl}/api/auth/callback/google`;
    const googleAuthUrl = `https://accounts.google.com/o/oauth2/v2/auth?` +
      `client_id=${encodeURIComponent(clientId)}&` +
      `redirect_uri=${encodeURIComponent(redirectUri)}&` +
      `response_type=code&` +
      `scope=${encodeURIComponent('openid email profile')}&` +
      `access_type=offline&prompt=consent`;

    res.writeHead(302, { 'Location': googleAuthUrl });
    res.end();
    return;
  }

  // Google OAuth Callback
  if (reqUrl === '/api/auth/callback/google') {
    const code = query.get('code');
    const clientId = process.env.GOOGLE_CLIENT_ID;
    const clientSecret = process.env.GOOGLE_CLIENT_SECRET;
    const redirectUri = `${baseUrl}/api/auth/callback/google`;

    if (!code || !clientId || !clientSecret) {
      res.writeHead(302, { 'Location': '/login?error=google_failed' });
      res.end();
      return;
    }

    // Exchange code for token
    try {
      const tokenPostData = new URLSearchParams({
        code,
        client_id: clientId,
        client_secret: clientSecret,
        redirect_uri: redirectUri,
        grant_type: 'authorization_code'
      }).toString();

      const tokenReq = https.request('https://oauth2.googleapis.com/token', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'Content-Length': Buffer.byteLength(tokenPostData)
        }
      }, (tokenRes) => {
        let tokenBody = '';
        tokenRes.on('data', c => tokenBody += c);
        tokenRes.on('end', () => {
          try {
            const tokenJson = JSON.parse(tokenBody);
            const accessToken = tokenJson.access_token;

            if (!accessToken) {
              res.writeHead(302, { 'Location': '/login?error=token_failed' });
              res.end();
              return;
            }

            // Fetch user profile
            https.get('https://www.googleapis.com/oauth2/v2/userinfo', {
              headers: { Authorization: `Bearer ${accessToken}` }
            }, (userRes) => {
              let userBody = '';
              userRes.on('data', c => userBody += c);
              userRes.on('end', () => {
                try {
                  const googleUser = JSON.parse(userBody);
                  const email = (googleUser.email || '').toLowerCase();
                  if (!email) throw new Error('No email from Google');

                  // Register / update user
                  const users = readData(USERS_FILE);
                  users[email] = {
                    email,
                    name: googleUser.name || googleUser.given_name || email.split('@')[0],
                    avatar: googleUser.picture,
                    googleId: googleUser.id,
                    provider: 'google',
                    updatedAt: new Date().toISOString()
                  };
                  saveData(USERS_FILE, users);

                  // Create session
                  const sessionId = crypto.randomBytes(24).toString('hex');
                  const sessions = readData(SESSIONS_FILE);
                  sessions[sessionId] = {
                    email,
                    createdAt: Date.now(),
                    expiresAt: Date.now() + 30 * 24 * 60 * 60 * 1000
                  };
                  saveData(SESSIONS_FILE, sessions);

                  res.writeHead(302, {
                    'Set-Cookie': [
                      `love_session=${sessionId}; Path=/; HttpOnly; SameSite=Lax; Max-Age=2592000`,
                      `love_user_email=${encodeURIComponent(email)}; Path=/; Max-Age=2592000`
                    ],
                    'Location': '/dashboard'
                  });
                  res.end();
                } catch (e) {
                  res.writeHead(302, { 'Location': '/login?error=profile_failed' });
                  res.end();
                }
              });
            });
          } catch (e) {
            res.writeHead(302, { 'Location': '/login?error=auth_error' });
            res.end();
          }
        });
      });

      tokenReq.write(tokenPostData);
      tokenReq.end();
    } catch (e) {
      res.writeHead(302, { 'Location': '/login?error=oauth_error' });
      res.end();
    }
    return;
  }

  // ==========================================
  // 5. API: Current Auth User Session (/api/auth/me)
  // ==========================================
  if (reqUrl === '/api/auth/me') {
    const user = getAuthenticatedUser(req);
    if (user) {
      res.writeHead(200, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: true, user }));
    } else {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'No authenticated session' }));
    }
    return;
  }

  // ==========================================
  // 6. API: Logout (/api/auth/logout)
  // ==========================================
  if (req.method === 'POST' && reqUrl === '/api/auth/logout') {
    const cookieHeader = req.headers.cookie || '';
    const match = cookieHeader.match(/love_session=([a-zA-Z0-9_\-]+)/);
    if (match) {
      const sessionId = match[1];
      const sessions = readData(SESSIONS_FILE);
      delete sessions[sessionId];
      saveData(SESSIONS_FILE, sessions);
    }
    res.writeHead(200, {
      'Set-Cookie': [
        'love_session=; Path=/; HttpOnly; Max-Age=0',
        'love_user_email=; Path=/; Max-Age=0'
      ],
      'Content-Type': 'application/json'
    });
    res.end(JSON.stringify({ ok: true }));
    return;
  }

  // ==========================================
  // 7. API: User-Isolated Tributes (/api/user/tributes)
  // ONLY returns tributes belonging to the logged-in user!
  // ==========================================
  if (req.method === 'GET' && reqUrl === '/api/user/tributes') {
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.writeHead(401, { 'Content-Type': 'application/json' });
      res.end(JSON.stringify({ ok: false, error: 'Debes iniciar sesión para ver tus homenajes' }));
      return;
    }

    const allTributes = readData(TRIBUTES_FILE);
    const userEmail = (user.email || '').toLowerCase();

    // Filter ONLY tributes belonging to this specific user email
    const userTributes = Object.values(allTributes).filter(t => {
      const tEmail = (t.userEmail || '').toLowerCase();
      return tEmail === userEmail;
    });

    res.writeHead(200, { 'Content-Type': 'application/json' });
    res.end(JSON.stringify({
      ok: true,
      user: { email: user.email, name: user.name, avatar: user.avatar },
      tributes: userTributes
    }));
    return;
  }

  // ==========================================
  // 8. API: Tributes Store (/api/tributes)
  // ==========================================
  if (req.method === 'POST' && reqUrl === '/api/tributes') {
    let body = '';
    req.on('data', chunk => body += chunk);
    req.on('end', () => {
      try {
        const payload = JSON.parse(body);
        const id = payload.id || 'homenaje-' + Date.now();
        payload.id = id;
        payload.createdAt = new Date().toISOString();

        // Bind tribute to authenticated user if session exists
        const authUser = getAuthenticatedUser(req);
        if (authUser && authUser.email) {
          payload.userEmail = authUser.email;
        }

        const all = readData(TRIBUTES_FILE);
        all[id] = payload;
        saveData(TRIBUTES_FILE, all);

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
    const all = readData(TRIBUTES_FILE);
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
    // If not authenticated, redirect to /login
    const user = getAuthenticatedUser(req);
    if (!user) {
      res.writeHead(302, { 'Location': '/login' });
      res.end();
      return;
    }

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
  let finalReqUrl = reqUrl;
  if (finalReqUrl === '/' || finalReqUrl === '/es' || finalReqUrl === '/pt-br' || finalReqUrl === '/en') {
    finalReqUrl = '/index.html';
  }

  let filePath = path.join(PUBLIC_DIR, finalReqUrl);

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
