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

const eventsRouter = require('./routes/events/index');
app.use('/api/events', eventsRouter);

const itemsRouter = require('./routes/items/index');
app.use('/api/items', itemsRouter);

const organizationsRouter = require('./routes/organizations/index');
app.use('/api/organizations', organizationsRouter);

const deitiesRouter = require('./routes/deities/index');
app.use('/api/deities', deitiesRouter);

const placesRouter = require('./routes/places/index');
app.use('/api/places', placesRouter);

const spellsRouter = require('./routes/spells/index');
app.use('/api/spells', spellsRouter);

const spheresRouter = require('./routes/spheres/index');
app.use('/api/spheres', spheresRouter);

//main index route
app.get('/', (req, res) => {
    res.render('index', { title: 'Campaign Notes' });
});


app.use(express.static(path.join(__dirname, '../public')));


if (require.main === module) {
    const PORT = process.env.PORT || 3000;
    app.listen(PORT, () => {
        console.log(`API server running at http://localhost:${PORT}`);
    });
}

module.exports = app;
