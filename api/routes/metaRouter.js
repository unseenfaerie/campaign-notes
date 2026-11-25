const express = require('express');
const { domainManifest } = require('../../common/domainManifest');
const { buildEntityFormSchemas, buildRelationFormSchemas } = require('../utils/manifestHelpers');
const { DAYS_PER_YEAR, ERAS, CALENDARS } = require('../../common/dateSystem');

const router = express.Router();

router.get('/', (req, res) => {
    const entities = buildEntityFormSchemas().entities;
    const relationsByEntityRoute = buildRelationFormSchemas(domainManifest);
    if (!req.auth || req.auth.role !== 'dm') {
        for (const entity of entities) {
            entity.fields = entity.fields.filter((field) => !field.dmOnly);
        }
        for (const relations of Object.values(relationsByEntityRoute)) {
            for (const relation of relations) {
                relation.fields = relation.fields.filter((field) => !field.dmOnly);
            }
        }
    }

    res.json({
        entities,
        relationsByEntityRoute,
        dateSystem: {
            daysPerYear: DAYS_PER_YEAR,
            eras: ERAS,
            calendars: Object.values(CALENDARS),
        },
    });
});

module.exports = router;
