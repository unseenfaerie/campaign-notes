// server.js - Express API server for campaign-notes
const express = require('express');
const path = require('path');
const db = require('./db');

const app = express();
app.use(express.json());

const charactersRouter = require('./routes/characters');
app.use('/api/characters', charactersRouter);
const itemsRouter = require('./routes/items');
app.use('/api/items', itemsRouter);
const organizationsRouter = require('./routes/organizations');
app.use('/api/organizations', organizationsRouter);
const deitiesRouter = require('./routes/deities');
app.use('/api/deities', deitiesRouter);
const eventsRouter = require('./routes/events');
app.use('/api/events', eventsRouter);

//main index route
app.get('/', (req, res) => {
    res.render('index', { title: 'Campaign Notes' });
});

app.set('view engine', 'ejs');
app.set('views', path.join(__dirname, '../views'));

app.use(express.static(path.join(__dirname, '../public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});
