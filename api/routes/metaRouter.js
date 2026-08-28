const express = require('express');
const { domainManifest } = require('../../common/domainManifest');
const { buildEntityFormSchemas, buildRelationFormSchemas } = require('../utils/manifestHelpers');
const { DAYS_PER_YEAR, ERAS, CALENDARS } = require('../../common/dateSystem');

const router = express.Router();

router.get('/', (req, res) => {
    res.json({
        ...buildEntityFormSchemas(),
        relationsByEntityRoute: buildRelationFormSchemas(domainManifest),
        dateSystem: {
            daysPerYear: DAYS_PER_YEAR,
            eras: ERAS,
            calendars: Object.values(CALENDARS),
        },
    });
});

module.exports = router;
