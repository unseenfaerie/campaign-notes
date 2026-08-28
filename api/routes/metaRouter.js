const express = require('express');
const { domainManifest } = require('../../common/domainManifest');
const { buildEntityFormSchemas, buildRelationFormSchemas } = require('../utils/manifestHelpers');

const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        ...buildEntityFormSchemas(),
        relationsByEntityRoute: buildRelationFormSchemas(domainManifest),
    });
});

module.exports = router;
