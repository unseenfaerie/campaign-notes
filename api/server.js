require('dotenv').config();

const express = require('express');
const cors = require('cors');
const helmet = require('helmet');
const cookieParser = require('cookie-parser');
const dataRouter = require('./routes/dataRouter');
const domainRouter = require('./routes/domainRouter');
const authRouter = require('./routes/authRouter');
const adminRouter = require('./routes/adminRouter');
const metaRouter = require('./routes/metaRouter');
const mentionsRouter = require('./routes/mentionsRouter');
const { requireAuth, requireRole } = require('./middleware/authMiddleware');
const { db, initializeDatabase } = require('./data/db');
const config = require('./config');
const { createRateLimitMiddleware } = require('./middleware/rateLimitMiddleware');

const app = express();

app.set('trust proxy', config.trustProxy);

app.use(helmet({
  hsts: config.nodeEnv === 'production' ? undefined : false,
}));

app.use((req, res, next) => {
  if (
    config.forceHttps &&
    config.nodeEnv === 'production' &&
    req.protocol !== 'https'
  ) {
    return res.redirect(301, `https://${req.get('host')}${req.originalUrl}`);
  }

  return next();
});

app.use(cors({
  origin: config.corsOrigins,
  credentials: true,
  methods: ['GET', 'POST', 'PATCH', 'DELETE', 'OPTIONS'],
  allowedHeaders: ['Content-Type', 'Authorization'],
  maxAge: 86400,
}));
app.use(express.json({ limit: config.requestBodyLimit }));
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth/token', createRateLimitMiddleware({
  windowMs: config.authRateLimitWindowMs,
  maxRequests: config.authRateLimitMaxRequests,
  keyPrefix: 'auth',
}));
app.use('/api', createRateLimitMiddleware({
  windowMs: config.apiRateLimitWindowMs,
  maxRequests: config.apiRateLimitMaxRequests,
  keyPrefix: 'api',
}));

app.use('/api/auth', authRouter);
app.use('/api/admin', requireAuth, adminRouter);
app.use('/api/data', requireAuth, requireRole(['dm']), dataRouter);
app.use('/api/meta', requireAuth, metaRouter);
app.use('/api/mentions', requireAuth, mentionsRouter);
app.use('/api', requireAuth, domainRouter);

app.use((err, req, res, next) => {
  if (err && err.type === 'entity.too.large') {
    return res.status(413).json({ error: 'Request body is too large' });
  }

  console.error(err);
  return res.status(500).json({ error: 'Unexpected server error' });
});

async function startServer(port = config.port) {
  await initializeDatabase();

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Manifest API server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

function closeDatabase() {
  return new Promise((resolve, reject) => {
    db.close((error) => (error ? reject(error) : resolve()));
  });
}

async function shutdownServer(server, { timeoutMs = config.shutdownTimeoutMs, closeDatabaseFn = closeDatabase } = {}) {
  if (!server) {
    await closeDatabaseFn();
    return;
  }

  await new Promise((resolve, reject) => {
    let settled = false;
    const timer = setTimeout(() => {
      if (settled) return;
      settled = true;
      reject(new Error('Timed out while waiting for HTTP connections to close'));
    }, timeoutMs);

    server.close((error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      if (error && error.code !== 'ERR_SERVER_NOT_RUNNING') reject(error);
      else resolve();
    });
  });

  await closeDatabaseFn();
}

if (require.main === module) {
  let server;
  const handleShutdown = (signal) => {
    shutdownServer(server)
      .then(() => process.exit(0))
      .catch((err) => {
        console.error(`Failed to shut down after ${signal}:`, err.message);
        process.exit(1);
      });
  };

  process.once('SIGTERM', () => handleShutdown('SIGTERM'));
  process.once('SIGINT', () => handleShutdown('SIGINT'));

  startServer()
    .then((startedServer) => {
      server = startedServer;
    })
    .catch((err) => {
      console.error('Failed to start server:', err.message);
      process.exitCode = 1;
    });
}

module.exports = {
  app,
  startServer,
  shutdownServer,
};