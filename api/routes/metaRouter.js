const express = require('express');
const { buildEntityFormSchemas } = require('../utils/manifestHelpers');

const router = express.Router();

router.get('/', (req, res) => {
    res.json(buildEntityFormSchemas());
});

module.exports = router;
