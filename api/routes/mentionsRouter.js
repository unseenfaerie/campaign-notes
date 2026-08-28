const express = require('express');
const { domainManifest } = require('../../common/domainManifest');
const { manifestCrudService } = require('../data/genericCrudService');

const router = express.Router();

function entityTypeForName(entityName) {
    return entityName.toLowerCase();
}

function buildMentionTargets(entities, aliases) {
    const targetsByKey = new Map();

    for (const [entityName, entityDef] of Object.entries(domainManifest.entities)) {
        if (entityName === 'Alias') {
            continue;
        }

        const rows = entities[entityName] || [];
        for (const entity of rows) {
            if (entity.id === undefined || entity.id === null || typeof entity.name !== 'string' || !entity.name.trim()) {
                continue;
            }

            const key = `${entityDef.route}:${String(entity.id)}`;
            targetsByKey.set(key, {
                route: entityDef.route,
                id: String(entity.id),
                name: entity.name,
                aliases: [],
            });
        }
    }

    for (const alias of aliases) {
        const entityName = Object.keys(domainManifest.entities).find(
            (name) => entityTypeForName(name) === String(alias.entity_type).toLowerCase()
        );
        const entityDef = entityName && domainManifest.entities[entityName];
        const key = entityDef && `${entityDef.route}:${String(alias.entity_id)}`;
        const target = key && targetsByKey.get(key);

        if (target && typeof alias.alias === 'string' && alias.alias.trim()) {
            target.aliases.push(alias.alias);
        }
    }

    return [...targetsByKey.values()];
}

router.get('/', async (req, res) => {
    try {
        const entities = {};
        for (const [entityName, entityDef] of Object.entries(domainManifest.entities)) {
            if (entityName !== 'Alias') {
                entities[entityName] = await manifestCrudService.getMany(entityName);
            }
        }

        const aliases = await manifestCrudService.getMany('Alias');
        res.json(buildMentionTargets(entities, aliases));
    } catch (error) {
        res.status(500).json({ error: error.message || 'Could not load mention targets.' });
    }
});

module.exports = router;
module.exports.buildMentionTargets = buildMentionTargets;
