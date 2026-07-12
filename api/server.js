require('dotenv').config();
const http     = require('http');
const express  = require('express');
const mongoose = require('mongoose');
const cors     = require('cors');
const { initSocket } = require('./socketHub');
const { requireAuth } = require('./middleware/auth');

const app = express();

// ═══════════════════════════
// Middleware
// ═══════════════════════════
app.use(cors());
app.use(express.json({ limit: '1mb' }));

// ═══════════════════════════
// Routes
// ═══════════════════════════
app.use('/api/auth',       require('./routes/auth.routes'));
app.get('/api/health', (req, res) => {
  res.status(200).json({ status: 'OK', time: new Date().toISOString() });
});

app.use('/api', requireAuth);
app.use('/api', require('./middleware/readOnlyRoleGuard'));
app.use('/api/employees',  require('./routes/employee.routes'));
app.use('/api/attendance', require('./routes/attendance.routes'));
app.use('/api/payroll',    require('./routes/payroll.routes'));
app.use('/api/objects',    require('./routes/object.routes'));
app.use('/api/logs',       require('./routes/log.routes'));
app.use('/api/fines',      require('./routes/fine.routes'));
app.use('/api/warehouse',  require('./routes/Warehouse.routes'));
app.use('/api/suppliers',  require('./routes/supplier.routes'));
app.use('/api/bonuses',        require('./routes/bonuses'));
app.use('/api/notifications',  require('./routes/notification.routes'));
app.use('/api/support-chat',   require('./routes/supportChat.routes'));

// ═══════════════════════════
// Not found handlers
// ═══════════════════════════
app.use('/api/*', (req, res) => {
  res.status(404).json({
    success: false,
    message: `API route topilmadi: ${req.originalUrl}`,
  });
});

app.use((req, res, next) => {
  if (req.method !== 'GET') return next();
  res.status(404).type('html').send(`<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width,initial-scale=1" />
    <title>404 | DOST ELECTRIC API</title>
    <style>
      :root { color-scheme: dark; }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        min-height: 100vh;
        overflow: hidden;
        background: radial-gradient(circle at 50% 35%, #0f1e33 0%, #020617 55%, #01030a 100%);
        font-family: Inter, system-ui, -apple-system, Segoe UI, Roboto, Helvetica, Arial, sans-serif;
      }
      .stars {
        position: fixed;
        inset: -30vh -30vw;
        background-image:
          radial-gradient(1px 8px at 20% 20%, rgba(148, 163, 184, 0.55), rgba(148, 163, 184, 0)),
          radial-gradient(1px 9px at 40% 70%, rgba(148, 163, 184, 0.45), rgba(148, 163, 184, 0)),
          radial-gradient(1px 7px at 70% 35%, rgba(148, 163, 184, 0.5), rgba(148, 163, 184, 0)),
          radial-gradient(1px 8px at 85% 60%, rgba(148, 163, 184, 0.38), rgba(148, 163, 184, 0));
        background-size: 320px 320px, 360px 360px, 420px 420px, 520px 520px;
        transform: rotate(12deg);
        animation: drift 22s linear infinite;
        opacity: 0.55;
      }
      @keyframes drift {
        from { transform: rotate(12deg) translateY(0); }
        to { transform: rotate(12deg) translateY(160px); }
      }
      .center {
        min-height: 100vh;
        display: grid;
        place-items: center;
        position: relative;
      }
      .code {
        margin: 0;
        color: #f8fafc;
        text-shadow: 0 0 24px rgba(248, 250, 252, 0.22);
        font-size: clamp(72px, 15vw, 160px);
        line-height: 1;
        font-weight: 900;
        letter-spacing: -0.04em;
        user-select: none;
      }
    </style>
  </head>
  <body>
    <div class="stars"></div>
    <main class="center">
      <h1 class="code">404</h1>
    </main>
  </body>
</html>`);
});

// ═══════════════════════════
// Error handler
// ═══════════════════════════
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).json({ success: false, message: err.message || 'Server Error' });
});

// ═══════════════════════════
// ENV
// ═══════════════════════════
const PORT     = process.env.PORT || 5000;
const MONGO_URI= process.env.MONGO_URI;
const JWT_SECRET = process.env.JWT_SECRET;

if (!MONGO_URI) {
  console.error('MONGO_URI topilmadi — .env faylni tekshiring!');
  process.exit(1);
}
if (!JWT_SECRET || String(JWT_SECRET).trim().length < 16) {
  console.error('JWT_SECRET topilmadi yoki juda qisqa (kamida 16 belgi bo‘lsin)');
  process.exit(1);
}

const server = http.createServer(app);

// ═══════════════════════════
// MongoDB + Server start
// ═══════════════════════════
mongoose.connect(MONGO_URI)
  .then(() => {
    console.log('✅ MongoDB ulandi');
    initSocket(server);
    server.listen(PORT, '0.0.0.0', () => {
      console.log(`🚀 Server ${PORT} portda ishlayapti (Socket.io yoqilgan)`);
    });
  })
  .catch(err => {
    console.error('MongoDB ulanish xatosi:', err);
    process.exit(1);
  });

// ═══════════════════════════
// Crash protection
// ═══════════════════════════
process.on('unhandledRejection', err => console.error('Unhandled Rejection:', err));
process.on('uncaughtException',  err => console.error('Uncaught Exception:',  err));
