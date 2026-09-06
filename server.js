/**
 * FreshCart — Custom HTTP server
 * Wraps Next.js with Socket.IO on the same port.
 * Run with:  node server.js   (dev & production)
 */

require('dotenv').config({ path: '.env.local' });

// Ignore self-signed certificate errors in local development
if (process.env.NODE_ENV !== 'production') {
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = '0';
}

const { createServer } = require('http');
const { parse }        = require('url');
const next             = require('next');
const { Server }       = require('socket.io');

const dev      = process.env.NODE_ENV !== 'production';
const port     = parseInt(process.env.PORT || '3000', 10);
const hostname = '0.0.0.0';

const app    = next({ dev, hostname, port });
const handle = app.getRequestHandler();

function buildAllowedOrigins() {
  const raw = [
    process.env.NEXT_PUBLIC_APP_URL,
    process.env.RAILWAY_PUBLIC_DOMAIN ? `https://${process.env.RAILWAY_PUBLIC_DOMAIN}` : '',
    process.env.RAILWAY_STATIC_URL ? `https://${process.env.RAILWAY_STATIC_URL}` : '',
    `http://localhost:${port}`,
    `http://127.0.0.1:${port}`,
  ].filter(Boolean);

  return new Set(raw.map((v) => String(v).replace(/\/$/, '')));
}

app.prepare().then(() => {
  const httpServer = createServer((req, res) => {
    const parsedUrl = parse(req.url, true);
    handle(req, res, parsedUrl);
  });

  // ── Socket.IO ──────────────────────────────────────────────────────────────
  const allowedOrigins = buildAllowedOrigins();
  const io = new Server(httpServer, {
    path: '/api/socketio',
    cors: {
      origin: (origin, cb) => {
        // Same-origin and non-browser clients may have no Origin header.
        if (!origin) return cb(null, true);
        const clean = String(origin).replace(/\/$/, '');
        if (allowedOrigins.has(clean)) return cb(null, true);
        return cb(new Error(`Socket origin not allowed: ${clean}`));
      },
      methods: ['GET', 'POST'],
      credentials: true,
    },
    transports: ['websocket', 'polling'],
  });

  console.log('[Socket] Allowed origins:', [...allowedOrigins].join(', '));

  // Make io available to Next.js API routes via global
  global._freshcartIO = io;

  io.on('connection', (socket) => {
    console.log(`[Socket] Connected: ${socket.id}`);

    socket.on('join-admin', () => {
      socket.join('admins');
      console.log(`[Socket] Admin joined: ${socket.id}`);
    });

    socket.on('join-customer', (customerId) => {
      socket.join(`customer:${customerId}`);
      console.log(`[Socket] Customer ${customerId} joined`);
    });

    socket.on('disconnect', () => {
      console.log(`[Socket] Disconnected: ${socket.id}`);
    });
  });

  httpServer.listen(port, hostname, () => {
    console.log(`\n  🥦 FreshCart running on http://localhost:${port}`);
    console.log(`  🛒 Customer: http://localhost:${port}/customer`);
    console.log(`  ⚙️  Admin:    http://localhost:${port}/admin`);
    console.log(`  🔑 Admin login shortcut: http://localhost:${port}/login?admin=1\n`);
  });
});
