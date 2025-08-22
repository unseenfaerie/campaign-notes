// server.js - Express API server for campaign-notes
const express = require('express');
const path = require('path');
const cors = require('cors');
const db = require('./db');

const app = express();
app.use(express.json());
app.use(cors());

const charactersRouter = require('./routes/characters/index');
app.use('/api/characters', charactersRouter);
const itemsRouter = require('./routes/items');
app.use('/api/items', itemsRouter);
const organizationsRouter = require('./routes/organizations');
app.use('/api/organizations', organizationsRouter);
const deitiesRouter = require('./routes/deities');
app.use('/api/deities', deitiesRouter);
const eventsRouter = require('./routes/events');
app.use('/api/events', eventsRouter);
const placesRouter = require('./routes/places');
app.use('/api/places', placesRouter)

//main index route
app.get('/', (req, res) => {
    res.render('index', { title: 'Campaign Notes' });
});


app.use(express.static(path.join(__dirname, '../public')));

const PORT = process.env.PORT || 3000;
app.listen(PORT, () => {
    console.log(`API server running at http://localhost:${PORT}`);
});
