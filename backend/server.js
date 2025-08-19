// server.js - Express API server for campaign-notes
const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
app.use(express.json());

const charactersRouter = require('./routes/characters');
app.use('/api/characters', charactersRouter);

// Serve static files from the public directory (for legacy/static site)
app.use(express.static(path.join(__dirname, '../public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});
