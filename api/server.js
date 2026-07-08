require('dotenv').config();

const express = require('express');
const cors = require('cors');
const cookieParser = require('cookie-parser');
const dataRouter = require('./routes/dataRouter');
const domainRouter = require('./routes/domainRouter');
const authRouter = require('./routes/authRouter');
const adminRouter = require('./routes/adminRouter');
const { requireAuth, requireRole } = require('./middleware/authMiddleware');
const { initializeDatabase } = require('./data/db');

const app = express();

app.use(cors());
app.use(express.json());
app.use(cookieParser());

app.get('/health', (req, res) => {
  res.json({ ok: true });
});

app.use('/api/auth', authRouter);
app.use('/api/admin', requireAuth, adminRouter);
app.use('/api/data', requireAuth, requireRole(['dm']), dataRouter);
app.use('/api', requireAuth, domainRouter);

app.use((err, req, res, next) => {
  console.error(err);
  res.status(500).json({ error: 'Unexpected server error' });
});

async function startServer(port = process.env.PORT || 3001) {
  await initializeDatabase();

  return new Promise((resolve) => {
    const server = app.listen(port, () => {
      console.log(`Manifest API server running at http://localhost:${port}`);
      resolve(server);
    });
  });
}

if (require.main === module) {
  startServer().catch((err) => {
    console.error('Failed to start server:', err.message);
    process.exitCode = 1;
  });
}

module.exports = {
  app,
  startServer,
};